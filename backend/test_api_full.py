import asyncio, os, json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Need to mock the get_current_user dependency to return Hambo's ID
from app.routers.auth import get_current_user

app.dependency_overrides[get_current_user] = lambda: {'id': '6a3224cb779c2cb3c7f7bf44', 'email': 'hambo@test.com'}

res = client.get('/vibecheck/cards/results?partner_id=6a322585779c2cb3c7f7bf45')
print(json.dumps(res.json(), indent=2))

