const pool = require('./db');

const createTables = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS states (
        state_code VARCHAR(10) PRIMARY KEY,
        state_name VARCHAR(100) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS districts (
        district_code VARCHAR(10) PRIMARY KEY,
        district_name VARCHAR(100) NOT NULL,
        state_code VARCHAR(10) REFERENCES states(state_code)
      );
      CREATE TABLE IF NOT EXISTS subdistricts (
        subdistrict_code VARCHAR(10) PRIMARY KEY,
        subdistrict_name VARCHAR(100) NOT NULL,
        district_code VARCHAR(10) REFERENCES districts(district_code)
      );
      CREATE TABLE IF NOT EXISTS villages (
        village_code VARCHAR(10) PRIMARY KEY,
        village_name VARCHAR(100) NOT NULL,
        subdistrict_code VARCHAR(10) REFERENCES subdistricts(subdistrict_code)
      );
    `;
    
    await pool.query(query);
    console.log('✅ Tables created successfully on NeonDB!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating tables:', err);
    process.exit(1);
  }
};

createTables();
