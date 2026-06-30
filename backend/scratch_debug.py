import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

sys.path.append(os.getcwd())
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB_NAME]
    
    print("--- Profiles ---")
    async for p in db["vibe_check_profiles"].find({}):
        print(f"{p['name']}: {p['user_id']}")

    print("\n--- Connections ---")
    async for c in db["vibe_check_connections"].find({}):
        print(f"{c['user_id']} -> {c['partner_id']}")
        
    print("\n--- User Answers Today ---")
    from datetime import datetime, timezone
    import zoneinfo
    tz = zoneinfo.ZoneInfo("UTC")
    today_str = datetime.now(tz).strftime("%m.%d.%Y")
    
    async for a in db["vibe_user_answers"].find({"date": today_str}):
        print(f"User: {a['user_id']}")
        for ans in a['answers']:
            print(f"  {ans['question_id']}: {ans['selected_option']}")
            
if __name__ == "__main__":
    asyncio.run(main())
