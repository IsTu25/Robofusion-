# RoboFusion 1.0 - Software Architecture

This document outlines the high-level architecture, data flow, and components of the RoboFusion IoT hazard monitoring system.

## Complete Architecture Diagram

The system operates on a modern, event-driven architecture utilizing WebSockets for real-time responsiveness and an ML-enhanced backend for predictive risk analysis.

```mermaid
flowchart TD
    %% Styling
    classDef hardware fill:#e74c3c,stroke:#c0392b,color:#fff,stroke-width:2px
    classDef backend fill:#2ecc71,stroke:#27ae60,color:#fff,stroke-width:2px
    classDef database fill:#3498db,stroke:#2980b9,color:#fff,stroke-width:2px
    classDef frontend fill:#9b59b6,stroke:#8e44ad,color:#fff,stroke-width:2px

    %% Components
    SENSORS(("Physical Sensors\n(Fire, Gas, Water, Motion)")):::hardware
    ESP["ESP32 Microcontrollers\n(Wokwi Simulation)"]:::hardware
    
    API["FastAPI Backend\n(Ingestion & Routing)"]:::backend
    RISK["Risk Fusion Engine\n(Weights & ML Predictor)"]:::backend
    WS["WebSocket Manager"]:::backend
    
    DB[("PostgreSQL Database\n(Incidents & History)")]:::database
    
    UI["Next.js Dashboard\n(Live Map & Alerts)"]:::frontend
    ACTUATORS(("Local Actuators\n(Relay, Buzzer, LEDs)")):::hardware

    %% Flow
    SENSORS --> ESP
    ESP -- "JSON Payload (Every 1s)" --> API
    API --> RISK
    
    RISK -- "Saves State" --> DB
    RISK -- "Broadcasts Events" --> WS
    
    WS -- "Live Updates" --> UI
    
    %% Feedback Loop
    API -. "Returns Alarm States" .-> ESP
    ESP --> ACTUATORS
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
