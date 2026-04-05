-- Sample maintenance requests for local dev testing.
-- Run with bash: docker compose exec -T db psql -U postgres propertydb < db/sample_maintenance_requests.sql
-- Or with PowerShell, enter query in: docker compose exec db psql -U postgres propertydb

DO $$
DECLARE
  v_manager_id  UUID;
  v_tenant_id   UUID;
  v_staff_id    UUID;
  v_property_id UUID;
  v_unit_id     UUID;
  v_unit2_id    UUID;
  v_req1_id     UUID;
  v_req2_id     UUID;
BEGIN
  SELECT id INTO v_manager_id FROM users WHERE cognito_sub = '690af55c-a001-709a-7c0c-347bccdae400';
  SELECT id INTO v_tenant_id  FROM users WHERE cognito_sub = '39aa75bc-20a1-70bb-4572-59b72f856ccf';
  SELECT id INTO v_staff_id   FROM users WHERE cognito_sub = 'c96ac52c-f011-7097-f15c-ae69c75bfe6d';

  INSERT INTO properties (manager_id, name, address, city, total_units)
  VALUES (v_manager_id, 'Sutera Apartment', 'Jalan Sutera 1, Taman Sutera', 'Johor Bahru', 10)
  RETURNING id INTO v_property_id;

  INSERT INTO units (property_id, unit_number, floor, bedrooms, rent_amount, status)
  VALUES (v_property_id, 'J1-505', 5, 3, 1800.00, 'occupied')
  RETURNING id INTO v_unit_id;

  INSERT INTO units (property_id, unit_number, floor, bedrooms, rent_amount, status)
  VALUES (v_property_id, 'J1-302', 3, 2, 1500.00, 'occupied')
  RETURNING id INTO v_unit2_id;

  INSERT INTO maintenance_requests
    (unit_id, tenant_id, assigned_to, title, description, category, priority, status)
  VALUES (
    v_unit_id, v_tenant_id, v_staff_id,
    'Air conditioner not cooling',
    'The AC in the master bedroom has been making a rattling noise and is not cooling below 26°C despite being set to 20°C.',
    'hvac', 'high', 'open'
  ) RETURNING id INTO v_req1_id;

  INSERT INTO maintenance_requests
    (unit_id, tenant_id, assigned_to, title, description, category, priority, status)
  VALUES (
    v_unit_id, v_tenant_id, v_staff_id,
    'Kitchen tap leaking',
    'The kitchen tap has a steady drip even when fully closed. Started about three days ago.',
    'plumbing', 'medium', 'in_progress'
  ) RETURNING id INTO v_req2_id;

  INSERT INTO maintenance_requests
    (unit_id, tenant_id, title, description, category, priority, status)
  VALUES (
    v_unit2_id, v_tenant_id,
    'Hallway light flickering',
    'The ceiling light in the hallway flickers intermittently throughout the day.',
    'electrical', 'low', 'resolved'
  );

  INSERT INTO maintenance_requests
    (unit_id, tenant_id, title, description, category, priority, status)
  VALUES (
    v_unit2_id, v_tenant_id,
    'Emergency — gas smell in kitchen',
    'Strong gas smell near the stove area. Switched off the mains but need urgent inspection.',
    'general', 'emergency', 'open'
  );

  INSERT INTO maintenance_comments (request_id, author_id, body) VALUES
    (v_req1_id, v_tenant_id, 'This has been going on for a week now, please prioritise.'),
    (v_req1_id, v_staff_id,  'Noted. I will schedule an inspection for tomorrow morning.'),
    (v_req2_id, v_tenant_id, 'The drip is getting worse, there is now a small puddle under the sink.'),
    (v_req2_id, v_staff_id,  'Parts ordered, will fix by end of week.');
END $$;
