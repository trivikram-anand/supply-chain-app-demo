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
    "https://scm-frontend.wittycoast-8732c29e.centralindia.azurecontainerapps.io"
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
    try:
        # Read file into memory directly (no disk saving required)
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Isolate numeric columns to safely run math operations
        numeric_df = df.select_dtypes(include=['number'])
        
        if numeric_df.shape[1] < 2:
            return {
                "filename": file.filename, 
                "correlation_score": "N/A",
                "message": "Error: CSV requires at least two numeric columns."
            }
        
        # Calculate Pearson correlation between the first two numeric columns
        col1, col2 = numeric_df.columns[0], numeric_df.columns[1]
        correlation = numeric_df[col1].corr(numeric_df[col2])
        
        return {
            "filename": file.filename, 
            "correlation_score": round(correlation, 4),
            "message": f"Successfully correlated '{col1}' vs '{col2}'"
        }
    except Exception as e:
        return {"filename": file.filename, "correlation_score": "Error", "message": str(e)}