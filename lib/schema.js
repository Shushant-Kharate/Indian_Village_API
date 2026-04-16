/**
 * Database Schema Migration
 * Run this to initialize all required tables for the Village API
 */

const { pool } = require('./database');

const initializeSchema = async () => {
  try {
    console.log('🔄 Initializing database schema...');

    // 1. Users table (enhanced)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        businessName VARCHAR(255) NOT NULL,
        gstNumber VARCHAR(50),
        address TEXT,
        phone VARCHAR(20),
        plan VARCHAR(50) DEFAULT 'free',
        status VARCHAR(50) DEFAULT 'pending',
        role VARCHAR(50) DEFAULT 'user',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        subscription_status VARCHAR(50),
        approvalNotes TEXT,
        rejectionReason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP,
        CONSTRAINT plan_check CHECK (plan IN ('free', 'premium', 'pro', 'unlimited')),
        CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected')),
        CONSTRAINT role_check CHECK (role IN ('user', 'admin'))
      );
    `);
    console.log('✓ Users table ready');

    // 2. API Keys table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        key VARCHAR(255) UNIQUE NOT NULL,
        secret VARCHAR(255) NOT NULL,
        monthly_requests INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used TIMESTAMP,
        rotated_at TIMESTAMP,
        CONSTRAINT api_key_length CHECK (LENGTH(key) > 20)
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
    `);
    console.log('✓ API Keys table ready');

    // 3. API Usage Tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_usage (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        requests_count INT DEFAULT 0,
        requests_limit INT,
        exceeded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT user_date_unique UNIQUE (user_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(date);
    `);
    console.log('✓ API Usage table ready');

    // 4. API Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status INT,
        response_time INT,
        request_size INT,
        response_size INT,
        error_message TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        CONSTRAINT method_check CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH'))
      );
      CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
    `);
    console.log('✓ API Logs table ready');

    // 5. Audit Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);
    console.log('✓ Audit Logs table ready');

    // 6. State Access Control table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS state_access (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        state_id INT NOT NULL,
        state_name VARCHAR(100),
        granted_at TIMESTAMP DEFAULT NOW(),
        granted_by UUID REFERENCES users(id),
        granted_notes TEXT,
        CONSTRAINT user_state_unique UNIQUE (user_id, state_id)
      );
      CREATE INDEX IF NOT EXISTS idx_state_access_user_id ON state_access(user_id);
    `);
    console.log('✓ State Access table ready');

    // 7. Payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_invoice_id VARCHAR(255),
        stripe_payment_intent_id VARCHAR(255),
        amount INT NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status VARCHAR(50),
        plan VARCHAR(50),
        billing_period_start TIMESTAMP,
        billing_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT amount_positive CHECK (amount > 0),
        CONSTRAINT status_check CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled'))
      );
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
    `);
    console.log('✓ Payments table ready');

    // 8. Rate Limit Rules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_rules (
        id UUID PRIMARY KEY,
        plan VARCHAR(50) NOT NULL UNIQUE,
        daily_limit INT NOT NULL,
        burst_limit INT NOT NULL,
        burst_window INT DEFAULT 60,
        state_access_limit INT,
        api_key_limit INT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_plan ON rate_limit_rules(plan);
    `);
    console.log('✓ Rate Limit Rules table ready');

    // 9. Insert default rate limit rules
    await pool.query(`
      INSERT INTO rate_limit_rules (id, plan, daily_limit, burst_limit, burst_window, state_access_limit, api_key_limit)
      VALUES 
        ('00000000-0000-0000-0000-000000000001'::uuid, 'free', 5000, 100, 60, 1, 2),
        ('00000000-0000-0000-0000-000000000002'::uuid, 'premium', 50000, 500, 60, 5, 5),
        ('00000000-0000-0000-0000-000000000003'::uuid, 'pro', 300000, 2000, 60, 28, 10),
        ('00000000-0000-0000-0000-000000000004'::uuid, 'unlimited', 1000000, 5000, 60, 28, 20)
      ON CONFLICT (plan) DO NOTHING;
    `);
    console.log('✓ Default rate limit rules inserted');

    // 10. Email Queue table (for async sending)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        template VARCHAR(100) NOT NULL,
        template_data JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        failed_at TIMESTAMP,
        failure_reason TEXT,
        retry_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT status_check CHECK (status IN ('pending', 'sent', 'failed', 'skipped'))
      );
      CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
    `);
    console.log('✓ Email Queue table ready');

    // 11. Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    `);
    console.log('✓ Indexes created');

    console.log('✅ Database schema initialized successfully!');
    return true;
  } catch (err) {
    console.error('❌ Schema initialization failed:', err.message);
    throw err;
  }
};

module.exports = {
  initializeSchema
};
