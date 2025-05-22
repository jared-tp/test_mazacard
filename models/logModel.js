const db = require('../db');

const logModel = {
  registrar: (usuario_id, accion, descripcion, callback) => {
    const now = new Date();
    const offsetMazatlan = 7 * 60 * 60 * 1000; 
    const localTime = new Date(now.getTime() - offsetMazatlan);
    const formattedTime = localTime.toISOString().slice(0, 19).replace('T', ' ');
    
    const sql = 'INSERT INTO log_actividad (usuario_id, accion, descripcion, fecha) VALUES (?, ?, ?, ?)';
    db.query(sql, [usuario_id, accion, descripcion, formattedTime], callback);
  },

  obtenerLogs: (callback) => {
    const sql = `
      SELECT l.*, u.username, u.rol
      FROM log_actividad l
      JOIN usuarios u ON l.usuario_id = u.id
      ORDER BY l.fecha DESC
    `;
    db.query(sql, callback);
  }
};

module.exports = logModel;