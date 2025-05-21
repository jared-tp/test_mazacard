const mysql = require('mysql2');

const conexion = mysql.createConnection({
    host: 'switchback.proxy.rlwy.net',
    user: 'root',              
    password: 'UYEPIyMVpvLRiaWLHEbdHLplQKyOhJXO',                           
    database: 'railway',
    port: 34481,
    ssl: {
        rejectUnauthorized: true,
    }
});

conexion.connect(error => {
    if (error) {
        console.error('Error de conexión a la base de datos:', error);
        return;
    }
    console.log('Conexión exitosa a la base de datos MazaCard_DB');
});

module.exports = conexion;
