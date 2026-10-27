import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client


BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / "backend" / ".env")
load_dotenv(BASE_DIR / ".env")


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

APP_BASE_URL = os.getenv(
    "APP_BASE_URL",
    "http://localhost:3000",
).rstrip("/")


if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is not configured")

if not SUPABASE_PUBLISHABLE_KEY:
    raise RuntimeError("SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) is not configured")

if not SUPABASE_SECRET_KEY:
    raise RuntimeError("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not configured")


# Normal client.
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
)


# Server-side privileged client.
#
# IMPORTANT:
# SUPABASE_SECRET_KEY must NEVER be exposed to the frontend.
supabase_admin: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
)
