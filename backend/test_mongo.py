import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
async def run():
    db = AsyncIOMotorClient(os.getenv('MONGO_URL'))['loukarver']
    doc = await db['vibe_cards_daily'].find_one()
    print(doc['questions'][0] if doc else 'No questions')
    ans = await db['vibe_user_answers'].find_one()
    print(ans['answers'] if ans else 'No answers')
asyncio.run(run())
