import sqlite3
import pandas as pd

conn = sqlite3.connect('backend/data.db')
query = "SELECT name FROM sqlite_master WHERE type='table';"
tables = pd.read_sql(query, conn)['name'].tolist()

with open('backend/schema_sample.txt', 'w') as f:
    for table in tables:
        f.write(f"--- Table: {table} ---\n")
        df = pd.read_sql(f"SELECT * FROM {table} LIMIT 1", conn)
        for col in df.columns:
            f.write(f"  {col}: {df[col].iloc[0]}\n")
        f.write("\n")

conn.close()
