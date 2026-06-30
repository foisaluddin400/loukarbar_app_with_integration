import asyncio, os, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
from app.services.vibe_check import vibe_check_service

async def run():
    # Hambo's profile
    res = await vibe_check_service.get_profile('6a3224cb779c2cb3c7f7bf44')
    print('HAMBO profile:')
    print('active_users:', json.dumps(res.get('active_users', []), indent=2))
    print('inactive_users:', json.dumps(res.get('inactive_users', []), indent=2))
    print()
    # Kalu's profile
    res2 = await vibe_check_service.get_profile('6a322629779c2cb3c7f7bf46')
    print('KALU profile:')
    print('active_users:', json.dumps(res2.get('active_users', []), indent=2))
    print('inactive_users:', json.dumps(res2.get('inactive_users', []), indent=2))

asyncio.run(run())
