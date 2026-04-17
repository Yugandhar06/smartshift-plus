import os
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from datetime import datetime

# ==========================================
# 1. CONFIGURATION & LOGGING SETUP
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("PayoutEngine")

class Settings:
    """Environment variable configurations for external integrations."""
    RAZORPAY_KEY: str = os.getenv("RAZORPAY_KEY", "rzp_test_mock_key")
    RAZORPAY_SECRET: str = os.getenv("RAZORPAY_SECRET", "rzp_test_mock_secret")
    RAZORPAY_ACCOUNT_NUM: str = os.getenv("RAZORPAY_X_ACCOUNT_NUMBER", "7878780080316316")
    ENVIRONMENT: str = os.getenv("ENV", "production")

settings = Settings()

# ==========================================
# 2. MODELS & DTOs (Pydantic)
# ==========================================
class WorkerState(BaseModel):
    worker_id: str
    safar_score: float = Field(..., ge=0, le=100, description="Worker's reliability score")
    is_shift_active: bool
    is_weekly_plan_active: bool
    orders_completed: int
    peb: float = Field(..., description="Protected Earnings Baseline (Expected pay)")
    actual_earnings: float
    coverage_ratio: float = Field(default=1.0, description="Insurance coverage tier (0.0 to 1.0)")

class SignalValidationResult(BaseModel):
    is_valid: bool
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    reasoning: str
    failed_signals: List[str]

class PayoutResponse(BaseModel):
    transaction_id: str
    worker_id: str
    amount_disbursed: float
    status: str
    timestamp: datetime
    message: str

