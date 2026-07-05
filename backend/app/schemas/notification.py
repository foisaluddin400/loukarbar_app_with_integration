from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    TRIP_REMINDER = "Trip Reminder"
    ANNIVERSARY = "Anniversary"
    MILESTONE = "Milestone"
    SYSTEM = "System"
    MAP_UPDATE = "Map Update"
    VIBE_DATE = "Vibe Date"
    PRESENCE = "Presence"
    PARTNER_CHECKIN = "Partner Check-in"
    RITUAL_COMPLETED = "Ritual Completed"
    RED_FLAG = "Red Flag"

class NotificationStatus(str, Enum):
    SCHEDULED = "Scheduled"
    DELIVERED = "Delivered"
    SEEN = "Seen"
    FAILED = "Failed"

from typing import List, Optional, Dict, Any

class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType
    scheduled_for: Optional[datetime] = None
    timezone: str = "UTC"
    metadata: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    recipient_id: str # Can be self or partner

class NotificationResponse(NotificationBase):
    id: str
    sender_id: str
    recipient_id: str
    status: NotificationStatus
    created_at: datetime
    delivered_at: Optional[datetime] = None

class NotificationPaginatedResponse(BaseModel):
    success: bool
    data: List[NotificationResponse]
    total: int
    page: int
    size: int

class GenericResponse(BaseModel):
    success: bool
    message: str

class PresenceCreate(BaseModel):
    timezone: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
