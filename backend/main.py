import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .api import routes

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="InternIQ API",
    description="API for managing internship data for the InternIQ dashboard.",
    version="1.0.0"
)

# --- CORS Middleware ---
# Get allowed origins from environment variables
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',')]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# --- API Router ---
# Include the router from api/routes.py with a prefix
app.include_router(routes.router, prefix="/api")

# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the InternIQ API. Visit /docs for API documentation."}
