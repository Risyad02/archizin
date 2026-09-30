-- src/database/migrations/0004_seed_status_rules.sql
INSERT INTO status_rules (based_on, threshold_days, resulting_status_id, is_active)
SELECT 'tanggal_berakhir', 90, (SELECT id FROM permit_status WHERE code = 'akan_berakhir'), 1
WHERE NOT EXISTS (SELECT 1 FROM status_rules WHERE threshold_days = 90);

INSERT INTO status_rules (based_on, threshold_days, resulting_status_id, is_active)
SELECT 'tanggal_berakhir', 60, (SELECT id FROM permit_status WHERE code = 'akan_berakhir'), 1
WHERE NOT EXISTS (SELECT 1 FROM status_rules WHERE threshold_days = 60);

INSERT INTO status_rules (based_on, threshold_days, resulting_status_id, is_active)
SELECT 'tanggal_berakhir', 30, (SELECT id FROM permit_status WHERE code = 'akan_berakhir'), 1
WHERE NOT EXISTS (SELECT 1 FROM status_rules WHERE threshold_days = 30);

INSERT INTO status_rules (based_on, threshold_days, resulting_status_id, is_active)
SELECT 'tanggal_berakhir', 14, (SELECT id FROM permit_status WHERE code = 'akan_berakhir'), 1
WHERE NOT EXISTS (SELECT 1 FROM status_rules WHERE threshold_days = 14);

INSERT INTO status_rules (based_on, threshold_days, resulting_status_id, is_active)
SELECT 'tanggal_berakhir', 7, (SELECT id FROM permit_status WHERE code = 'akan_berakhir'), 1
WHERE NOT EXISTS (SELECT 1 FROM status_rules WHERE threshold_days = 7);