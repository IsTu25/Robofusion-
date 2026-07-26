-- 1. Users & Roles (TC17, TC13)
CREATE TABLE users_roles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('staff', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Zones
CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'SAFE' CHECK (status IN ('SAFE','WARNING','CRITICAL','OFFLINE')),
    api_key VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    override_until TIMESTAMPTZ,
    override_target_status VARCHAR(20),
    last_reading_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sensors (TC17 — explicitly required by rubric)
CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    sensor_type VARCHAR(20) NOT NULL CHECK (sensor_type IN ('fire','gas','water','pir')),
    pin_config VARCHAR(30),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(zone_id, sensor_type)
);

-- 4. Zone Hazard State (Decay/debounce, survives restarts)
CREATE TABLE zone_hazard_state (
    zone_id INTEGER PRIMARY KEY REFERENCES zones(id) ON DELETE RESTRICT,
    last_fire_high_at TIMESTAMPTZ,
    fire_decay_value FLOAT DEFAULT 0.0,
    pir_last_true_at TIMESTAMPTZ,
    pir_confirmed BOOLEAN DEFAULT false,
    debounce_fire_count INTEGER DEFAULT 0,
    last_risk_score FLOAT DEFAULT 0.0  -- For auto-resolution check
);

-- 5. Readings (sensor_id REMOVED — was unused)
CREATE TABLE readings (
    id BIGSERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    fire_raw FLOAT,
    gas_raw FLOAT,       -- NULL during 30s warmup
    water_raw FLOAT,
    pir_raw BOOLEAN,
    warmup BOOLEAN DEFAULT false,
    is_late BOOLEAN DEFAULT false,
    boot_id UUID NOT NULL,
    sequence_number INTEGER NOT NULL,
    ms_since_boot BIGINT,
    sensor_timestamp TIMESTAMPTZ,      -- NULLABLE, computed by backend
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Incidents
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('WARNING','CRITICAL')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ACKNOWLEDGED','RESOLVED')),
    hazard_types TEXT[] NOT NULL,
    risk_score_at_trigger FLOAT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX one_active_incident_per_zone ON incidents(zone_id) WHERE status IN ('ACTIVE','ACKNOWLEDGED');
CREATE INDEX idx_inc_severity_status ON incidents(severity, status, triggered_at);

-- 7. Events / Timeline (TC14b)
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id),
    incident_id INTEGER REFERENCES incidents(id),
    event_type VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    risk_score FLOAT,
    source VARCHAR(30),
    user_id INTEGER REFERENCES users_roles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_incident ON events(incident_id, created_at);
CREATE INDEX idx_events_zone ON events(zone_id, created_at);

-- 8. Acknowledgments (TC7b first-write-wins)
CREATE TABLE acknowledgments (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users_roles(id),
    acknowledged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Predictions (Bonus 3 — SEPARATE table for safety enforcement)
CREATE TABLE predictions (
    id BIGSERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id),
    predicted_critical_probability FLOAT NOT NULL,
    model_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_readings_zone_time ON readings(zone_id, received_at DESC);
CREATE INDEX idx_readings_zone_sensor_time ON readings(zone_id, sensor_timestamp DESC);
CREATE INDEX idx_inc_hazards ON incidents USING GIN(hazard_types);
