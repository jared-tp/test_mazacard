const db = require('../db');

const logModel = {
  registrar: (usuario_id, accion, descripcion, callback) => {
    const sql = 'INSERT INTO log_actividad (usuario_id, accion, descripcion, fecha) VALUES (?, ?, ?, NOW())';
    db.query(sql, [usuario_id, accion, descripcion], callback);
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