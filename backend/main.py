from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
import io
from pydantic import BaseModel

# NEW: Database and Security Imports
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
import jwt
import datetime

# NEW: SQLite Database Configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./scm_database.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# NEW: Define the User Table
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

# NEW: Create the table in the database file
Base.metadata.create_all(bind=engine)

# NEW: Password Hashing Configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "super_secret_supply_chain_key_change_in_production"
ALGORITHM = "HS256"

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

# Allow cross-origin requests from your frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    frontend_url,
    "https://scm-frontend.wittycoast-8732c29e.centralindia.azurecontainerapps.io/ "
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NEW: Define the structure of the data the frontend will send
class LoginRequest(BaseModel):
    username: str
    password: str

# NEW: Automatically create an admin user when the server starts
@app.on_event("startup")
def create_admin_user():
    db = SessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        hashed_pw = pwd_context.hash("admin123")
        new_admin = User(username="admin", hashed_password=hashed_pw)
        db.add(new_admin)
        db.commit()
    db.close()

# NEW: Real database login endpoint
@app.post("/api/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # 1. Look up the user in the SQLite database
    user = db.query(User).filter(User.username == request.username).first()
    
    # 2. Check if user exists and password hash matches
    if not user or not pwd_context.verify(request.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    # 3. Generate a real JWT valid for 1 hour
    expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    token_data = {"sub": user.username, "exp": expiration}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {"token": token, "status": "success"}

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