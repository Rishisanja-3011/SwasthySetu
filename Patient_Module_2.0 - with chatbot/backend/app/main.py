from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.chat import router as chat_router


app = FastAPI(
    title="MediBot API",
    version="1.0.0"
)


# CORS configuration
# Allow requests from standalone MediBot and SwasthSetu.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        "http://localhost:5176",
        "http://127.0.0.1:5176",

        "http://localhost:5177",
        "http://127.0.0.1:5177",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API routes

app.include_router(
    chat_router,
    prefix="/api/v1"
)


@app.get("/")
def root():
    return {
        "message": "MediBot API is running"
    }