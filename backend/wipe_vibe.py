import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def wipe_vibe_check():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "loukarver")
    
    print(f"Connecting to: {mongo_url} (DB: {db_name})")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    collections_to_drop = [
        "vibe_check_profiles",
        "vibe_check_connections",
        "vibe_check_requests",
        "vibe_check_invites",
        "vibe_cards_daily",
        "vibe_cards_history",
        "vibe_user_answers",
        "vibe_user_streaks"
    ]
    
    for coll in collections_to_drop:
        await db[coll].drop()
        print(f"Dropped {coll}")
        
    print("All Vibe Check data wiped!")

if __name__ == "__main__":
    asyncio.run(wipe_vibe_check())
