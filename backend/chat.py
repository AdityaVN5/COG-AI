import os
import sqlite3
import json
from google import genai
from dotenv import load_dotenv

# Load .env from the backend directory explicitly
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

def query_chat_stream(user_query, history, db_path):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    schema_str = ""
    for table_tuple in tables:
        t = table_tuple[0]
        cur.execute(f"PRAGMA table_info({t})")
        columns = [row[1] for row in cur.fetchall()]
        schema_str += f"Table {t}: {', '.join(columns)}\n"

    # Build a conversation summary for the SQL generation prompt
    history_context = ""
    if history:
        history_context = "\n### Conversation History (for context on follow-up questions):\n"
        for msg in history[-6:]:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            history_context += f"{role_label}: {msg['text']}\n"
        history_context += "\n"

    prompt_sql = f"""You are a strict data assistant. Your job is to convert user queries into SQLite queries based on the provided schema.

### Guardrails
You MUST strictly evaluate if the user's query is related to the provided dataset, business data, or SAP O2C domain. 
If the user asks a general knowledge question, makes a creative writing request, or asks about an irrelevant topic, you MUST respond with EXACTLY the word "REJECT" and nothing else.
{history_context}
Schema:
{schema_str}

The user asks: "{user_query}"
Note: This may be a follow-up question. Use the conversation history above to resolve any references like "this order", "that customer", etc.
If relevant, respond ONLY with a valid SQLite query, no markdown formatting, no explanations. Do not include ```sql tags.
If irrelevant, respond ONLY with "REJECT".
"""
    sql_response = client.models.generate_content(
        model='gemini-3.1-flash-lite-preview',
        contents=prompt_sql
    )
    total_tokens = sql_response.usage_metadata.total_token_count if sql_response.usage_metadata else 0
    sql_query = sql_response.text.strip().replace("```sql", "").replace("```", "").strip()

    if sql_query.upper() == "REJECT" or "REJECT" in sql_query.upper():
        yield f'data: {{"text": "This system is designed to answer questions related to the provided dataset only."}}\n\n'
        yield f'data: {json.dumps({"sql": None, "results": {"columns": [], "rows": []}, "highlight_nodes": []})}\n\n'
        return

    highlight_nodes = []
    try:
        cur.execute(sql_query)
        if cur.description:
            columns = [description[0] for description in cur.description]
            results = cur.fetchall()
            
            # Fast heuristic extraction for node highlighting
            for i, col in enumerate(columns):
                c = col.lower()
                prefix = ""
                if "salesorder" in c or "salesdocument" in c: prefix = "ORDER_"
                elif "customer" in c or "partner" in c or "soldto" in c: prefix = "CUST_"
                elif "material" in c or "product" in c: prefix = "PROD_"
                elif "delivery" in c: prefix = "DEL_"
                elif "billing" in c or "invoice" in c: prefix = "INV_"
                elif "clearing" in c or "payment" in c: prefix = "PAY_"
                elif "accounting" in c or "journal" in c: prefix = "JE_"
                else:
                    continue
                
                if prefix:
                    for r in results:
                        val = r[i]
                        if val and str(val).strip():
                            highlight_nodes.append(f"{prefix}{val}")
                            
            highlight_nodes = list(set(highlight_nodes))  # Deduplicate
        else:
            columns = []
            results = "Query executed successfully with no returned rows."
    except Exception as e:
        results = f"Error executing query {sql_query}: {str(e)}"
        columns = []
        
    conn.close()

    prompt_final = f"""You are a helpful data analyst for the COG AI context graph system.
The user asked: "{user_query}"
We ran this SQL query: {sql_query}
The database returned these results: {results}
(Columns: {columns})

Formulate a concise, insightful natural language response answering the user's question. If the result is an error, just say you couldn't find the answer. Do not show the SQL query unless asked explicitly. Format it nicely.
"""
    messages = []
    # Sliding window: last 6 messages = 3 full user+AI exchanges
    for msg in history[-6:]:
        role = "user" if msg["role"] == "user" else "model"
        messages.append({"role": role, "parts": [{"text": msg["text"]}]})
        
    messages.append({"role": "user", "parts": [{"text": prompt_final}]})

    response_stream = client.models.generate_content_stream(
        model='gemini-3.1-flash-lite-preview',
        contents=messages
    )
    
    for chunk in response_stream:
        if chunk.text:
            yield f'data: {{"text": {json.dumps(chunk.text)}}}\n\n'
        if chunk.usage_metadata:
            total_tokens += chunk.usage_metadata.total_token_count
            
    final_payload = {
        "sql": sql_query,
        "results": {"columns": columns, "rows": results[:10] if isinstance(results, list) else []},
        "highlight_nodes": highlight_nodes,
        "usage": {"total_tokens": total_tokens}
    }
    yield f'data: {json.dumps(final_payload)}\n\n'
