import asyncio
import os
import json
import httpx
from dotenv import load_dotenv
load_dotenv()
from app.services.auth import create_access_token

async def run():
    hambo_token = create_access_token({"user_id": "6a3224cb779c2cb3c7f7bf44", "type": "access"})
    fatema_token = create_access_token({"user_id": "6a322585779c2cb3c7f7bf45", "type": "access"})
    
    async with httpx.AsyncClient(base_url="http://localhost:8006", timeout=60.0) as client:
        # Hambo checks results with partner=Fatema
        print("=== Hambo checking results with Fatema ===")
        res = await client.get(
            "/vibecheck/cards/results",
            params={"partner_id": "6a322585779c2cb3c7f7bf45", "timezone": "UTC"},
            headers={"Authorization": f"Bearer {hambo_token}"}
        )
        print(f"Status: {res.status_code}")
        body = res.json()
        print(json.dumps(body, indent=2))
        
        # Check daily cards to compare IDs
        print("\n=== Hambo's daily cards ===")
        res3 = await client.get(
            "/vibecheck/cards/daily",
            params={"timezone": "UTC"},
            headers={"Authorization": f"Bearer {hambo_token}"}
        )
        daily = res3.json()
        for q in daily.get("questions", [])[:3]:
            print(f"  card.id: {q['id']}  text: {q.get('text', '')[:50]}")
        
        # Compare IDs
        if body.get("data"):
            print("\n=== ID comparison ===")
            result_ids = set()
            for d in body["data"]:
                for ma in d.get("matched_answers", []):
                    result_ids.add(ma["question_id"])
                    print(f"  result question_id: {ma['question_id']}")
            
            daily_ids = set(q["id"] for q in daily.get("questions", []))
            print(f"  Daily IDs: {daily_ids}")
            print(f"  Result IDs: {result_ids}")
            print(f"  Intersection: {daily_ids & result_ids}")

asyncio.run(run())
