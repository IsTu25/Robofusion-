-- Passwords are 'password'
INSERT INTO users_roles (username, password_hash, role) VALUES
    ('admin', '$2b$12$v3lbkCxNrhEopxKddLigp.S5hzxDrBDEpEPs7jR8ffdEVQZ9ZDRI.', 'admin'),
    ('staff1', '$2b$12$v3lbkCxNrhEopxKddLigp.S5hzxDrBDEpEPs7jR8ffdEVQZ9ZDRI.', 'staff');

INSERT INTO zones (id, name, api_key) VALUES
    (1, 'IoT Lab', 'key_iot_123'),
    (2, 'Server Room', 'key_server_456'),
    (3, 'Data Science Lab', 'key_data_789');

INSERT INTO sensors (zone_id, sensor_type, pin_config) VALUES
    (1, 'fire', 'D2'), (1, 'gas', 'A0'), (1, 'water', 'A1'), (1, 'pir', 'D3'),
    (2, 'fire', 'D2'), (2, 'gas', 'A0'), (2, 'water', 'A1'), (2, 'pir', 'D3'),
    (3, 'fire', 'D2'), (3, 'gas', 'A0'), (3, 'water', 'A1'), (3, 'pir', 'D3');

-- Initialize the hazard state for the seeded zones
INSERT INTO zone_hazard_state (zone_id) VALUES
    (1), (2), (3);

SELECT setval('zones_id_seq', (SELECT MAX(id) FROM zones));
SELECT setval('sensors_id_seq', (SELECT MAX(id) FROM sensors));
