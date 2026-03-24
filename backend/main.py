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

# In-memory cache for graph data
_graph_cache = None

class ChatRequest(BaseModel):
    query: str

@app.get("/api/graph")
def get_graph(refresh: bool = False):
    global _graph_cache
    try:
        if _graph_cache is None or refresh:
            print(f"Building graph (refresh={refresh})...")
            _graph_cache = build_graph(DB_PATH)
        return _graph_cache
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