# ==========================================
# 3. CUSTOM EXCEPTIONS
# ==========================================
class PayoutValidationException(Exception):
    """Raised when worker fails eligibility criteria for payout."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class RazorpayIntegrationException(Exception):
    """Raised when the payment gateway fails."""
    pass

# ==========================================
# 4. SIGNAL VALIDATION SERVICE
# ==========================================
class SignalValidationService:
    """
    Advanced 3-Signal Validation System implementation.
    Rule: Minimum 2 of 3 must pass, but Signal 1 is compulsory.
    """
    
    async def evaluate_signals(self, worker_id: str, zone_id: str) -> SignalValidationResult:
        logger.info(f"Validating 3-Signal conditions for worker {worker_id} in {zone_id}")
        
        # Signal 1: External Event (Weather/AQI API) -> Mandatory
        signal_1_passed = self._check_external_event_severity(zone_id)
        
        # Signal 2: Worker Presence (GPS / TrustMesh simulation)
        signal_2_passed = self._verify_worker_presence(worker_id, zone_id)
        
        # Signal 3: Zone Demand Drop (>40% drop, mock or simulated)
        signal_3_passed = self._check_demand_anomaly(zone_id)
        
        failed_signals = []
        if not signal_1_passed: failed_signals.append("Signal 1: External Event Validation")
        if not signal_2_passed: failed_signals.append("Signal 2: GPS/TrustMesh Presence")
        if not signal_3_passed: failed_signals.append("Signal 3: Zone Demand Drop")

        # Core Logic: Signal 1 is compulsory, and at least one other must pass (2/3 total)
        is_valid = signal_1_passed and (signal_2_passed or signal_3_passed)
        
        # Calculate algorithmic confidence based on signals passed
        confidence = 0.0
        if is_valid:
            # 95% confidence if all 3 passed, 80% if only 2 passed
            confidence = 0.95 if (signal_2_passed and signal_3_passed) else 0.80
            
        return SignalValidationResult(
            is_valid=is_valid,
            confidence_score=confidence,
            reasoning="Passed mandatory environmental signal and at least one supporting signal." if is_valid else "Failed critical signal checks.",
            failed_signals=failed_signals
        )

    def _check_external_event_severity(self, zone_id: str) -> bool:
        # MOCK: Connect to Weather/AQI API
        # e.g., return weather_api.get_precipitation(zone_id) > 50.0 
        logger.info("Signal 1 (Mandatory): Verified extreme weather condition via API.")
        return True

    def _verify_worker_presence(self, worker_id: str, zone_id: str) -> bool:
        # MOCK: TrustMesh / GPS Ping validation
        logger.info("Signal 2: Verified worker GPS correlates with disruption zone.")
        return True

    def _check_demand_anomaly(self, zone_id: str) -> bool:
        # MOCK: Verify if demand dropped by > 40%
        # Includes fallback logic (NLP parsing of local news) if hyper-local data is missing
        logger.info("Signal 3: Demand dropped by 45% compared to historical SMA (Simple Moving Average).")
        return False  # Failing this specific signal to demonstrate the 2/3 logic works!

# ==========================================
# 5. RAZORPAY GATEWAY INTEGRATION
# ==========================================
class RazorpayGateway:
    """Mock integration representing actual Razorpay Payouts SDK implementation."""
    
    def process_payout(self, worker_id: str, amount: float, upi_id: str = "success@razorpay") -> Dict[str, Any]:
        """
        Simulates the Razorpay transfer request.
        Requires valid RAZORPAY_KEY and RAZORPAY_SECRET in env to authorize against API.
        """
        logger.info(f"Initiating Razorpay API request for Worker={worker_id}, Payload amount={amount} INR")
        
        try:
            # 1. Structure the actual Payload required by Razorpay
            payload = {
                "account_number": settings.RAZORPAY_ACCOUNT_NUM,
                "fund_account_id": f"fa_{worker_id}", # Typically fetched from DB
                "amount": int(amount * 100), # Razorpay accepts paisa
                "currency": "INR",
                "mode": "UPI",
                "purpose": "payout",
                "queue_if_low_balance": True,
                "reference_id": f"ssp_pay_{datetime.now().timestamp()}",
                "narration": "SmartShift+ Climate Protection Payout"
            }
            
            # 2. Simulate HTTP interaction (Success Scenario)
            # response = requests.post("https://api.razorpay.com/v1/payouts", auth=(settings.RAZORPAY_KEY, settings.RAZORPAY_SECRET), json=payload)
            # if response.status_code != 200: raise RazorpayIntegrationException()
            
            logger.info(f"Razorpay API Emulated Response: 200 OK. Reference ID: {payload['reference_id']}")
            
            return {
                "id": f"pout_{int(datetime.now().timestamp())}",
                "entity": "payout",
                "fund_account_id": payload["fund_account_id"],
                "amount": payload["amount"],
                "status": "processing"
            }
            
        except Exception as e:
            logger.error(f"Razorpay Exception: {str(e)}")
            raise RazorpayIntegrationException("Failed to disburse funds. Upstream gateway error.")

# ==========================================
# 6. PAYOUT SERVICE (BUSINESS LOGIC)
# ==========================================
class PayoutService:
    def __init__(self):
        self.signal_validator = SignalValidationService()
        self.gateway = RazorpayGateway()

    async def process_payout(self, worker: WorkerState, zone_id: str) -> PayoutResponse:
        logger.info(f"Evaluating climate payout for {worker.worker_id}")

        # --- STEP 1: Basic Trigger Conditions ---
        if not (worker.safar_score > 60 and worker.is_shift_active and worker.is_weekly_plan_active):
            raise PayoutValidationException("Worker does not meet base trigger conditions (Score > 60, Active Shift, Active Plan).")

        # --- STEP 2: Dynamic Effort Rule Logic ---
        # Score 61-80: min 1 order | Score 81-100: 0 orders required
        if 61 <= worker.safar_score <= 80 and worker.orders_completed < 1:
            raise PayoutValidationException("Dynamic Effort Rule Failed: Score is 61-80 but worker has 0 orders completed.")
        
        # --- STEP 3: The 3-Signal Validation Engine ---
        signal_result = await self.signal_validator.evaluate_signals(worker.worker_id, zone_id)
        if not signal_result.is_valid:
            raise PayoutValidationException(f"Signal Validation Failed. Reasons: {', '.join(signal_result.failed_signals)}")

        # --- STEP 4: Advanced Payout Formula Logic ---
        # Formula: Payout = (PEB − Actual Earnings) × Coverage Ratio × Signal Confidence
        shortfall = max(0, worker.peb - worker.actual_earnings)
        if shortfall <= 0:
            raise PayoutValidationException("Worker earnings already meet or exceed PEB. No payout necessary.")

        calculated_payout = shortfall * worker.coverage_ratio * signal_result.confidence_score
        final_payout_amount = round(calculated_payout, 2)
        
        logger.info(f"Payout calculated: ({worker.peb} - {worker.actual_earnings}) * {worker.coverage_ratio} * {signal_result.confidence_score} = {final_payout_amount}")

        # --- STEP 5: Gateway Disbursement ---
        transaction = self.gateway.process_payout(worker.worker_id, final_payout_amount)

        return PayoutResponse(
            transaction_id=transaction["id"],
            worker_id=worker.worker_id,
            amount_disbursed=final_payout_amount,
            status="SUCCESS",
            timestamp=datetime.now(),
            message="Climate disruption payout successfully dispatched via RazorpayX."
        )

# ==========================================
# 7. ROUTE CONTROLLER (FastAPI)
# ==========================================
router = APIRouter(prefix="/api/v1/payouts", tags=["Payout Engine"])

@router.post("/trigger", response_model=PayoutResponse, status_code=status.HTTP_200_OK)
async def trigger_climate_payout(worker: WorkerState, zone_id: str):
    """
    Triggers the advanced payout engine. Exposed as a private internal API 
    called by the Disruption Monitoring Cron job.
    """
    service = PayoutService()
    try:
        response = await service.process_payout(worker, zone_id)
        return response
    except PayoutValidationException as ve:
        logger.warning(f"Validation Error: {ve.message}")
        raise HTTPException(status_code=400, detail=ve.message)
    except RazorpayIntegrationException as re:
        logger.error(f"Payment Gateway Error: {re}")
        raise HTTPException(status_code=502, detail="Payment Gateway unavailable.")
    except Exception as e:
        logger.critical(f"Unhandled Exception in Payout Engine: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    except Exception as e:
        logging.error(f"❌ Payout Failed for {worker_name}: {str(e)}")
        raise e
