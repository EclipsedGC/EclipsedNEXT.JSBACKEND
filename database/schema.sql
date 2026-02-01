-- Next.js Backend Database Schema
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS nextjs_backend;
USE nextjs_backend;

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2),
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_created_at (created_at)
);

-- Example: Insert some sample data
INSERT INTO items (name, description, price, stock) VALUES
('Sample Item 1', 'This is a sample item description', 29.99, 100),
('Sample Item 2', 'Another sample item', 49.99, 50),
('Sample Item 3', 'Yet another sample', 19.99, 200)
ON DUPLICATE KEY UPDATE name=name;
