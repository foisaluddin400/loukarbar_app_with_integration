import asyncio, httpx
async def run():
    async with httpx.AsyncClient(base_url='http://localhost:8006') as client:
        # 1. Login user A
        res_a = await client.post('/auth/login', json={'email': 'kalu@a.com', 'password': 'password123'})
        token_a = res_a.json()['access_token']
        # 2. Login user B
        res_b = await client.post('/auth/login', json={'email': 'fatema@a.com', 'password': 'password123'})
        token_b = res_b.json()['access_token']
        print('Tokens acquired')
asyncio.run(run())
