import os
import sqlite3
from google import genai
from dotenv import load_dotenv

load_dotenv()

def query_chat(user_query, db_path):
    client = genai.Client()
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

    prompt_sql = f"""You are a strict data assistant. Your job is to convert user queries into SQLite queries based on the provided schema.

### Guardrails
You MUST strictly evaluate if the user's query is related to the provided dataset, business data, or SAP O2C domain. 
If the user asks a general knowledge question, makes a creative writing request, or asks about an irrelevant topic, you MUST respond with EXACTLY the word "REJECT" and nothing else.

Schema:
{schema_str}

The user asks: "{user_query}"
If relevant, respond ONLY with a valid SQLite query, no markdown formatting, no explanations. Do not include ```sql tags.
If irrelevant, respond ONLY with "REJECT".
"""
    sql_response = client.models.generate_content(
        model='gemini-3.1-flash-lite-preview',
        contents=prompt_sql
    )
    sql_query = sql_response.text.strip().replace("```sql", "").replace("```", "").strip()

    if sql_query.upper() == "REJECT" or "REJECT" in sql_query.upper():
        return {
            "text": "This system is designed to answer questions related to the provided dataset only.",
            "sql": None,
            "results": {"columns": [], "rows": []}
        }

    try:
        cur.execute(sql_query)
        if cur.description:
            columns = [description[0] for description in cur.description]
            results = cur.fetchall()
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
    final_response = client.models.generate_content(
        model='gemini-3.1-flash-lite-preview',
        contents=prompt_final
    )
    
    return {
        "text": final_response.text,
        "sql": sql_query,
        "results": {"columns": columns, "rows": results[:10] if isinstance(results, list) else []}
    }
