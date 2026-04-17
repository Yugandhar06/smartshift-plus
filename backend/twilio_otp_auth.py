import os
import logging
import secrets
import time
from typing import Dict, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, constr, Field
from datetime import datetime

# ==========================================
# 1. CONFIGURATION & LOGGING SETUP
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("OTPAuthenticationEngine")

class TwilioSettings:
    """Environment variable configurations for Twilio integration."""
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "AC_mock_account_sid_for_demo")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "mock_auth_token_for_demo")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "+18005550199")
    OTP_EXPIRY_SECONDS: int = int(os.getenv("OTP_EXPIRY_SECONDS", 300))  # 5 minutes
    MAX_RETRY_ATTEMPTS: int = int(os.getenv("MAX_RETRY_ATTEMPTS", 3))    # Brute-force protection

settings = TwilioSettings()

# ==========================================
# 2. MODELS & DTOs (Pydantic)
# ==========================================
class SendOTPRequest(BaseModel):
    phone_number: str = Field(..., description="E.164 formatted phone number", pattern=r"^\+[1-9]\d{1,14}$")

class VerifyOTPRequest(BaseModel):
    phone_number: str = Field(..., description="E.164 formatted phone number", pattern=r"^\+[1-9]\d{1,14}$")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit secure OTP code")

class OTPResponse(BaseModel):
    success: bool
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ==========================================
# 3. UTILITIES & SECURITY
# ==========================================
def mask_phone_number(phone: str) -> str:
    """Masks phone number for secure logging (e.g., +19876543210 -> *******3210)."""
    if len(phone) < 4:
        return "****"
    return "*" * (len(phone) - 4) + phone[-4:]

def generate_secure_otp() -> str:
    """Generates a cryptographically secure 6-digit OTP."""
    # Using secrets instead of random for cryptographic security
    return str(secrets.randbelow(900000) + 100000)

# ==========================================
# 4. CUSTOM EXCEPTIONS
# ==========================================
class OTPExpiredException(Exception): pass
class OTPInvalidException(Exception): pass
class MaxRetriesExceededException(Exception): pass
class TwilioGatewayException(Exception): pass

# ==========================================
# 5. MOCK REDIS STORE (In-Memory State)
# ==========================================
class MockRedisCache:
    """
    Simulates a Redis Key-Value store with TTL and retry tracking capability.
    In production, this would be replaced by aioredis or redis-py.
    """
    def __init__(self):
        # Format: { phone_number: {"otp": str, "expires_at": float, "attempts": int} }
        self._store: Dict[str, Dict[str, Any]] = {}

    def set_otp(self, phone: str, otp: str, ttl: int):
        self._store[phone] = {
            "otp": otp,
            "expires_at": time.time() + ttl,
            "attempts": 0
        }

    def get_otp_data(self, phone: str) -> Optional[Dict[str, Any]]:
        data = self._store.get(phone)
        if not data:
            return None
        if time.time() > data["expires_at"]:
            del self._store[phone]
            return None
        return data

    def increment_attempt(self, phone: str):
        if phone in self._store:
            self._store[phone]["attempts"] += 1

    def delete_otp(self, phone: str):
        if phone in self._store:
            del self._store[phone]

# Global instance for simulation purposes
redis_cache = MockRedisCache()

# ==========================================
# 6. TWILIO GATEWAY INTEGRATION
# ==========================================
class TwilioGateway:
    """Handles communication with the Twilio SMS API."""
    
    def dispatch_sms(self, to_phone: str, body: str) -> bool:
        """
        Structures the Twilio request. 
        Note: Mocked for demonstration.
        """
        masked_phone = mask_phone_number(to_phone)
        logger.info(f"Initiating Twilio API request to terminate SMS to {masked_phone}")
        
        try:
            # 1. Real Twilio Payload Structure Structure
            payload = {
                "body": body,
                "from_": settings.TWILIO_PHONE_NUMBER,
                "to": to_phone
            }
            
            # 2. Simulate HTTP interaction using twilio-python client logic
            # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            # message = client.messages.create(**payload)
            # if message.error_code: raise TwilioGatewayException(message.error_message)
            
            logger.info(f"Twilio API Emulated Response: 201 Created. SMS successfully queued for {masked_phone}")
            return True
            
        except Exception as e:
            logger.error(f"Twilio Gateway Exception: {str(e)}")
            raise TwilioGatewayException("Failed to dispatch SMS via Twilio.")

