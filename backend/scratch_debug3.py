import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os
import json

sys.path.append(os.getcwd())
from app.core.config import settings
from app.services.vibe_card import vibe_card_service

async def main():
    await vibe_card_service.init_indexes()
    
    # Hambo is 6a3224cb779c2cb3c7f7bf44
    # Kalu is 6a322629779c2cb3c7f7bf46
    hambo_id = "6a3224cb779c2cb3c7f7bf44"
    kalu_id = "6a322629779c2cb3c7f7bf46"
    
    print("--- Getting Match Results for Hambo (partner=Kalu) ---")
    res1 = await vibe_card_service.get_match_results(hambo_id, kalu_id, "UTC")
    print(json.dumps(res1, indent=2))
    
    print("\n--- Getting Match Results for Kalu (partner=Hambo) ---")
    res2 = await vibe_card_service.get_match_results(kalu_id, hambo_id, "UTC")
    print(json.dumps(res2, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
