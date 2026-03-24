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

    prompt_sql = f"""You are a SQLite expert. Given the following database schema:
{schema_str}
The user asks: "{user_query}"
Respond ONLY with a valid SQLite query, no markdown formatting, no explanations. Do not include ```sql tags.
"""
    sql_response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt_sql
    )
    sql_query = sql_response.text.strip().replace("```sql", "").replace("```", "").strip()

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
        model='gemini-2.5-flash',
        contents=prompt_final
    )
    
    return {
        "text": final_response.text,
        "sql": sql_query,
        "results": {"columns": columns, "rows": results[:10] if isinstance(results, list) else []}
    }
