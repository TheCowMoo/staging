const mysql = require('mysql2/promise');

(async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'Marketingcow1!',
      database: 'safeguard'
    });
    console.log('Connected to MySQL database');
    
    const statements = [
      'ALTER TABLE `users` ADD `hasSeenWalkthrough` boolean DEFAULT false NOT NULL;',
      'ALTER TABLE `liability_scans` ADD `scorePercent` int;',
      'ALTER TABLE `liability_scans` ADD `defensibilityStatus` varchar(32);'
    ];
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await connection.execute(statements[i]);
        console.log(`Statement ${i + 1}: SUCCESS - ${statements[i]}`);
      } catch (error) {
        console.log(`Statement ${i + 1}: FAILED - ${statements[i]}`);
        console.log(`Error: ${error.message}`);
      }
    }
    
    await connection.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
})();
