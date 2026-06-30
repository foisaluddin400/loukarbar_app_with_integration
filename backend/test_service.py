import asyncio, os, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
from app.services.vibe_card import vibe_card_service

async def run():
    res = await vibe_card_service.get_match_results('6a3224cb779c2cb3c7f7bf44', '6a322629779c2cb3c7f7bf46', 'UTC')
    print(json.dumps(res, indent=2))

asyncio.run(run())
