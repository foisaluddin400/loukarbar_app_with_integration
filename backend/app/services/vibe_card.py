import os
import zoneinfo
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta

from app.core.config import settings
from app.schemas.vibe_card import VibeAnswerSubmit, VibeQuestion

class VibeCardService:
    def __init__(self) -> None:
        self.client = AsyncIOMotorClient(settings.MONGO_URL)
        self.db = self.client[settings.MONGO_DB_NAME]
        self.vibe_90day_cards = self.db["vibe_90day_cards"]
        self.user_answers = self.db["vibe_user_answers"]
        self.cumulative_scores = self.db["vibe_cumulative_scores"]
        self.vibe_profiles = self.db["vibe_check_profiles"]
        self.vibe_connections = self.db["vibe_check_connections"]
        self.user_streaks = self.db["vibe_user_streaks"]

    async def init_indexes(self):
        await self.user_answers.create_index([("user_id", 1), ("partner_id", 1), ("journey_day", 1)], unique=True)
        await self.cumulative_scores.create_index([("user_id", 1), ("partner_id", 1)], unique=True)
        await self.user_streaks.create_index("user_id", unique=True)

    async def get_daily_questions(self, user_id: str, partner_id: str) -> List[Dict[str, Any]]:
        """Get the 3 questions for the current journey day of this connection."""
        conn = await self.vibe_connections.find_one({"user_id": user_id, "partner_id": partner_id})
        if not conn or conn.get("status") != "active":
            return []
            
        current_day = conn.get("current_journey_day", 1)
        
        cursor = self.vibe_90day_cards.find({"day": current_day}).sort("slot", 1)
        cards = await cursor.to_list(length=None)
        
        return [
            {
                "id": c["card_id"],
                "text": f"Day {c['day']} - {c['category']}",
                "option_a": c["option_a"],
                "option_b": c["option_b"],
                "category": c["category"],
                "is_anchor": c.get("is_anchor", False)
            } for c in cards
        ]

    async def submit_answers(self, user_id: str, payload: VibeAnswerSubmit) -> Dict[str, Any]:
        """Submit answers for the specific partner's journey."""
        partner_id = getattr(payload, "partner_id", None)
        if not partner_id:
            raise ValueError("partner_id is now required to submit answers.")
            
        conn = await self.vibe_connections.find_one({"user_id": user_id, "partner_id": partner_id})
        if not conn or conn.get("status") != "active":
            raise ValueError("Active connection not found.")
            
        current_day = conn.get("current_journey_day", 1)
        now = datetime.now(timezone.utc)
        
        new_answers = [a.model_dump() for a in payload.answers]
        
        # Save answers for this journey day
        await self.user_answers.update_one(
            {"user_id": user_id, "partner_id": partner_id, "journey_day": current_day},
            {
                "$setOnInsert": {"created_at": now},
                "$set": {"answers": new_answers} # Replace entirely for simplicity
            },
            upsert=True
        )
        
        # Handle Anchor Logic
        cards = await self.get_daily_questions(user_id, partner_id)
        has_anchor = any(c["is_anchor"] for c in cards)
        
        if has_anchor:
            # Check if partner has answered
            pa_ans = await self.user_answers.find_one({
                "user_id": partner_id, 
                "partner_id": user_id, 
                "journey_day": current_day
            })
            
            if not pa_ans:
                # Partner hasn't answered, so we stall
                await self.vibe_connections.update_many(
                    {"$or": [
                        {"user_id": user_id, "partner_id": partner_id},
                        {"user_id": partner_id, "partner_id": user_id}
                    ]},
                    {"$set": {
                        "stalled_since": now,
                        "silent_partner_id": partner_id
                    }}
                )
            else:
                # Both answered, un-stall
                await self.vibe_connections.update_many(
                    {"$or": [
                        {"user_id": user_id, "partner_id": partner_id},
                        {"user_id": partner_id, "partner_id": user_id}
                    ]},
                    {"$set": {
                        "stalled_since": None,
                        "silent_partner_id": None
                    }}
                )
        
        return {"success": True, "message": "Answers submitted!"}

    async def get_match_results(self, user_id: str, partner_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not partner_id:
            return []
            
        user_profile = await self.vibe_profiles.find_one({"user_id": user_id})
        partner_profile = await self.vibe_profiles.find_one({"user_id": partner_id})
        
        conn = await self.vibe_connections.find_one({"user_id": user_id, "partner_id": partner_id})
        if not conn: return []
        
        current_day = conn.get("current_journey_day", 1)
        
        my_ans = await self.user_answers.find_one({"user_id": user_id, "partner_id": partner_id, "journey_day": current_day})
        pa_ans = await self.user_answers.find_one({"user_id": partner_id, "partner_id": user_id, "journey_day": current_day})
        
        if not my_ans: return []
        
        questions = await self.get_daily_questions(user_id, partner_id)
        q_map = {q["id"]: q for q in questions}
        
        my_map = {a["question_id"]: a["selected_option"] for a in my_ans.get("answers", [])}
        pa_map = {a["question_id"]: a["selected_option"] for a in pa_ans.get("answers", [])} if pa_ans else {}
        
        matches = 0
        total_q = len(questions)
        matched_details = []
        
        for qid, q in q_map.items():
            my_choice = my_map.get(qid)
            pa_choice = pa_map.get(qid)
            
            # If I haven't answered, skip it
            if not my_choice: continue
            
            is_match = (my_choice == pa_choice) if pa_choice else False
            if is_match: matches += 1
            
            matched_details.append({
                "question_id": qid,
                "question": q["text"],
                "option_a": q["option_a"],
                "option_b": q["option_b"],
                "my_selected_option": my_choice,
                "partner_selected_option": pa_choice,
                "my_answer": q["option_a"] if my_choice == "A" else q["option_b"],
                "partner_answer": (q["option_a"] if pa_choice == "A" else q["option_b"]) if pa_choice else None,
                "is_match": is_match
            })
            
        daily_match_percent = (matches / total_q * 100) if total_q > 0 else 0.0
        both_finished = (len(my_map) >= total_q and len(pa_map) >= total_q)
        
        return [{
            "user_name": user_profile["name"],
            "partner_name": partner_profile["name"],
            "daily_match_percent": round(daily_match_percent, 1),
            "cumulative_match_percent": 0.0, # Removed cumulative logic for simplicity right now
            "matched_answers": matched_details,
            "both_finished": both_finished
        }]

    async def get_streak(self, user_id: str) -> Dict[str, Any]:
        # Legacy stub to avoid breaking frontend immediately
        return {"current_streak": 0, "last_answered": None, "cards_answered_today": 0}

    async def get_history(self, user_id: str, partner_id: Optional[str] = None, category: str = "All", page: int = 1, size: int = 20) -> Tuple[List[Dict[str, Any]], int]:
        # Legacy stub
        return [], 0

    async def get_pulse_analytics(self, user_id: str, partner_id: Optional[str] = None) -> List[Dict[str, Any]]:
        # Legacy stub
        return []

vibe_card_service = VibeCardService()
