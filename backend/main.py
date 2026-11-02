from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, text
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

# User Table for Authentication
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
    "https://scm-frontend.wittycoast-8732c29e.centralindia.azurecontainerapps.io/"
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
def seed_database():
    db = SessionLocal()
    try:
        # 1. Seed Admin User
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            hashed_pw = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")
            new_admin = User(username="admin", hashed_password=hashed_pw)
            db.add(new_admin)
            db.commit()

        # 2. Create Raw Supply Chain Orders Table using Explicit SQL
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS supply_chain_orders (
                order_id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT,
                ordered_qty INTEGER,
                delivered_qty INTEGER,
                on_time INTEGER,
                cogs REAL,
                inventory_value REAL
            )
        """))
        db.commit()

        # 3. Check if rows exist; if empty, INSERT raw supply chain records
        row_count = db.execute(text("SELECT COUNT(*) FROM supply_chain_orders")).scalar()
        if row_count == 0:
            db.execute(text("""
                INSERT INTO supply_chain_orders (sku, ordered_qty, delivered_qty, on_time, cogs, inventory_value)
                VALUES 
                    ('SKU-101-PUMP', 500, 490, 1, 125000.0, 22000.0),
                    ('SKU-102-VALVE', 300, 285, 1, 85000.0, 15000.0),
                    ('SKU-103-MOTOR', 200, 195, 1, 210000.0, 35000.0),
                    ('SKU-104-SENSOR', 450, 410, 0, 95000.0, 18000.0),
                    ('SKU-105-GEAR', 600, 595, 1, 165000.0, 28000.0)
            """))
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
def get_dashboard_data(db: Session = Depends(get_db)):
    # 1. Execute SQL Aggregation Query to calculate KPIs dynamically from the table
    kpi_query = text("""
        SELECT 
            ROUND((CAST(SUM(delivered_qty) AS FLOAT) / SUM(ordered_qty)) * 100, 1) AS fill_rate,
            ROUND(SUM(cogs) / SUM(inventory_value), 2) AS inv_turnover,
            ROUND(AVG(CAST(on_time AS FLOAT)) * 100, 1) AS otd_rate
        FROM supply_chain_orders
    """)
    kpi_row = db.execute(kpi_query).fetchone()

    # 2. Execute SQL SELECT Query to fetch the raw inventory rows for the frontend table
    orders_query = text("""
        SELECT order_id, sku, ordered_qty, delivered_qty, on_time, cogs, inventory_value 
        FROM supply_chain_orders
    """)
    orders_rows = db.execute(orders_query).fetchall()

    orders_list = [
        {
            "order_id": r[0],
            "sku": r[1],
            "ordered_qty": r[2],
            "delivered_qty": r[3],
            "on_time": "Yes" if r[4] == 1 else "Delayed",
            "cogs": r[5],
            "inventory_value": r[6]
        }
        for r in orders_rows
    ]

    return {
        "metrics": {
            "Order_Fill_Rate": f"{kpi_row[0]}%",
            "Inventory_Turnover": kpi_row[1],
            "On_Time_Delivery": f"{kpi_row[2]}%"
        },
        "orders": orders_list
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