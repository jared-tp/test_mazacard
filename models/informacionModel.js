const db = require('../db');

const informacionModel = {
  obtenerTodo: (callback) => {
    const sql = 'SELECT * FROM informacion';
    db.query(sql, callback);
  },

  obtenerId: (id, callback) => {
    const sql = 'SELECT * FROM informacion WHERE id = ?';
    db.query(sql, [id], callback);
  },

  actualizar: (id, datos, callback) => {
    const campos = [
      'folio', 'nombre', 'apellido_paterno', 'apellido_materno', 'curp',
      'fecha_expedicion', 'fecha_expiracion', 'telefono', 'correo_electronico'
    ];
  
    let query = 'UPDATE informacion SET ';
    const valores = [];
  
    campos.forEach(campo => {
      query += `${campo} = ?, `;
      valores.push(datos[campo]);
    });
  
    if (datos.fotografia) {
      query += 'fotografia = ?, ';
      valores.push(datos.fotografia);
    }
  
    query = query.slice(0, -2); 
    query += ' WHERE id = ?';
    valores.push(id);
  
    db.query(query, valores, callback);
  },
  
  encontrarPorNombreOCurp: (searchTerm, callback) => {
    const sql = `SELECT * FROM informacion WHERE nombre LIKE ? OR curp LIKE ?`;
    const term = `%${searchTerm}%`;
    db.query(sql, [term, term], callback);
  },

  insertar: (data, callback) => {
    const sql = `INSERT INTO informacion 
                (folio, nombre, apellido_paterno, apellido_materno, curp, 
                 fecha_expedicion, fecha_expiracion, fotografia, telefono, correo_electronico)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
      data.folio,
      data.nombre,
      data.apellido_paterno,
      data.apellido_materno,
      data.curp,
      data.fecha_expedicion,
      data.fecha_expiracion,
      data.fotografia,
      data.telefono,
      data.correo_electronico
    ];

    db.query(sql, values, callback);
  }
};

module.exports = informacionModel;
