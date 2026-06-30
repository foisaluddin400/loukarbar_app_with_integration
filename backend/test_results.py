import asyncio, os, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
async def run():
    db = AsyncIOMotorClient(os.getenv('MONGO_URL'))['loukarver']
    # Find all users
    users = await db['vibe_user_answers'].find().to_list(length=10)
    print(users)
asyncio.run(run())
