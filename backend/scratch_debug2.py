import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os
import json

sys.path.append(os.getcwd())
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB_NAME]
    
    from datetime import datetime, timezone
    import zoneinfo
    tz = zoneinfo.ZoneInfo("UTC")
    today_str = datetime.now(tz).strftime("%m.%d.%Y")
    
    pool = await db["vibe_daily_pool"].find_one({"date": today_str})
    if pool:
        for q in pool["questions"]:
            print(f"Q: {q['id']} - {q['text']}")
            
if __name__ == "__main__":
    asyncio.run(main())
