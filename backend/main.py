
from fastapi import FastAPI
from sqlalchemy import text
from database import engine
from fastapi.middleware.cors import CORSMiddleware

karlbruder_app = FastAPI()


karlbruder_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@karlbruder_app.get("/")
def read_root():
    return {"Hello": "World"}

@karlbruder_app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "backend",
        "message": "Backend is alive"
    }

@karlbruder_app.get("/health/db")
def health_db():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            return {
                "status": "ok",
                "database": "connected",
                "result": result.scalar()
            }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e)
        }