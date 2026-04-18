require('dotenv').config();
const auth = require('./auth');
const pool = require('./db');
const { initializeDatabaseTables } = require('./lib/database');

const randomUsers = [
  { name: 'Aarav Sharma',    email: 'aarav.sharma@gmail.com',    password: 'Pass@1234' },
  { name: 'Priya Patel',     email: 'priya.patel@gmail.com',     password: 'Pass@1234' },
  { name: 'Rohan Mehta',     email: 'rohan.mehta@gmail.com',     password: 'Pass@1234' },
  { name: 'Ananya Singh',    email: 'ananya.singh@gmail.com',    password: 'Pass@1234' },
  { name: 'Vikram Rao',      email: 'vikram.rao@gmail.com',      password: 'Pass@1234' },
  { name: 'Sneha Joshi',     email: 'sneha.joshi@gmail.com',     password: 'Pass@1234' },
  { name: 'Arjun Nair',      email: 'arjun.nair@gmail.com',      password: 'Pass@1234' },
  { name: 'Kavya Reddy',     email: 'kavya.reddy@gmail.com',     password: 'Pass@1234' },
  { name: 'Rahul Gupta',     email: 'rahul.gupta@gmail.com',     password: 'Pass@1234' },
  { name: 'Divya Kumar',     email: 'divya.kumar@gmail.com',     password: 'Pass@1234' },
  { name: 'Aditya Verma',    email: 'aditya.verma@gmail.com',    password: 'Pass@1234' },
  { name: 'Pooja Iyer',      email: 'pooja.iyer@gmail.com',      password: 'Pass@1234' },
  { name: 'Nikhil Desai',    email: 'nikhil.desai@gmail.com',    password: 'Pass@1234' },
  { name: 'Simran Kaur',     email: 'simran.kaur@gmail.com',     password: 'Pass@1234' },
  { name: 'Karan Malhotra',  email: 'karan.malhotra@gmail.com',  password: 'Pass@1234' },
  { name: 'Deepa Pillai',    email: 'deepa.pillai@gmail.com',    password: 'Pass@1234' },
  { name: 'Siddharth Bose',  email: 'siddharth.bose@gmail.com',  password: 'Pass@1234' },
  { name: 'Meera Chopra',    email: 'meera.chopra@gmail.com',    password: 'Pass@1234' },
  { name: 'Tushar Pandey',   email: 'tushar.pandey@gmail.com',   password: 'Pass@1234' },
  { name: 'Riya Saxena',     email: 'riya.saxena@gmail.com',     password: 'Pass@1234' },
];

async function seedUsers() {
  console.log('🌱 Starting user seeding...\n');
  await initializeDatabaseTables();

  let success = 0, skipped = 0, failed = 0;

  for (const user of randomUsers) {
    try {
      await auth.register(user.email, user.password, user.name);
      console.log(`✅ Created: ${user.name} (${user.email})`);
      success++;
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('already')) {
        console.log(`⏭️  Skipped (exists): ${user.email}`);
        skipped++;
      } else {
        console.log(`❌ Failed: ${user.email} — ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Created : ${success}`);
  console.log(`  ⏭️  Skipped : ${skipped}`);
  console.log(`  ❌ Failed  : ${failed}`);
  console.log(`  📦 Total   : ${randomUsers.length}`);

  await pool.end();
  process.exit(0);
}

seedUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
