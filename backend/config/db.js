const mysql = require('mysql2/promise');
const config = require('./env');

const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
});

pool.getConnection()
    .then((conn) => {
        console.log('✅ MySQL connected successfully');
        conn.release();
    })
    .catch((err) => {
        console.error('❌ MySQL connection failed:', err.message);
    });

module.exports = pool;
