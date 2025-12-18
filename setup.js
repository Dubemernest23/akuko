require('dotenv').config();
const database = require('./config/database');

async function setup() {
  console.log('🚀 Akuko Blog Setup');
  console.log('===================\n');
  
  try {
    await database.initialize();
    await database.setupSchema();
    
    console.log('\n✅ Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Start development server: npm run dev');
    console.log('2. Visit: http://localhost:3000');
    console.log('3. Admin panel: http://localhost:3000/admin');
    console.log('4. Login with credentials shown above');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();