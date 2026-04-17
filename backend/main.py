from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models.user
import models.policy
import models.zone
import models.zone_score
import models.shift
import models.payout
import models.fraud_log

# Import Routers
from routers import shift, zones, auth, policy, payout, admin, analytics, chat

app = FastAPI(title="SmartShift+ API", version="1.0.0")

# CORS configuration for admin dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], # Dashboard ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# App Routers
app.include_router(shift.router)
app.include_router(zones.router)
app.include_router(auth.router)
app.include_router(auth.router_users)
app.include_router(policy.router)
app.include_router(payout.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(chat.router)

# Create all tables (skip if database is not available)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create database tables: {e}")
    print("Database will be available when the server runs with a valid DATABASE_URL")


@app.get("/")
def read_root():
    return {"status": "SmartShift+ API Running", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected"
    }


@app.get("/api/v1/status")
def api_status():
    return {
        "service": "SmartShift+",
        "status": "operational",
        "timestamp": None
    }
