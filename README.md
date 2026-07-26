# RoboFusion 1.0 - Software Architecture

This document outlines the high-level architecture, data flow, and components of the RoboFusion IoT hazard monitoring system.

## Complete Architecture Diagram

The system operates on a modern, event-driven architecture utilizing WebSockets for real-time responsiveness and an ML-enhanced backend for predictive risk analysis.

```mermaid
flowchart LR
    %% Define Styles
    classDef hardware fill:#e74c3c,stroke:#c0392b,stroke-width:2px,color:#fff,font-weight:bold
    classDef backend fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff,font-weight:bold
    classDef database fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff,font-weight:bold
    classDef frontend fill:#9b59b6,stroke:#8e44ad,stroke-width:2px,color:#fff,font-weight:bold

    %% Nodes
    ESP["1. Hardware (ESP32)\nReads Sensors & Alarms"]:::hardware
    API["2. Backend (FastAPI)\nCalculates Risk Score"]:::backend
    DB[("3. Database (PostgreSQL)\nStores Incident History")]:::database
    UI["4. Frontend (Next.js)\nShows Live Map & Alerts"]:::frontend

    %% Connections
    ESP -- "Sends Data\n(Every 1s)" --> API
    API -- "Saves Data" --> DB
    API -- "Updates Dashboard\n(Real-Time)" --> UI
    
    %% Actuation Feedback
    API -. "Triggers Alarms" .-> ESP
```

## System Components

### 1. Hardware Tier (ESP32)
Simulated in Wokwi, each Zone has a dedicated ESP32 microcontroller reading from analog potentiometers (Fire, Gas, Water) and digital inputs (PIR button). 
- **Data Push:** It bundles these readings into a JSON payload and makes an HTTP POST request to the backend every 1 second.
- **Actuation Loop (TC5):** Instead of polling a separate endpoint, the ESP32 parses the JSON response of its own POST request to instantly trigger local hardware actuators (Buzzer, Relay, LEDs).

### 2. Backend Tier (FastAPI)
The central nervous system of RoboFusion, built for high concurrency using Python's `asyncio` and `FastAPI`.
- **API Ingestion:** Receives the high-frequency sensor data, protected by API Keys (`X-Zone-API-Key`).
- **Risk Engine:** Computes a fused risk score out of 100 using static weights (`Fire: 40, Gas: 25, Water: 20, PIR: 15`).
- **ML Predictor (Bonus 3):** Analyzes the sliding window of the last 5 readings to predict imminent critical conditions, injecting up to 45 additional risk points.
- **WebSocket Manager:** Broadcasts state changes, raw telemetry, and ML predictions instantly to all connected UI clients.

### 3. Persistence Tier (PostgreSQL)
A fully normalized, highly consistent relational database.
- Uses `asyncpg` connection pooling for massive parallel inserts.
- **Schema:** Tracks `zones`, `readings` (raw telemetry), `incidents` (lifecycle of emergencies), and `events` (timeline logs).
- **Integrity (TC18):** Enforces rules like `one_active_incident_per_zone` using partial unique indexes to prevent race conditions.

### 4. Frontend Tier (Next.js & React)
A glassmorphic, highly responsive control center.
- **Live Map:** Connects to the WebSocket to animate pulsing zones in real-time.
- **Priority Queue:** Sorts incidents automatically based on the backend's fused Risk Score.
- **Natural Language Reporting (Bonus 4):** Allows staff to type plain English sentences (e.g., "Fire in the Server Room"), which the backend parses to trigger instant manual overrides.
