from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models.user
import models.policy
import models.zone
import models.zone_score
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

router = APIRouter(
    prefix="/chat",
    tags=["Chatbot Assistant"]
)

class ChatRequest(BaseModel):
    user_id: int
    message: str

def get_gemini_reply(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "I am unable to process real-time AI requests right now because my API key is missing. Please ask your Admin to configure GEMINI_API_KEY."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        result = response.json()
        return result['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "Sorry, I am having trouble connecting to my AI brain at the moment."

@router.post("/")
def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    # 1. Fetch real user data from database
    user = db.query(models.user.User).filter(models.user.User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Fetch Active Policy
    policy = db.query(models.policy.Policy).filter(
        models.policy.Policy.user_id == user.id,
        models.policy.Policy.status == "active"
    ).first()
    plan_tier = policy.plan_type if policy else "None"

    # 3. Fetch Zone Score & Weather Risk
    zone_info = "Unknown"
    weather_risk = "Normal"
    if user.home_zone_id:
        zone = db.query(models.zone.Zone).filter(models.zone.Zone.id == user.home_zone_id).first()
        if zone:
            zone_info = zone.name
        latest_score = db.query(models.zone_score.ZoneScore).filter(models.zone_score.ZoneScore.zone_id == user.home_zone_id).order_by(models.zone_score.ZoneScore.timestamp.desc()).first()
        if latest_score:
            if latest_score.score > 80:
                weather_risk = "High Risk (Severe Disruption)"
            elif latest_score.score > 60:
                weather_risk = "Medium Risk"
            else:
                weather_risk = "Low Risk (Normal)"

    # 4. Construct System Prompt Injecting Real Database Context
    system_context = f"""
    You are 'Safar AI Copilot', an AI Assistant for Gig Workers (Swiggy/Zomato riders) using the SmartShift+ Insurance app.
    
    CRITICAL RIDER CONTEXT (REAL DATA):
    - Name: {user.name}
    - Platform: {user.platform}
    - Operating Zone: {zone_info}
    - Active Insurance Plan: {plan_tier} Plan
    - Current Zone Weather Risk: {weather_risk}
    
    Guidelines:
    - Keep answers VERY short, concise, and helpful (1-3 sentences).
    - If the user asks if they will get a payout, check their plan and zone risk. (Elite covers more than Standard. High risk means payout is likely if shift is active).
    - Be supportive and friendly. Always use the rider's name.
    - If they speak or ask in Hindi or Kannada, reply in that language.
    - DO NOT HALLUCINATE data. Base your answers strictly on the context above.

    User Message: "{request.message}"
    """

    ai_response = get_gemini_reply(system_context)

    return {"reply": ai_response}