import zoneinfo
from typing import Dict, Any, List, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone

from app.core.config import settings
from app.schemas.notification import (
    NotificationCreate, NotificationStatus, NotificationType
)

class NotificationService:
    def __init__(self) -> None:
        self.client = AsyncIOMotorClient(settings.MONGO_URL)
        self.db = self.client[settings.MONGO_DB_NAME]
        self.notifications_collection = self.db["notifications"]
        self.users = self.db["users"]

    async def init_indexes(self):
        await self.notifications_collection.create_index([("recipient_id", 1), ("status", 1)])
        await self.notifications_collection.create_index("scheduled_for")

    async def schedule_notification(self, sender_id: str, payload: NotificationCreate) -> Dict[str, Any]:
        new_doc = payload.model_dump()
        new_doc["sender_id"] = sender_id
        new_doc["status"] = NotificationStatus.SCHEDULED
        new_doc["created_at"] = datetime.now(timezone.utc)
        
        result = await self.notifications_collection.insert_one(new_doc)
        new_doc["id"] = str(result.inserted_id)
        return await self._map_notification(new_doc, payload.timezone)

    async def get_my_notifications(self, user_id: str, page: int = 1, size: int = 20, user_timezone: str = "UTC") -> Tuple[List[Dict[str, Any]], int]:
        query = {"recipient_id": user_id}
        
        # Auto-mark delivered if scheduled time has passed
        now = datetime.now(timezone.utc)
        await self.notifications_collection.update_many(
            {"recipient_id": user_id, "status": NotificationStatus.SCHEDULED, "scheduled_for": {"$lte": now}},
            {"$set": {"status": NotificationStatus.DELIVERED, "delivered_at": now}}
        )

        skip = (page - 1) * size
        cursor = self.notifications_collection.find(query).sort("scheduled_for", -1).skip(skip).limit(size)
        docs = await cursor.to_list(length=None)
        total = await self.notifications_collection.count_documents(query)

        return [await self._map_notification(d, user_timezone) for d in docs], total

    async def mark_as_seen(self, notification_id: str, user_id: str) -> bool:
        result = await self.notifications_collection.update_one(
            {"_id": ObjectId(notification_id), "recipient_id": user_id},
            {"$set": {"status": NotificationStatus.SEEN}}
        )
        return result.modified_count > 0

    async def _map_notification(self, d: Dict[str, Any], user_timezone: str) -> Dict[str, Any]:
        d["id"] = str(d["_id"])
        if "_id" in d: del d["_id"]

        try:
            tz = zoneinfo.ZoneInfo(user_timezone)
        except Exception:
            tz = zoneinfo.ZoneInfo("UTC")

        for field in ["scheduled_for", "created_at", "delivered_at"]:
            dt = d.get(field)
            if isinstance(dt, datetime):
                if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
                d[field] = dt.astimezone(tz)

        return d

    async def log_presence(self, user_id: str, payload: "PresenceCreate") -> Dict[str, Any]:
        from bson import ObjectId
        from app.schemas.notification import NotificationType, NotificationStatus
        
        now_utc = datetime.now(timezone.utc)
        
        # 1. Update user's last active and location
        update_data = {"last_active_at": now_utc}
        if payload.city: update_data["location_city"] = payload.city
        if payload.latitude: update_data["location_lat"] = payload.latitude
        if payload.longitude: update_data["location_lon"] = payload.longitude
        
        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # 2. Get user to find partner
        user = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user or not user.get("is_aligned"):
            return {"success": True, "message": "Presence logged. No partner aligned."}
            
        partner_id = user.get("partner", {}).get("user_id")
        if not partner_id:
            return {"success": True, "message": "Presence logged. Partner ID missing."}
            
        # 3. Calculate local hour
        try:
            tz = zoneinfo.ZoneInfo(payload.timezone)
        except Exception:
            tz = zoneinfo.ZoneInfo("UTC")
            
        local_time = now_utc.astimezone(tz)
        h = local_time.hour
        
        if h < 5: phrase = 'still awake'
        elif h < 12: phrase = 'just waking up'
        elif h < 17: phrase = 'in the middle of their day'
        elif h < 21: phrase = 'winding down'
        else: phrase = 'probably asleep'
        
        # 4. Check if we already sent this exact phrase today
        start_of_day = local_time.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
        
        existing = await self.notifications_collection.find_one({
            "sender_id": user_id,
            "recipient_id": partner_id,
            "type": NotificationType.PRESENCE.value,
            "message": phrase,
            "created_at": {"$gte": start_of_day}
        })
        
        if not existing:
            new_doc = {
                "title": "Presence",
                "message": phrase,
                "type": NotificationType.PRESENCE.value,
                "timezone": payload.timezone,
                "scheduled_for": now_utc,
                "sender_id": user_id,
                "recipient_id": partner_id,
                "status": NotificationStatus.DELIVERED.value, # Delivered immediately
                "created_at": now_utc,
                "delivered_at": now_utc
            }
            await self.notifications_collection.insert_one(new_doc)
            return {"success": True, "message": f"Presence logged and notification '{phrase}' sent to partner."}
            
        return {"success": True, "message": "Presence logged. Notification skipped (already sent today)."}

notification_service = NotificationService()
