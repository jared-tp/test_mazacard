const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,              
    password: process.env.DB_PASSWORD,                           
    database: process.env.DB_NAME,
    port: 49787,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error de conexión a la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos MazaCard_DB (pool)');
    connection.release(); 
});

module.exports = pool;
