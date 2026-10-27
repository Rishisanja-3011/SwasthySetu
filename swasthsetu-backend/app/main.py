from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent

# Resolve environment files from the project, rather than from the process
# working directory. This is important when the API is started by a host from
# outside the repository root.
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(PROJECT_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.doctors import router as doctors_router
from app.api.processing import router as processing_router
from app.api.sessions import router as sessions_router


app = FastAPI(
    title="SwasthSetu API",
    description="Multilingual AI Health Intake System for Rural Clinics",
    version="0.4.0",
)


# ============================================================
# CORS
# ============================================================

import os

cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        # Patient app
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        # Doctor dashboard
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        # Hospital admin
        "http://localhost:5176",
        "http://127.0.0.1:5176",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ============================================================
# API ROUTES
# ============================================================

app.include_router(auth_router)
app.include_router(doctors_router)
app.include_router(sessions_router)
app.include_router(processing_router)


# ============================================================
# STARTUP CLEANUP
# ============================================================

@app.on_event("startup")
async def startup_event():
    try:
        from app.services.session_service import cleanup_expired_sessions
        removed = cleanup_expired_sessions(max_age_hours=4)
    except Exception:
        # Database configuration must not prevent the health endpoint from starting.
        pass


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "swasthsetu-backend",
    }
