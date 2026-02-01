-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS EclipsedGC;
USE EclipsedGC;

-- Create test table with transaction_id and amount
CREATE TABLE IF NOT EXISTS test (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_created_at (created_at)
);

-- Example: Insert some sample data
INSERT INTO test (transaction_id, amount) VALUES
('txn-001', 100.50),
('txn-002', 250.75),
('txn-003', 50.00)
ON DUPLICATE KEY UPDATE transaction_id=transaction_id;
