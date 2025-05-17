const mysql = require('mysql2');

const conexion = mysql.createConnection({
    host: 'switchback.proxy.rlwy.net',
    user: 'root',              
    password: 'HkIvltnuNKdrNvRKfynybUEprMkdipqn',              
    database: 'railway',
    port: 33206
});

conexion.connect(error => {
    if (error) {
        console.error('Error de conexión a la base de datos:', error);
        return;
    }
    console.log('Conexión exitosa a la base de datos MazaCard_DB');
});

module.exports = conexion;
