const pool = require('./db');

const verifyData = async () => {
  try {
    console.log('\n📊 Verifying NeonDB Data Import...\n');
    
    const states = await pool.query('SELECT COUNT(*) FROM states');
    const districts = await pool.query('SELECT COUNT(*) FROM districts');
    const subdistricts = await pool.query('SELECT COUNT(*) FROM subdistricts');
    const villages = await pool.query('SELECT COUNT(*) FROM villages');
    
    console.log(`✓ States:        ${states.rows[0].count}`);
    console.log(`✓ Districts:     ${districts.rows[0].count}`);
    console.log(`✓ Subdistricts:  ${subdistricts.rows[0].count}`);
    console.log(`✓ Villages:      ${villages.rows[0].count}`);
    
    console.log('\n📍 Sample States:');
    const sampleStates = await pool.query('SELECT * FROM states LIMIT 5');
    sampleStates.rows.forEach(s => console.log(`  • ${s.state_name}`));
    
    console.log('\n✅ Data verification complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

verifyData();
