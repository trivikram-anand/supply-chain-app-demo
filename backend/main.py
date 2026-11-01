from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()
# THE CONNECTIVE TISSUE: CORS Configuration
# We read the FRONTEND_URL from the environment, defaulting to your local Next.js port.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL], # Whitelists the frontend domain
    allow_credentials=True,
    allow_methods=["*"], # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

@app.post("/api/login")
async def mock_login(username: str):
    return {"token": "mock_jwt_token_123", "status": "success"}

@app.get("/api/dashboard")
async def get_dashboard_data():
    return {"metrics": {"users": 150, "uptime": "99.9%"}}

@app.post("/api/correlate")
async def upload_csv(file: UploadFile = File(...)):
    # Mock CSV processing response
    return {"filename": file.filename, "correlation_score": 0.85}