import asyncio, os, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
from app.services.vibe_check import vibe_check_service

async def run():
    res = await vibe_check_service.get_profile('6a322629779c2cb3c7f7bf46')
    print(json.dumps(res, indent=2, default=str))

asyncio.run(run())
