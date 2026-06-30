import asyncio, os, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
from app.schemas.vibe_card import VibeAnswerSubmit, VibeAnswer
from app.services.vibe_card import vibe_card_service

async def run():
    try:
        payload = VibeAnswerSubmit(answers=[VibeAnswer(question_id='d2072a40-09da-4830-afe1-6b5e058a56be', selected_option='A')])
        res = await vibe_card_service.submit_answers('6a3224cb779c2cb3c7f7bf44', payload)
        print(json.dumps(res, indent=2))
    except Exception as e:
        print('ERROR:', e)

asyncio.run(run())
