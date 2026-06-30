import asyncio
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
from app.services.vibe_card import vibe_card_service

async def run():
    # Check Hambo -> Fatema results
    print("=== Hambo -> Fatema ===")
    res1 = await vibe_card_service.get_match_results('6a3224cb779c2cb3c7f7bf44', '6a322585779c2cb3c7f7bf45', 'UTC')
    print(json.dumps(res1, indent=2))
    
    # Check Fatema -> Hambo results
    print("\n=== Fatema -> Hambo ===")
    res2 = await vibe_card_service.get_match_results('6a322585779c2cb3c7f7bf45', '6a3224cb779c2cb3c7f7bf44', 'UTC')
    print(json.dumps(res2, indent=2))
    
    # Check Kalu -> Hambo results
    print("\n=== Kalu -> Hambo ===")
    res3 = await vibe_card_service.get_match_results('6a322629779c2cb3c7f7bf46', '6a3224cb779c2cb3c7f7bf44', 'UTC')
    print(json.dumps(res3, indent=2))
    
    # Check daily questions
    print("\n=== Daily Questions ===")
    qs = await vibe_card_service.get_daily_questions('6a3224cb779c2cb3c7f7bf44', 'UTC')
    for q in qs[:3]:
        print(f"  id={q['id']}  text={q.get('text', q.get('question', ''))}")
    
    # Check answers in DB
    db = AsyncIOMotorClient(os.getenv("MONGO_URL"))["loukarver"]
    answers = await db["vibe_user_answers"].find().to_list(None)
    print("\n=== All Answers ===")
    for a in answers:
        print(f"  user={a['user_id']} date={a['date']} answers={[x['question_id'] for x in a['answers']]}")

asyncio.run(run())
