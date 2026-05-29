-- CareConnect NGO Donation Management System (PostgreSQL)

CREATE DATABASE careconnect;

-- Connect to DB manually in pgAdmin or psql
-- \c careconnect

-- Admins
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admins (username, email, password) VALUES
('admin1', 'admin@careconnect.org', '$2a$10$HuQZW9la6fXwM/MtKmy/r.iN1o5GfVVkMZz2J0M.Kxp4I97MNVT/K'),
('admin2', 'admin2@careconnect.org', '$2a$10$kaY0m0PKvv3mYDNW4s/aqe25/6pxm0vZ.IOb4ZhP5eqe2wLUvbhLm');

-- NGOs
CREATE TABLE ngos (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  description TEXT,
  phone VARCHAR(20),
  website VARCHAR(255),

  status VARCHAR(20)
  CHECK (status IN ('pending','approved','rejected'))
  DEFAULT 'pending',

  totalDonations DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ngos
(name, email, password, description, status, totalDonations)
VALUES
('Helping Hands','help@ngo.com','$2b$10$EOdYplQ63eyAbRyo6m9p4ezRXu4bqE3Q2ZvLDg.Z5RcOAoQkpQ4zG','Empowering children through quality education and nutritional support.','approved',18500.00),

('Green Earth','green@ngo.com','$2b$10$EOdYplQ63eyAbRyo6m9p4ezRXu4bqE3Q2ZvLDg.Z5RcOAoQkpQ4zG','Environmental conservation and clean energy awareness programs.','pending',0.00),

('Clean Waters','clean@ngo.com','$2b$10$EOdYplQ63eyAbRyo6m9p4ezRXu4bqE3Q2ZvLDg.Z5RcOAoQkpQ4zG','Providing clean drinking water to rural communities.','approved',9200.00),

('Hope Foundation','hope@ngo.com','$2b$10$EOdYplQ63eyAbRyo6m9p4ezRXu4bqE3Q2ZvLDg.Z5RcOAoQkpQ4zG','Healthcare access and medical support for underprivileged families.','pending',0.00);

-- Requirements
CREATE TABLE requirements (
  id SERIAL PRIMARY KEY,

  ngo_id INTEGER NOT NULL REFERENCES ngos(id)
  ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  goal_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0.00,

  status VARCHAR(20)
  CHECK (status IN ('active','completed','cancelled'))
  DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO requirements
(ngo_id, title, description, goal_amount, current_amount)
VALUES
(1,'Food Supplies','Monthly groceries for 50 children in our care.',30000.00,18000.00),

(1,'Education Materials','Books, stationery and uniforms for 100 students.',15000.00,9500.00),

(1,'Medical Equipment','First-aid kits and basic diagnostics for health camp.',25000.00,0.00),

(3,'Water Purifiers','10 RO purifiers for 10 villages in Rajasthan.',50000.00,22000.00),

(3,'Pipeline Repair','Repair damaged water pipelines in 3 districts.',40000.00,5000.00);

-- Donations
CREATE TABLE donations (
  id SERIAL PRIMARY KEY,

  ngo_id INTEGER REFERENCES ngos(id),

  requirement_id INTEGER REFERENCES requirements(id),

  donor_name VARCHAR(255) NOT NULL,
  donor_email VARCHAR(255) NOT NULL,
  donor_phone VARCHAR(20),

  amount DECIMAL(10,2) NOT NULL,
  message TEXT,

  status VARCHAR(20)
  CHECK (status IN ('pending','completed','failed'))
  DEFAULT 'pending',

  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(512),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO donations
(ngo_id, requirement_id, donor_name, donor_email, amount, status, razorpay_payment_id)
VALUES
(1,1,'Rahul Sharma','rahul@example.com',2000.00,'completed','pay_test_001'),

(1,2,'Priya Agarwal','priya@example.com',5000.00,'completed','pay_test_002'),

(3,4,'Arjun Kumar','arjun@example.com',1500.00,'completed','pay_test_003'),

(3,NULL,'Sneha Mehta','sneha@example.com',8000.00,'completed','pay_test_004'),

(1,NULL,'Vikram Rao','vikram@example.com',2500.00,'completed','pay_test_005');

-- Trigger Function
CREATE OR REPLACE FUNCTION update_donation_totals()
RETURNS TRIGGER AS $$
BEGIN

  IF NEW.requirement_id IS NOT NULL
     AND NEW.status = 'completed' THEN

    UPDATE requirements
    SET current_amount = current_amount + NEW.amount
    WHERE id = NEW.requirement_id;

  END IF;

  IF NEW.status = 'completed' THEN

    UPDATE ngos
    SET totalDonations = totalDonations + NEW.amount
    WHERE id = NEW.ngo_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER after_donation_insert
AFTER INSERT ON donations
FOR EACH ROW
EXECUTE FUNCTION update_donation_totals();