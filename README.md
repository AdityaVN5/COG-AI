# COG AI: Contextual Graph Intelligence

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-green)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-orange)
![License](https://img.shields.io/badge/license-Apache--2.0-lightgrey)
![Engine](https://img.shields.io/badge/Engine-Gemini--3.1--Flash--Lite-purple)

## Overview

COG AI is a high-fidelity context graph system designed to bridge the gap between static relational datasets and dynamic, graph-based analytical reasoning. Built specifically for complex **Order-to-Cash (O2C)** workflows, the system ingests fragmented business data (Orders, Deliveries, Invoices, Payments) and reconstructs them into a navigable, interconnected entity graph.

Unlike traditional dashboards, COG AI leverages a **Dynamic Text-to-SQL reasoning engine**. It interprets natural language queries in real-time, generates precise structured operations against the underlying SQLite data fabric, and synthesizes data-backed insights without deterministic limitations.

---

## Core Architecture

### 1. Neural Graph Construction
The system utilizes a semi-supervised ingestion pipeline to map relational entities into a cohesive graph topology. 
- **Entity Resolution**: Converts raw JSONL document headers and items into unique graph nodes.
- **Relational Mapping**: Infers edges through primary/foreign key heuristics (e.g., `SalesOrder` → `OutboundDelivery` → `BillingDocument`).
- **Interactive Workspace**: Features a high-performance draggable UI, allowing users to manually reposition entities to optimize visual clusters while maintaining reactive edge connectivity.
- **Spatial Optimization**: Implements a Force-Directed Spring Layout (via NetworkX) to minimize visual entropy and maximize cluster legibility in the UI.

### 2. Conversational Reasoning Fabric
The backend employs a multi-stage LLM pipeline to facilitate functional data interaction:
1. **Schema Injection**: Dynamically injects relevant DDL (Data Definition Language) into the LLM context window.
2. **Text-to-SQL Synthesis**: Translates natural language intent into optimized SQLite queries.
3. **Analytic Synthesis**: Executes the resulting query and synthesizes the raw result set into a grounded, natural language response.

---

## Technical Replication Setup

### Prerequisites
- Python 3.10+
- Node.js 20+
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### 1. Environment Configuration
Clone the repository and create a `.env` file in the root directory:
```bash
# .env configuration
GEMINI_API_KEY="YOUR_ACTUAL_API_KEY"
APP_URL="http://localhost:3000"
```

### 2. Backend Installation (FastAPI)
Initialize the virtual environment and install dependencies:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```
Ingest the dataset into the local SQLite fabric:
```powershell
python backend/database.py
```
Start the API server:
```powershell
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Installation (React + Vite)
Install Node modules and launch the development server:
```bash
npm install
npm run dev
```

---

## System Roadmap & Priority Matrix

The following table outlines the current development priorities for enhancing the COG AI baseline.

| Priority | Fix | Impact |
| :--- | :--- | :--- |
| 🔴 **P1** | Switch to DiGraph | Correctness of graph model (Directed Flow) |
| 🔴 **P1** | Add Journal Entry + Payment nodes | Full O2C flow coverage and auditing |
| 🟡 **P2** | Richer schema in LLM prompt | Better SQL generation for complex joins |
| 🟡 **P2** | Cache graph in memory | Near-zero latency for large entity clusters |
| 🟡 **P2** | Add python-dotenv to requirements | Standardization of deployment environments |
| 🟢 **P3** | Conversation memory | Recursive reasoning and query refinement |
| 🟢 **P3** | Broken flow endpoint | Direct anomaly detection within O2C paths |

---

## Acknowledgments
Developed as part of the Contextual Intelligence research initiative. Powered by Google Gemini.
