import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
async def run():
    db = AsyncIOMotorClient(os.getenv('MONGO_URL'))['loukarver']
    conns = await db['vibe_check_connections'].find().to_list(None)
    for c in conns:
        print(f'{c["user_id"]} -> {c["partner_id"]}')
asyncio.run(run())
