import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .graph import build_graph
from .chat import query_chat

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'data.db')

class ChatRequest(BaseModel):
    query: str

@app.get("/api/graph")
def get_graph():
    try:
        return build_graph(DB_PATH)
    except Exception as e:
        print("Error in /api/graph:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
def chat_endpoint(request: ChatRequest):
    try:
        return query_chat(request.query, DB_PATH)
    except Exception as e:
        print("Error in /api/chat:", e)
        raise HTTPException(status_code=500, detail=str(e))
