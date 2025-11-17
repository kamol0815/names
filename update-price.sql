-- Update Basic plan price to 1000 for testing
UPDATE plans SET price = 1000 WHERE name = 'Basic';

-- Verify update
SELECT id, name, price, duration FROM plans WHERE name = 'Basic';
