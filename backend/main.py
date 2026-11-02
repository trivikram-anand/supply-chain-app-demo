from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Allow cross-origin requests from your frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    frontend_url,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/login")
async def mock_login(username: str):
    return {"token": "mock_jwt_token_123", "status": "success"}

@app.get("/api/dashboard")
async def get_dashboard_data():
    # Structured as a dictionary to match Object.entries mapping in React
    return {
        "metrics": {
            "Order_Fill_Rate": "96%",
            "Inventory_Turnover": 5.4,
            "On_Time_Delivery": "92%"
        }
    }

@app.post("/api/correlate")
async def upload_csv(file: UploadFile = File(...)):
    return {
        "filename": file.filename, 
        "correlation_score": 0.85,
        "message": "Demand correlation calculated successfully."
    }