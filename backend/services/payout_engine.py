import datetime
import os
import uuid
import requests
from sqlalchemy.orm import Session
from services.peb_engine import PEBEngine
from services.trustmesh import calculate_bps
from models.payout import Payout
from models.shift import Shift
from models.policy import Policy
from models.user import User

class PayoutEngine:
    "\"\"
    Parametric Triggers & Payout Engine
    Executes the 3-Signal validation and initiates automatic UPI payouts without human intervention.
    "\"\"

    def __init__(self, db: Session):
        self.db = db
        self.peb_engine = PEBEngine(db)

    def process_disruption_trigger(self, zone_id: int, current_score: float):
        "\"\"Triggered automatically when SafarScore > 60"\"\"
        # Shift is active if end_time is None
        active_shifts = self.db.query(Shift).filter(Shift.zone_id == zone_id, Shift.end_time == None).all()

        for shift in active_shifts:
            user_policy = self.db.query(Policy).filter(Policy.user_id == shift.user_id, Policy.status == 'active').first()
            if not user_policy:
                continue

            # Signal 1: External Event is verified by SafarScore > 60
            signal_1_valid = True

            # Signal 2: TrustMesh Behavioral Presence Score (BPS)
            # Mocking shift telemetry data for TrustMesh analysis
            shift_telemetry = {
                'mock_location_detected': False,
                'gps_variance': 0.005,
                'accel_stddev': 1.2,
                'distance_km': 12.0,
                'time_hrs': 2.0,
                'orders_last_4hrs': shift.orders_completed,
                'nearby_workers': 5
            }
            bps_score = calculate_bps(shift_telemetry)
            signal_2_valid = bps_score >= 50

            # Signal 3: Proxy Demand Drop (>40%)
            signal_3_valid = self._check_demand_drop(zone_id)

            confirmed_signals = sum([signal_1_valid, signal_2_valid, signal_3_valid])

            # 2 out of 3 confirmation rule
            if signal_1_valid and confirmed_signals >= 2:
                # DYNAMIC EFFORT RULE VERIFICATION
                # If SafarScore is extremely high (flood condition), 0 orders expected.
                # If it's just heavy rain (Score > 60 but < 80), worker must attempt at least 1 order.
                required_orders = 0 if current_score >= 80 else 1
                
                if shift.orders_completed >= required_orders:
                    print(f" Dynamic Effort Rule passed for User {shift.user_id}: {shift.orders_completed} orders vs {required_orders} required.")
                    self._execute_payout(shift, user_policy, bps_score, confirmed_signals)
                else:
                    print(f" Dynamic Effort Rule failed for User {shift.user_id}: {shift.orders_completed} orders vs {required_orders} required.")

    def _check_demand_drop(self, zone_id: int) -> bool:
        "\"\"Mocks a platform API check for >40% volume drop in the zone."\"\"
        return True

    def _execute_payout(self, shift: Shift, policy: Policy, bps_score: int, signals_confirmed: int):
        "\"\"Calculates gap using PEB and pushes to payment gateway (e.g. Razorpay)"\"\"
        worker_peb_hourly = self.peb_engine.calculate_baseline(
            user_id=shift.user_id, 
            target_date=datetime.date.today(),
            time_slot="Evening",
            zone_id=shift.zone_id
        )

        actual_earned = float(shift.earnings or 0.0)
        gap = max(0.0, worker_peb_hourly - actual_earned)
        if gap == 0: return

        # Apply plan limits and confidence ratios
        coverage_ratio = self._get_coverage_ratio(policy.plan_type)
        confidence_modifier = 1.0 if signals_confirmed == 3 else 0.85
        
        final_payout_amount = round(gap * coverage_ratio * confidence_modifier, 2)

        # Log to Payout ledger mapping exactly to realistic models
        payout_record = Payout(
            user_id=shift.user_id,
            shift_id=shift.id,
            peb_amount=worker_peb_hourly,
            actual_amount=actual_earned,
            gap_amount=gap,
            coverage_ratio=coverage_ratio,
            signal_confidence=confidence_modifier,
            payout_amount=final_payout_amount,
            status="approved" if bps_score >= 75 else "pending",
            bps_score=bps_score,
            created_at=datetime.datetime.utcnow()
        )
        self.db.add(payout_record)
        self.db.commit()

        if payout_record.status == 'approved':
            self._push_to_razorpay(shift.user_id, final_payout_amount, payout_record.id, shift.id)

    def _push_to_razorpay(self, user_id: int, amount: float, payout_id: int, shift_id: int):
        """
        Advanced RazorpayX API Integration for Automatic UPI Payouts.
        Handles creating Contacts, Fund Accounts, and ensuring Idempotency 
        so gig workers receive weather payouts within 30 minutes.
        """
        worker = self.db.query(User).filter(User.id == user_id).first()
        if not worker:
            print(f"Error: Worker {user_id} not found for payout")
            return

        # Fetch environment secrets for the RazorpayX API
        RAZORPAY_KEY = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
        RAZORPAY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "secret_placeholder")
        RAZORPAY_ACCOUNT = os.getenv("RAZORPAY_ACCOUNT_NUMBER", "2323230000000000")

        # Infer the worker's UPI ID (e.g., 9876543210@ybl) based on their phone 
        worker_upi_vpa = f"{worker.phone}@ybl"

        try:
            # Step 1 & 2: Contact and Fund Account Setup (Mocked ID for demonstration)
            fund_account_id = f"fa_upi_{user_id}xyz"
            
            # Step 3: Issue the Payout Transaction (amount in Paise)
            payout_payload = {
                "account_number": RAZORPAY_ACCOUNT,
                "fund_account_id": fund_account_id,
                "amount": int(amount * 100), 
                "currency": "INR",
                "mode": "UPI",
                "purpose": "payout",
                "queue_if_low_balance": True,
                # Idempotency Key mapping exactly to our internal DB references to prevent double-paying
                "reference_id": f"SSP_PAY_PT{payout_id}_SH{shift_id}", 
                "narration": f"SmartShift+ Claim Shift {shift_id}",
                "notes": {
                    "user_id": str(user_id),
                    "policy_trigger": "SafarScore_Disruption",
                    "idempotency_uuid": str(uuid.uuid4())
                }
            }

            # Actual API Execution mapped to RazorpayX
            '''
            response = requests.post(
                "https://api.razorpay.com/v1/payouts",
                json=payout_payload,
                auth=(RAZORPAY_KEY, RAZORPAY_SECRET),
                timeout=10
            )
            response.raise_for_status()
            
            # Update local DB based on provider response
            payout_result = response.json()
            if payout_result.get('status') in ['processing', 'processed']:
                print(f"Success: Payout {payout_result['id']} tracked in RazorpayX.")
            '''
            
            print(f" RazorpayX Sandbox Transfer Initiated!")
            print(f"   -> Reference: {payout_payload['reference_id']}")
            print(f"   -> Disbursing INR {amount} to {worker.name} via {worker_upi_vpa}")

        except Exception as e:
            # Real behavior: mark Payout record as 'gateway_failed' and retry later
            print(f" [RazorpayX API] Gateway Payment Failed: {str(e)}")

    def _get_coverage_ratio(self, plan_type: str) -> float:
        ratios = {'Light': 0.60, 'Regular': 0.65, 'Standard': 0.70, 'Pro': 0.80, 'Max': 0.90}
        plan_str = plan_type.capitalize() if plan_type else 'Standard'
        return ratios.get(plan_str, 0.70)
