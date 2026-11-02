from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import os
import io
import pandas as pd
import bcrypt
import jwt
import datetime

# SQLite Database Configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./scm_database.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

Base.metadata.create_all(bind=engine)

SECRET_KEY = "super_secret_supply_chain_key_change_in_production"
ALGORITHM = "HS256"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    frontend_url,
    "https://scm-frontend.wittycoast-8732c29e.centralindia.azurecontainerapps.io/ "
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

@app.on_event("startup")
def create_admin_user():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            hashed_pw = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")
            new_admin = User(username="admin", hashed_password=hashed_pw)
            db.add(new_admin)
            db.commit()
    finally:
        db.close()

@app.post("/api/auth/login")
@app.post("/api/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    password_matches = bcrypt.checkpw(
        request.password.encode("utf-8"), 
        user.hashed_password.encode("utf-8")
    )
    if not password_matches:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    token_data = {"sub": user.username, "exp": expiration}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
        
    return {"token": token, "status": "success"}

@app.get("/api/dashboard")
async def get_dashboard_data():
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
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        numeric_df = df.select_dtypes(include=['number'])
        
        if numeric_df.shape[1] < 2:
            return {
                "filename": file.filename, 
                "correlation_score": "N/A",
                "message": "Error: CSV requires at least two numeric columns."
            }
        
        col1, col2 = numeric_df.columns[0], numeric_df.columns[1]
        correlation = numeric_df[col1].corr(numeric_df[col2])
        
        return {
            "filename": file.filename, 
            "correlation_score": round(correlation, 4),
            "message": f"Successfully correlated '{col1}' vs '{col2}'"
        }
    except Exception as e:
        return {"filename": file.filename, "correlation_score": "Error", "message": str(e)}