# ==========================================
# 7. OTP SERVICE (BUSINESS LOGIC)
# ==========================================
class OTPService:
    def __init__(self):
        self.gateway = TwilioGateway()
        self.cache = redis_cache  # Dependency Injection in real environment

    def send_otp(self, phone_number: str) -> None:
        """Generates, safely stores, and dispatches the OTP."""
        masked_phone = mask_phone_number(phone_number)
        logger.info(f"Starting OTP generation sequence for {masked_phone}")

        # 1. Generate Secure Code
        otp_code = generate_secure_otp()
        
        # 2. Store in Redis with TTL
        self.cache.set_otp(phone_number, otp_code, settings.OTP_EXPIRY_SECONDS)
        logger.debug(f"OTP successfully cached with {settings.OTP_EXPIRY_SECONDS}s TTL constraint.")
        
        # 3. Construct message & Send via Gateway
        sms_body = f"Your SmartShift+ verification code is {otp_code}. It will expire in 5 minutes. Do not share this code."
        self.gateway.dispatch_sms(phone_number, sms_body)

    def verify_otp(self, phone_number: str, submitted_otp: str) -> bool:
        """Validates OTP against cached data, handling retries and expiry."""
        masked_phone = mask_phone_number(phone_number)
        logger.info(f"Verifying OTP submission for {masked_phone}")
        
        data = self.cache.get_otp_data(phone_number)
        
        # Check: Does it exist / is it expired?
        if not data:
            logger.warning(f"OTP verification failed for {masked_phone}: Expired or not found.")
            raise OTPExpiredException("The OTP has expired or was never requested.")
            
        # Check: Brute-force protection
        if data["attempts"] >= settings.MAX_RETRY_ATTEMPTS:
            self.cache.delete_otp(phone_number)
            logger.error(f"Security Alert: Max retries exceeded for {masked_phone}. OTP invalidated.")
            raise MaxRetriesExceededException("Maximum verification attempts exceeded. Please request a new OTP.")

        # Increment attempts mapping
        self.cache.increment_attempt(phone_number)

        # Check: Validity
        # Uses constant time comparison to prevent timing attacks
        if not secrets.compare_digest(data["otp"], submitted_otp):
            logger.warning(f"OTP verification failed for {masked_phone}: Invalid code.")
            raise OTPInvalidException("The provided OTP is incorrect.")

        # Success: Clear OTP from cache to prevent replay attacks
        self.cache.delete_otp(phone_number)
        logger.info(f"✅ OTP successfully verified for {masked_phone}")
        return True

# ==========================================
# 8. ROUTE CONTROLLER (FastAPI)
# ==========================================
router = APIRouter(prefix="/api/v1/auth", tags=["OTP Authentication"])

@router.post("/send-otp", response_model=OTPResponse, status_code=status.HTTP_200_OK)
async def request_otp(payload: SendOTPRequest):
    """
    Endpoint to request a new OTP SMS via Twilio.
    """
    service = OTPService()
    try:
        service.send_otp(payload.phone_number)
        return OTPResponse(success=True, message=f"OTP sent successfully to {mask_phone_number(payload.phone_number)}")
    except TwilioGatewayException as te:
        logger.error(f"Failed to send OTP: {str(te)}")
        raise HTTPException(status_code=502, detail="SMS Gateway provider is currently unavailable.")
    except Exception as e:
        logger.critical(f"Unhandled exception during send_otp: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/verify-otp", response_model=OTPResponse, status_code=status.HTTP_200_OK)
async def validate_otp(payload: VerifyOTPRequest):
    """
    Endpoint to verify a submitted OTP against the active session.
    """
    service = OTPService()
    try:
        service.verify_otp(payload.phone_number, payload.otp_code)
        return OTPResponse(success=True, message="Authentication successful.")
    
    except OTPExpiredException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except OTPInvalidException as e:
        raise HTTPException(status_code=401, detail=str(e))
    except MaxRetriesExceededException as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.critical(f"Unhandled exception during verify_otp: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")