
from fastapi import FastAPI

karlbruder_app = FastAPI()


@karlbruder_app.get("/")
def read_root():
    return {"Hello": "World"}