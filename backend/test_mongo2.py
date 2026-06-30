import asyncio, os, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
async def run():
    db = AsyncIOMotorClient(os.getenv('MONGO_URL'))['loukarver']
    doc = await db['vibe_user_answers'].find_one({'user_id': 'user_C'})
    # I don't know the exact user_ids, let me find all answers for today
    docs = await db['vibe_user_answers'].find().to_list(length=10)
    print(docs)
asyncio.run(run())
