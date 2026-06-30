import asyncio
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def run():
    db = AsyncIOMotorClient(os.getenv("MONGO_URL"))["loukarver"]
    profiles = await db["vibe_check_profiles"].find().to_list(None)
    conns = await db["vibe_check_connections"].find().to_list(None)
    for p in profiles:
        print("PROFILE:", p["user_id"], p["name"])
    for c in conns:
        print("CONN:", c["user_id"], "->", c["partner_id"])

asyncio.run(run())
