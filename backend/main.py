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
import numpy as np

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

class RegisterRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Check if the username is already taken
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # 2. Hash the new password and save the user
    hashed_pw = bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = User(username=request.username, hashed_password=hashed_pw)
    
    db.add(new_user)
    db.commit()

@app.post("/api/auth/login")
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

        # 2. DROP Old Schema and CREATE Normalized Schema
        db.execute(text("DROP TABLE IF EXISTS supply_chain_orders;"))
        db.execute(text("DROP TABLE IF EXISTS products;"))
        
        # Dimension Table: Products
        db.execute(text("""
            CREATE TABLE products (
                sku TEXT PRIMARY KEY,
                product_name TEXT,
                category TEXT,
                unit_cost REAL
            )
        """))
        
        # Fact Table: Orders (Now includes Dates and Status for advanced KPIs)
        db.execute(text("""
            CREATE TABLE supply_chain_orders (
                order_id TEXT PRIMARY KEY,
                sku TEXT,
                ordered_qty INTEGER,
                delivered_qty INTEGER,
                order_date DATE,
                promised_date DATE,
                actual_delivery_date DATE,
                status TEXT,
                FOREIGN KEY(sku) REFERENCES products(sku)
            )
        """))
        db.commit()

        # 3. Seed Normalized Data
        db.execute(text("""
            INSERT INTO products (sku, product_name, category, unit_cost) VALUES 
            ('M1001', 'High-Pressure Pump', 'Hydraulics', 125.00),
            ('M1002', 'Flow Valve', 'Control', 85.00),
            ('M1003', 'Rotary Motor', 'Drive', 210.00);
        """))
        
        db.execute(text("""
            INSERT INTO supply_chain_orders 
            (order_id, sku, ordered_qty, delivered_qty, order_date, promised_date, actual_delivery_date, status) 
            VALUES 
            ('ORD-001', 'M1001', 100, 100, '2026-10-25', '2026-10-30', '2026-10-28', 'Fulfilled'),
            ('ORD-002', 'M1001', 200, 150, '2026-10-28', '2026-11-02', '2026-11-04', 'Partial'),
            ('ORD-003', 'M1002', 150, 0, '2026-11-01', '2026-11-05', NULL, 'Pending'),
            ('ORD-004', 'M1003', 50, 50, '2026-11-02', '2026-11-10', '2026-11-03', 'Fulfilled');
        """))
        db.commit()
    finally:
        db.close()

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
    # 1. Advanced KPI Aggregation (Using JOINs and conditional CASE statements)
    kpi_query = text("""
        SELECT 
            -- Order Fill Rate (%)
            ROUND((CAST(SUM(o.delivered_qty) AS FLOAT) / SUM(o.ordered_qty)) * 100, 1) AS fill_rate,
            
            -- On-Time Delivery (%)
            ROUND((CAST(SUM(CASE WHEN o.actual_delivery_date <= o.promised_date THEN 1 ELSE 0 END) AS FLOAT) / 
                   COUNT(CASE WHEN o.status IN ('Fulfilled', 'Partial') THEN 1 END)) * 100, 1) AS otd_rate,
                   
            -- Open Orders
            SUM(CASE WHEN o.status IN ('Pending', 'Partial') THEN 1 ELSE 0 END) AS open_orders,
            
            -- Value of Pending Inventory (Ordered minus Delivered * Unit Cost)
            SUM((o.ordered_qty - o.delivered_qty) * p.unit_cost) AS pending_inventory_value
        FROM supply_chain_orders o
        JOIN products p ON o.sku = p.sku
    """)
    kpi_row = db.execute(kpi_query).fetchone()

    # 2. Fetch Joined Table Data for Frontend
    orders_query = text("""
        SELECT 
            o.order_id, 
            o.sku, 
            p.product_name,
            o.ordered_qty, 
            o.delivered_qty, 
            o.order_date,
            o.status 
        FROM supply_chain_orders o
        JOIN products p ON o.sku = p.sku
        ORDER BY o.order_date DESC
    """)
    orders_rows = db.execute(orders_query).fetchall()

    orders_list = [
        {
            "order_id": r[0],
            "sku": r[1],
            "product_name": r[2],
            "ordered_qty": r[3],
            "delivered_qty": r[4],
            "order_date": r[5],
            "status": r[6]
        }
        for r in orders_rows
    ]

    return {
        "metrics": {
            "Order_Fill_Rate": f"{kpi_row[0]}%",
            "On_Time_Delivery": f"{kpi_row[1]}%",
            "Open_Orders": int(kpi_row[2] or 0),
            "Pending_Inventory_Value": f"${kpi_row[3]:,.2f}" if kpi_row[3] else "$0.00"
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
            return {"correlation_score": "Error", "message": "CSV requires at least two numeric columns."}
        
        col1, col2 = numeric_df.columns[0], numeric_df.columns[1]
        
        # Drop empty rows to prevent math errors
        clean_df = numeric_df[[col1, col2]].dropna()
        correlation = clean_df[col1].corr(clean_df[col2])
        
        # Generate Scatter Data (cap at 500 points for browser performance)
        plot_df = clean_df.head(500)
        data_points = plot_df.rename(columns={col1: "x", col2: "y"}).to_dict(orient="records")
        
        # Calculate Trend Line (Linear Regression)
        slope, intercept = np.polyfit(clean_df[col1], clean_df[col2], 1)
        min_x, max_x = float(clean_df[col1].min()), float(clean_df[col1].max())
        trend_line = [
            {"x": min_x, "trend": float(slope * min_x + intercept)},
            {"x": max_x, "trend": float(slope * max_x + intercept)}
        ]
        
        return {
            "filename": file.filename,
            "col_x": col1,
            "col_y": col2,
            "correlation_score": round(correlation, 4),
            "data_points": data_points,
            "trend_line": trend_line,
            "message": f"Successfully correlated '{col1}' vs '{col2}'"
        }
    except Exception as e:
        return {"correlation_score": "Error", "message": str(e)}