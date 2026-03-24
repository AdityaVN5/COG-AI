import os
import pandas as pd
import sqlite3

def ingest_data(db_path, data_dir):
    conn = sqlite3.connect(db_path)
    
    if not os.path.exists(data_dir):
        print(f"Directory not found: {data_dir}")
        return
        
    for foldername in os.listdir(data_dir):
        folder_path = os.path.join(data_dir, foldername)
        if os.path.isdir(folder_path):
            df_list = []
            for filename in os.listdir(folder_path):
                if filename.endswith('.jsonl'):
                    file_path = os.path.join(folder_path, filename)
                    try:
                        df = pd.read_json(file_path, lines=True)
                        df_list.append(df)
                    except Exception as e:
                        print(f"Error reading {file_path}: {e}")
            if df_list:
                import json
                combined_df = pd.concat(df_list, ignore_index=True)
                # Convert dicts and lists to JSON strings for SQLite
                for col in combined_df.columns:
                    combined_df[col] = combined_df[col].apply(lambda x: json.dumps(x) if isinstance(x, (dict, list)) else x)
                table_name = foldername
                print(f"Ingesting {table_name}: {len(combined_df)} rows")
                combined_df.to_sql(table_name, conn, if_exists='replace', index=False)
    conn.close()
    print("Ingestion complete.")

if __name__ == '__main__':
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, 'sap-o2c-data')
    DB_PATH = os.path.join(BASE_DIR, 'backend', 'data.db')
    ingest_data(DB_PATH, DATA_DIR)
