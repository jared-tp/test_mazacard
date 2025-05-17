const informacionModel = require('../models/informacionModel');
const fs = require('fs');
const path = require('path');

const informacionController = {
  obtenerTodo: (req, res) => {
    informacionModel.obtenerTodo((err, resultados) => {
      if (err) {
        console.error('Error al obtener la información:', err);
        return res.status(500).send('Error al obtener los registros.');
      }
      res.render('buscar', {
        registros: resultados,
        busqueda: '',
        filtro: 'todos',
        paginaActual: 1,
        totalPaginas: 1,
        usuario: req.session.usuario
      });
    });
  },

  consultaView: (req, res) => {
    const id = req.query.id;  
    if (!id) {
      return res.render('consulta', { persona: {} });
    }

    const conexion = require('../db');
    
    informacionModel.obtenerId(id, (err, resultado) => {
      if (err) {
        console.error('Error al buscar por ID:', err);
        return res.status(500).send('Error al buscar el registro.');
      }
      if (resultado.length === 0) {
        return res.status(404).send('Registro no encontrado.');
      }

      const persona = resultado[0];
      
      conexion.query(
        'SELECT id FROM informacion WHERE id < ? ORDER BY id DESC LIMIT 1',
        [id],
        (errPrev, resultadoPrev) => {
          const idAnterior = resultadoPrev[0]?.id || null;

          conexion.query(
            'SELECT id FROM informacion WHERE id > ? ORDER BY id ASC LIMIT 1',
            [id],
            (errNext, resultadoNext) => {
              const idSiguiente = resultadoNext[0]?.id || null;

              res.render('consulta', {
                persona,
                idAnterior,
                idSiguiente
              });
            }
          );
        }
      );
    });
  },

  actualizar: (req, res) => {
    const id = req.body.id;
    console.log('Entrando al controlador ACTUALIZAR');
    console.log('ID:', req.body.id);
    console.log('Nombre:', req.body.nombre);

  
    if (!id || !req.body.nombre || !req.body.curp) {
      return res.status(400).send('Faltan campos obligatorios');
    }
  
    const personaActualizada = {
      folio: req.body.folio || '',
      nombre: req.body.nombre,
      apellido_paterno: req.body.apellido_paterno || '',
      apellido_materno: req.body.apellido_materno || '',
      curp: req.body.curp,
      fecha_expedicion: req.body.fecha_expedicion || null,
      fecha_expiracion: req.body.fecha_expiracion || null,
      telefono: req.body.telefono || '',
      correo_electronico: req.body.correo_electronico || ''
    };
  
    if (req.file) {
      personaActualizada.fotografia = req.file.filename;
    }
  
    const conexion = require('../db');
    conexion.query('SELECT fotografia FROM informacion WHERE id = ?', [id], (err, resultado) => {
      if (err) {
        console.error('Error al obtener foto anterior:', err);
        return res.status(500).send('Error interno');
      }
  
      const fotoAnterior = resultado[0]?.fotografia;

      informacionModel.actualizar(id, personaActualizada, (error, resultado) => {
        if (error) {
          console.error('Error al actualizar:', error);
          if (req.file) {
            fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
          }
          return res.status(500).send('Error al actualizar');
        }
  
        if (req.file && fotoAnterior && fotoAnterior !== 'default.jpg') {
          fs.unlink(path.join(__dirname, '../public/uploads', fotoAnterior), () => {});
        }
        
        console.log("Se actualizó correctamente")
        res.redirect('/buscar?actualizado=1');
      });
    });
  },
  
  encontrarPorNombreOCurp: (req, res) => {
    const { busqueda = '', pagina = 1 } = req.query;
    const limite = 10;
    const offset = (pagina - 1) * limite;
  
    let whereClause = '1=1';
    const valores = [];
  
    if (busqueda) {
      whereClause = '(nombre LIKE ? OR curp LIKE ?)';
      valores.push(`%${busqueda}%`, `%${busqueda}%`);
    }
  
    const sqlDatos = `
      SELECT * FROM informacion
      WHERE ${whereClause}
      ORDER BY fecha_expedicion DESC
      LIMIT ? OFFSET ?
    `;
  
    const sqlConteo = `
      SELECT COUNT(*) as total FROM informacion
      WHERE ${whereClause}
    `;
  
    const conexion = require('../db');
  
    conexion.query(sqlDatos, [...valores, limite, offset], (err, resultados) => {
      if (err) {
        console.error('Error al buscar registros:', err);
        return res.status(500).render('buscar', {
          registros: [],
          busqueda,
          paginaActual: 1,
          totalPaginas: 1,
          error: 'Error al buscar registros',
          usuario: req.session.usuario
        });
      }
  
      conexion.query(sqlConteo, valores, (err, conteo) => {
        const totalRegistros = conteo?.[0]?.total || 0;
        const totalPaginas = Math.ceil(totalRegistros / limite);
  
        res.render('buscar', {
          registros: resultados,
          busqueda,
          paginaActual: parseInt(pagina),
          totalPaginas,
          usuario: req.session.usuario
        });
      });
    });
  },
  
  consultaPorId: (req, res) => {
    const idActual = parseInt(req.params.id);

    const conexion = require('../db');
    conexion.query('SELECT * FROM informacion WHERE id = ?', [idActual], (err, resultados) => {
      if (err || resultados.length === 0) {
        return res.status(404).send('Usuario no encontrado');
      }

      const persona = resultados[0];

      conexion.query('SELECT id FROM informacion WHERE id < ? ORDER BY id DESC LIMIT 1', [idActual], (errPrev, resultadoPrev) => {
        const idAnterior = resultadoPrev[0]?.id || null;

        conexion.query('SELECT id FROM informacion WHERE id > ? ORDER BY id ASC LIMIT 1', [idActual], (errNext, resultadoNext) => {
          const idSiguiente = resultadoNext[0]?.id || null;

          res.render('consulta', {
            persona,
            idAnterior,
            idSiguiente
          });
        });
      });
    });
  },

  guardar: (req, res) => {

    if (!req.body.nombre || !req.body.curp) {
      return res.status(400).send('Nombre y CURP son campos requeridos');
    }

    const nuevaPersona = {
      folio: req.body.folio || '',
      nombre: req.body.nombre,
      apellido_paterno: req.body.apellido_paterno || '',
      apellido_materno: req.body.apellido_materno || '',
      curp: req.body.curp,
      fecha_expedicion: req.body.fecha_expedicion || null,
      fecha_expiracion: req.body.fecha_expiracion || null,
      fotografia: req.file ? req.file.filename : 'default.jpg',
      telefono: req.body.telefono || '',
      correo_electronico: req.body.correo_electronico || ''
    };


    informacionModel.insertar(nuevaPersona, (error, resultado) => {
      if (error) {
        console.error('Error al guardar:', error);
      
        
        if (req.file) {
          fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
        }
        
        return res.status(500).send('Error al guardar los datos.');
      }
      
      res.redirect('/buscar');
    });
  }
};

module.exports = informacionController;