// scripts/backup.js - Create database backup
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const DAPBASE_PATH = path.join(__dirname, '..', 'Dapbase', 'akuko');
const BACKUPS_PATH = path.join(__dirname, '..', 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_PATH)) {
  fs.mkdirSync(BACKUPS_PATH, { recursive: true });
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUPS_PATH, `backup-${timestamp}.zip`);
  
  const output = fs.createWriteStream(backupFile);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Backup created: ${backupFile}`);
      console.log(`📦 Size: ${sizeMB} MB`);
      resolve(backupFile);
    });
    
    archive.on('error', reject);
    
    archive.pipe(output);
    
    // Add database files
    archive.directory(DAPBASE_PATH, 'akuko');
    
    // Add uploads
    const uploadsPath = path.join(__dirname, '..', 'uploads');
    if (fs.existsSync(uploadsPath)) {
      archive.directory(uploadsPath, 'uploads');
    }
    
    archive.finalize();
  });
}

// Run backup
console.log('🔄 Creating backup...');
createBackup()
  .then(() => {
    console.log('✨ Backup complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Backup failed:', err.message);
    process.exit(1);
  });