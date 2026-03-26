import os
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
try:
    from .graph import build_graph           # package mode: uvicorn backend.main:app
except ImportError:
    from graph import build_graph             # standalone mode: uvicorn main:app (Docker)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "COG AI Backend"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'data.db')

# In-memory cache for graph data
_graph_cache = None

from typing import List
from fastapi.responses import StreamingResponse

class MessageContext(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    query: str
    history: List[MessageContext] = []

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
        try:
            from .chat import query_chat_stream
        except ImportError:
            from chat import query_chat_stream
        history_dicts = [{"role": m.role, "text": m.text} for m in request.history]
        return StreamingResponse(query_chat_stream(request.query, history_dicts, DB_PATH), media_type="text/event-stream")
    except Exception as e:
        print("Error in /api/chat:", e)
        raise HTTPException(status_code=500, detail=str(e))

class SaveHistoryRequest(BaseModel):
    id: str
    messages: list
    totalTokens: int = 0

import json
import re

@app.post("/api/history")
def save_history(request: SaveHistoryRequest):
    history_dir = os.path.join(BASE_DIR, 'history')
    os.makedirs(history_dir, exist_ok=True)
    
    md_content = f"# Conversation {request.id}\n\n"
    # Metadata as a hidden JSON comment for easy state reconstruction
    state_meta = {
        "messages": request.messages,
        "totalTokens": request.totalTokens
    }
    md_content += f"<!-- STATE_META_DO_NOT_EDIT: {json.dumps(state_meta)} -->\n\n"
    for msg in request.messages:
        role = "User" if msg.get("role") == "user" else "COG AI"
        md_content += f"### {role}\n{msg.get('text')}\n\n"
        if msg.get("sql"):
            md_content += f"**SQL Generated:**\n```sql\n{msg['sql']}\n```\n\n"
        if msg.get("highlight_nodes"):
            md_content += f"**Highlighted Entities:** {', '.join(msg['highlight_nodes'])}\n\n"
            
    raw_json = json.dumps(request.messages)
    md_content += f"\n<!-- STATE_META_DO_NOT_EDIT: {raw_json} -->\n"
    
    filepath = os.path.join(history_dir, f"{request.id}.md")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(md_content)
    
    return {"status": "success", "id": request.id}

@app.delete("/api/history/{conv_id}")
def delete_history(conv_id: str):
    history_file = os.path.join(BASE_DIR, 'history', f"{conv_id}.md")
    if os.path.exists(history_file):
        os.remove(history_file)
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Conversation not found")

@app.get("/api/analysis/broken-flows")
def get_broken_flows():
    try:
        db_path = os.path.join(BASE_DIR, 'data.db')
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # 1. Stuck Orders (Orders with no delivery)
        # We join on outbound_delivery_items which references the sales order
        cur.execute("""
            SELECT h.salesOrder, h.soldToParty, h.totalNetAmount, h.transactionCurrency, h.overallDeliveryStatus 
            FROM sales_order_headers h
            LEFT JOIN outbound_delivery_items d ON h.salesOrder = d.referenceSdDocument
            WHERE d.deliveryDocument IS NULL
            LIMIT 20
        """)
        stuck_orders = [{"id": r[0], "customer": r[1], "amount": r[2], "currency": r[3], "status": r[4]} for r in cur.fetchall()]
        
        # 2. Unbilled Deliveries (Deliveries with no billing)
        # We join on billing_document_items which references the delivery document
        cur.execute("""
            SELECT d.deliveryDocument, h.soldToParty, d.creationDate, d.overallProofOfDeliveryStatus
            FROM outbound_delivery_headers d
            JOIN outbound_delivery_items di ON d.deliveryDocument = di.deliveryDocument
            JOIN sales_order_headers h ON di.referenceSdDocument = h.salesOrder
            LEFT JOIN billing_document_items b ON d.deliveryDocument = b.referenceSdDocument
            WHERE b.billingDocument IS NULL
            GROUP BY d.deliveryDocument
            LIMIT 20
        """)
        unbilled_deliveries = [{"id": r[0], "customer": r[1], "date": r[2], "status": r[3]} for r in cur.fetchall()]
        
        # 3. Unpaid Invoices (Billed but not cleared)
        # We join billing headers to journal entries via accountingDocument
        cur.execute("""
            SELECT b.billingDocument, b.soldToParty, b.totalNetAmount, b.transactionCurrency, b.accountingDocument
            FROM billing_document_headers b
            LEFT JOIN journal_entry_items_accounts_receivable j ON b.accountingDocument = j.accountingDocument
            WHERE b.billingDocumentIsCancelled = 0
            AND (j.clearingAccountingDocument IS NULL OR j.clearingAccountingDocument = '')
            LIMIT 20
        """)
        unpaid_invoices = [{"id": r[0], "customer": r[1], "amount": r[2], "currency": r[3], "accDoc": r[4]} for r in cur.fetchall()]
        
        conn.close()
        return {
            "stuck_orders": stuck_orders,
            "unbilled_deliveries": unbilled_deliveries,
            "unpaid_invoices": unpaid_invoices
        }
    except Exception as e:
        print(f"Error in broken-flows detection: {e}")
        return {"stuck_orders": [], "unbilled_deliveries": [], "unpaid_invoices": [], "error": str(e)}

@app.get("/api/history")
def list_history():
    history_dir = os.path.join(BASE_DIR, 'history')
    if not os.path.exists(history_dir):
        return []
    
    files = [f for f in os.listdir(history_dir) if f.endswith('.md')]
    files.sort(reverse=True)
    
    results = []
    for f in files:
        cid = f.replace('.md', '')
        filepath = os.path.join(history_dir, f)
        tokens = 0
        try:
            with open(filepath, "r", encoding="utf-8") as file:
                head = file.read(2048) # Read first 2KB for meta
                match = re.search(r"<!-- STATE_META_DO_NOT_EDIT: (.*) -->", head)
                if match:
                    meta = json.loads(match.group(1))
                    tokens = meta.get("totalTokens", 0)
        except:
            pass
        results.append({"id": cid, "filename": f, "totalTokens": tokens})
        
    return results

@app.get("/api/history/{conv_id}")
def get_history(conv_id: str):
    history_dir = os.path.join(BASE_DIR, 'history')
    filepath = os.path.join(history_dir, f"{conv_id}.md")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Not found")
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    match = re.search(r"<!-- STATE_META_DO_NOT_EDIT: (.*) -->", content)
    messages = []
    total_tokens = 0
    if match:
        try:
            meta = json.loads(match.group(1))
            if isinstance(meta, dict):
                messages = meta.get("messages", [])
                total_tokens = meta.get("totalTokens", 0)
            else:
                messages = meta # legacy fallback
        except:
            pass
            
    return {"id": conv_id, "messages": messages, "totalTokens": total_tokens, "markdown": content}

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable if available (for Cloud Run), default to 8080
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
