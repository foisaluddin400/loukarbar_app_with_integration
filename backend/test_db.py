import asyncio, os, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()

async def run():
    db = AsyncIOMotorClient(os.getenv('MONGO_URL'))['loukarver']
    ans = await db['vibe_user_answers'].find().to_list(None)
    print(ans)

asyncio.run(run())
