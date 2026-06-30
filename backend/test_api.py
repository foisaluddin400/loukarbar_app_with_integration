import asyncio, httpx
async def run():
    async with httpx.AsyncClient() as client:
        # I can't get the JWT easily here. Let me just test get_match_results directly via python
        pass
asyncio.run(run())
