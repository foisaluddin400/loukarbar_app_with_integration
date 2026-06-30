import asyncio
import httpx
import json
from dotenv import load_dotenv
import os

load_dotenv()

async def test_llm():
    url = "http://10.10.28.191:1234/v1/chat/completions"
    prompt = (
        "Generate 2 engaging 'This or That' questions for a social app. "
        "Format the output as a JSON list of objects, each with 'text', 'option_a', 'option_b', and 'category'. "
        "Categories should be things like 'Travel', 'Communication', 'Lifestyle', 'Emotional', 'Social', 'Values', etc. "
        "Questions should be fun, lighthearted, and occasionally deep (e.g. 'Beach or Mountain', 'Plan everything or Wing it')."
    )
    payload = {
        "model": "llama-3.2-3b-instruct",
        "messages": [
            {"role": "system", "content": "You are a creative assistant."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }
    
    print(f"Calling {url}...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            if response.status_code == 200:
                data = response.json()
                raw_text = data["choices"][0]["message"]["content"].strip()
                print("RAW RESPONSE:")
                print(raw_text)
                print("-" * 50)
                
                # Robust parsing for JSON
                if "```json" in raw_text:
                    raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_text:
                    raw_text = raw_text.split("```")[1].split("```")[0].strip()
                    
                questions = json.loads(raw_text)
                print("PARSED JSON:")
                print(json.dumps(questions, indent=2))
            else:
                print(f"LLM API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error: {repr(e)}")

if __name__ == "__main__":
    asyncio.run(test_llm())
