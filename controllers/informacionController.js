const informacionModel = require('../models/informacionModel');
const logModel = require('../models/logModel');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

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
      
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const prefix = `0${yearSuffix}`;
    
      const conexion = require('../db');
      conexion.query(
        `SELECT MAX(CAST(SUBSTRING(folio, 4) AS UNSIGNED)) AS lastFolio 
        FROM informacion WHERE folio LIKE '${prefix}%'`,
        (err, result) => {
          const lastSequential = result[0]?.lastFolio || 0;
          const nextFolio = `${prefix}${String(lastSequential + 1).padStart(3, '0')}`;
        
          res.render('consulta', { 
            persona: {}, 
            nextFolio 
          });
        }
      );
      return;
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
    
    if (!id || !req.body.nombre || !req.body.curp) {
        return res.status(400).send('Faltan campos obligatorios');
    }

    const curp = req.body.curp.toUpperCase();
    const conexion = require('../db');

    conexion.query('SELECT id FROM informacion WHERE curp = ? AND id != ?', [curp, id], (err, resultados) => {
        if (err) {
            console.error('Error al verificar CURP:', err);
            return res.status(500).send('Error al verificar datos');
        }

        if (resultados.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'La CURP ya está registrada en otro registro del sistema' 
            });
        } else {
            conexion.query('SELECT * FROM informacion WHERE id = ?', [id], (err, resultado) => {
                if (err || resultado.length === 0) {
                    console.error('Error al obtener datos anteriores:', err);
                    return res.status(500).send('Error interno');
                }

                const datosAnteriores = resultado[0];
                const cambios = [];
                const nombreCompleto = `${datosAnteriores.nombre} ${datosAnteriores.apellido_paterno} ${datosAnteriores.apellido_materno}`.trim();

                const compararFechas = (fechaForm, fechaBD) => {
                    if (!fechaForm && !fechaBD) return true;
                    if (!fechaForm || !fechaBD) return false;
                    
                    const fechaFormNormalizada = new Date(fechaForm).toISOString().split('T')[0];
                    const fechaBDNormalizada = new Date(fechaBD).toISOString().split('T')[0];
                    
                    return fechaFormNormalizada === fechaBDNormalizada;
                };

                const personaActualizada = {
                    nombre: req.body.nombre,
                    apellido_paterno: req.body.apellido_paterno || '',
                    apellido_materno: req.body.apellido_materno || '',
                    curp: curp,
                    fecha_expedicion: req.body.fecha_expedicion || null,
                    fecha_expiracion: req.body.fecha_expiracion || null,
                    telefono: req.body.telefono || '',
                    correo_electronico: req.body.correo_electronico || '',
                    direccion: req.body.direccion || ''
                };

                const cambioNombre = req.body.nombre !== datosAnteriores.nombre || 
                                   req.body.apellido_paterno !== datosAnteriores.apellido_paterno || 
                                   req.body.apellido_materno !== datosAnteriores.apellido_materno;

                if (cambioNombre) {
                    const nombreAnterior = `${datosAnteriores.nombre} ${datosAnteriores.apellido_paterno} ${datosAnteriores.apellido_materno}`.trim();
                    const nuevoNombre = `${req.body.nombre} ${req.body.apellido_paterno} ${req.body.apellido_materno}`.trim();
                    cambios.push(`nombre (de "${nombreAnterior}" a "${nuevoNombre}")`);
                }

                if (req.body.curp !== datosAnteriores.curp) cambios.push('CURP');
                if (req.body.telefono !== datosAnteriores.telefono) cambios.push('teléfono');
                if (req.body.correo_electronico !== datosAnteriores.correo_electronico) cambios.push('correo electrónico');
                if (req.body.direccion !== datosAnteriores.direccion) cambios.push('direccion');

                if (!compararFechas(req.body.fecha_expedicion, datosAnteriores.fecha_expedicion)) {
                    cambios.push('fecha de expedición');
                }

                if (!compararFechas(req.body.fecha_expiracion, datosAnteriores.fecha_expiracion)) {
                    cambios.push('fecha de expiración');
                }

                if (req.file) {
                    personaActualizada.fotografia = `${datosAnteriores.folio}.${req.file.filename.split('.').pop()}`;
                    cambios.push('fotografia');
                }

                if (cambios.length === 0) {
                    return res.redirect('/buscar?sinCambios=1');
                }

                informacionModel.actualizar(id, personaActualizada, (error, resultado) => {
                    if (error) {
                        console.error('Error al actualizar:', error);
                        if (req.file) fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
                        return res.status(500).send('Error al actualizar');
                    }

                    if (req.file && datosAnteriores.fotografia && datosAnteriores.fotografia !== 'default.jpg') {
                        fs.unlink(path.join(__dirname, '../public/uploads', datosAnteriores.fotografia), () => {});
                    }

                    if (req.file) {
                        const oldPath = path.join(__dirname, '../public/uploads', req.file.filename);
                        const newPath = path.join(__dirname, '../public/uploads', personaActualizada.fotografia);
                        fs.renameSync(oldPath, newPath);
                    }

                    const usuario = req.session.usuario;
                    let descripcion;
                    
                    if (cambios.length === 1) {
                        if (cambioNombre) {
                            descripcion = `${usuario.username} (${usuario.rol}) actualizó ${cambios[0]}`;
                        } else {
                            descripcion = `${usuario.username} (${usuario.rol}) actualizó ${cambios[0]} de ${nombreCompleto}`;
                        }
                    } else {
                        const ultimoCambio = cambios.pop();
                        const baseMsg = `${usuario.username} (${usuario.rol}) actualizó ${cambios.join(', ')} y ${ultimoCambio}`;
                        
                        descripcion = cambioNombre ? baseMsg : `${baseMsg} de ${nombreCompleto}`;
                    }

                    logModel.registrar(usuario.id, 'actualizar', descripcion, (err) => {
                        if (err) console.error('Error al registrar log:', err);
                        res.redirect('/buscar?actualizado=1');
                    });
                });
            });
        }
    });
  },

  eliminar: (req, res) => {
    const id = req.params.id;
    const conexion = require('../db');

    conexion.query('SELECT fotografia, nombre, apellido_paterno, apellido_materno FROM informacion WHERE id = ?', [id], (err, resultado) => {
        if (err || resultado.length === 0) {
            console.error('Error al obtener datos para eliminar:', err);
            return res.status(500).send('Error interno al buscar registro.');
        }
        
        const foto = resultado[0].fotografia;
    
        const nombreCompleto = `${resultado[0].nombre || ''} ${resultado[0].apellido_paterno || ''} ${resultado[0].apellido_materno || ''}`.trim();

        conexion.query('DELETE FROM informacion WHERE id = ?', [id], (error, resultado) => {
            if (error) {
                console.error('Error al eliminar el registro:', error);
                return res.status(500).send('Error al eliminar el registro.');
            }

            if (foto && foto !== 'default.jpg') {
                const rutaFoto = path.join(__dirname, '../public/uploads', foto);
                fs.unlink(rutaFoto, (err) => {
                    if (err) console.warn('No se pudo eliminar la imagen:', err);
                });
            }

            const usuario = req.session.usuario;
           
            const descripcion = `${usuario.username} (${usuario.rol}) eliminó a ${nombreCompleto}`;
            
            logModel.registrar(usuario.id, 'eliminar', descripcion, (err) => {
                if (err) console.error('Error al registrar log:', err);
                res.redirect('/buscar');
            });
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
      whereClause = `(nombre LIKE ? OR 
                     apellido_paterno LIKE ? OR 
                     apellido_materno LIKE ? OR 
                     CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) LIKE ? OR
                     curp LIKE ? OR
                     folio LIKE ?)`;
      const busquedaLike = `%${busqueda}%`;
      valores.push(
        busquedaLike, 
        busquedaLike, 
        busquedaLike, 
        busquedaLike, 
        busquedaLike,
        busquedaLike
      );
    }
  
    const sqlDatos = 
      `SELECT * FROM informacion
      WHERE ${whereClause}
      ORDER BY fecha_expedicion DESC
      LIMIT ? OFFSET ?`;
  
    const sqlConteo = 
      `SELECT COUNT(*) as total FROM informacion
      WHERE ${whereClause}`;
  
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

    const curp = req.body.curp.toUpperCase();
    const conexion = require('../db');

    conexion.query('SELECT id FROM informacion WHERE curp = ?', [curp], (err, resultados) => {
        if (err) {
            console.error('Error al verificar CURP:', err);
            return res.status(500).send('Error al verificar datos');
        }

        if (resultados.length > 0) {
            if (req.body.id && resultados[0].id == req.body.id) {
                continuarGuardado();
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: 'La CURP ya está registrada en el sistema' 
                });
            }
        } else {
            continuarGuardado();
        }
    });

    function continuarGuardado() {
        const nuevaPersona = {
            folio: req.body.folio || '',
            nombre: req.body.nombre,
            apellido_paterno: req.body.apellido_paterno || '',
            apellido_materno: req.body.apellido_materno || '',
            curp: curp,
            fecha_expedicion: req.body.fecha_expedicion || null,
            fecha_expiracion: req.body.fecha_expiracion || null,
            fotografia: req.file ? `${req.body.folio}.${req.file.filename.split('.').pop()}` : 'default.jpg',
            telefono: req.body.telefono || '',
            correo_electronico: req.body.correo_electronico || '',
            direccion: req.body.direccion || ''
        };

        informacionModel.insertar(nuevaPersona, (error, resultado) => {
            if (error) {
                console.error('Error al guardar:', error);
                
                if (req.file) {
                    fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
                }
                
                return res.status(500).send('Error al guardar los datos.');
            }

            if (req.file) {
                const oldPath = path.join(__dirname, '../public/uploads', req.file.filename);
                const newPath = path.join(__dirname, '../public/uploads', nuevaPersona.fotografia);
                fs.renameSync(oldPath, newPath);
            }
            
            const usuario = req.session.usuario;
            const nombreCompleto = `${nuevaPersona.nombre} ${nuevaPersona.apellido_paterno} ${nuevaPersona.apellido_materno}`.trim();        
            const descripcion = `${usuario.username} (${usuario.rol}) agregó a ${nombreCompleto}`;
            const nuevoId = resultado.insertId; 
            
            logModel.registrar(usuario.id, 'agregar', descripcion, (err) => {
                if (err) console.error('Error al registrar log:', err);
                res.redirect(`/consulta/${nuevoId}?success=1`);
            });
        });
    }
  },

  exportarExcel: async (req, res) => {
    try {
      const { id } = req.params;
    
      const conexion = require('../db');
      const [persona] = await conexion.promise().query(
        `SELECT nombre, apellido_paterno, apellido_materno, folio, curp, 
        fecha_expedicion, fecha_expiracion, fotografia 
        FROM informacion WHERE id = ?`, 
        [id]
      );
    
      if (!persona.length) {
        return res.status(404).json({ success: false, message: 'Persona no encontrada' });
      }
    
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Datos Persona');
    
      worksheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 20 },
        { header: 'Apellido Paterno', key: 'apellido_paterno', width: 20 },
        { header: 'Apellido Materno', key: 'apellido_materno', width: 20 },
        { header: 'Folio', key: 'folio', width: 15 },
        { header: 'CURP', key: 'curp', width: 25 },
        { header: 'Fecha expedición', key: 'fecha_expedicion', width: 15 },
        { header: 'Fecha expiración', key: 'fecha_expiracion', width: 15 },
        { header: 'Fotografía', key: 'fotografia', width: 20 }
      ];
    
      const datosPersona = persona[0];
      
      const datosParaExcel = {
        nombre: datosPersona.nombre,
        apellido_paterno: datosPersona.apellido_paterno,
        apellido_materno: datosPersona.apellido_materno,
        folio: datosPersona.folio,
        curp: datosPersona.curp,
        fecha_expedicion: datosPersona.fecha_expedicion?.toISOString().split('T')[0] || '',
        fecha_expiracion: datosPersona.fecha_expiracion?.toISOString().split('T')[0] || '',
        fotografia: datosPersona.fotografia || 'Sin foto' 
      };
    
      worksheet.addRow(datosParaExcel);
    
      worksheet.getRow(1).font = { bold: true };
      
      worksheet.columns.forEach(column => {
        column.alignment = { vertical: 'middle', horizontal: 'left' };
      });
    
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="datos_${datosPersona.nombre}_${datosPersona.folio}.xlsx"`
      );
  
      await workbook.xlsx.write(res);
      res.end();
  
      const usuario = req.session.usuario;
      const nombreCompleto = `${datosPersona.nombre} ${datosPersona.apellido_paterno} ${datosPersona.apellido_materno}`.trim();
      const descripcion = `${usuario.username} (${usuario.rol}) exportó a Excel los datos de ${nombreCompleto}`;
    
      const logModel = require('../models/logModel');
      logModel.registrar(usuario.id, 'exportar_excel', descripcion, (err) => {
        if (err) console.error('Error al registrar log:', err);
      });
    
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      res.status(500).json({ success: false, message: 'Error al generar el reporte' });
    }
  },

  exportarExcelPorFecha: async (req, res) => {
    try {
      const { fecha } = req.query;
    
      if (!fecha) {
        return res.status(400).json({ success: false, message: 'Fecha requerida' });
      }

      const fechaFormateada = new Date(fecha).toISOString().split('T')[0];
  
      const conexion = require('../db');
      const [registros] = await conexion.promise().query(
        `SELECT nombre, apellido_paterno, apellido_materno, folio, curp, 
        fecha_expedicion, fecha_expiracion, telefono, correo_electronico, direccion
        FROM informacion 
        WHERE DATE(fecha_expedicion) = ? 
        ORDER BY fecha_expedicion DESC`,
        [fechaFormateada]
      );
    
      if (!registros.length) {
        return res.status(404).json({ success: false, message: 'No hay registros para la fecha seleccionada' });
      }
    
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Registros');
    
      worksheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 20 },
        { header: 'Apellido Paterno', key: 'apellido_paterno', width: 20 },
        { header: 'Apellido Materno', key: 'apellido_materno', width: 20 },
        { header: 'Folio', key: 'folio', width: 15 },
        { header: 'CURP', key: 'curp', width: 20 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Correo', key: 'correo_electronico', width: 25 },
        { header: 'Dirección', key: 'direccion', width: 30 },
        { header: 'Fecha Expedición', key: 'fecha_expedicion', width: 15 },
        { header: 'Fecha Expiración', key: 'fecha_expiracion', width: 15 }
      ];
  
      const datosParaExcel = registros.map(registro => ({
        ...registro,
        fecha_expedicion: registro.fecha_expedicion?.toISOString().split('T')[0] || '',
        fecha_expiracion: registro.fecha_expiracion?.toISOString().split('T')[0] || ''
      }));
    
      worksheet.addRows(datosParaExcel);
  
      worksheet.getRow(1).font = { bold: true };
      worksheet.columns.forEach(column => {
        column.alignment = { vertical: 'middle', horizontal: 'left' };
      });
    
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="registros_${fechaFormateada}.xlsx"`
      );
    
      await workbook.xlsx.write(res);
      res.end();
    
      const usuario = req.session.usuario;
      const descripcion = `${usuario.username} (${usuario.rol}) exportó registros del ${fechaFormateada}`;
    
      const logModel = require('../models/logModel');
      logModel.registrar(usuario.id, 'exportar_excel', descripcion, (err) => {
        if (err) console.error('Error al registrar log:', err);
      });
    
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      res.status(500).json({ success: false, message: 'Error al generar el reporte' });
    }
  },

  exportarExcelPorRangoFechas: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
  
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Fechas requeridas' });
      }

      if (startDate > endDate) {
        return res.status(400).json({ success: false, message: 'La fecha inicial no puede ser mayor que la fecha final' });
      }

      const conexion = require('../db');
      const [registros] = await conexion.promise().query(
        `SELECT nombre, apellido_paterno, apellido_materno, folio, curp, 
        fecha_expedicion, fecha_expiracion, telefono, correo_electronico, direccion
        FROM informacion 
        WHERE DATE(fecha_expedicion) BETWEEN ? AND ?
        ORDER BY fecha_expedicion DESC`,
        [startDate, endDate]
      );
  
      if (!registros.length) {
        return res.status(404).json({ success: false, message: 'No hay registros para el rango de fechas seleccionado' });
      }
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Registros');
  
      worksheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 20 },
        { header: 'Apellido Paterno', key: 'apellido_paterno', width: 20 },
        { header: 'Apellido Materno', key: 'apellido_materno', width: 20 },
        { header: 'Folio', key: 'folio', width: 15 },
        { header: 'CURP', key: 'curp', width: 20 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Correo', key: 'correo_electronico', width: 25 },
        { header: 'Dirección', key: 'direccion', width: 30 },
        { header: 'Fecha Expedición', key: 'fecha_expedicion', width: 15 },
        { header: 'Fecha Expiración', key: 'fecha_expiracion', width: 15 }
      ];

      const datosParaExcel = registros.map(registro => ({
        ...registro,
        fecha_expedicion: registro.fecha_expedicion?.toISOString().split('T')[0] || '',
        fecha_expiracion: registro.fecha_expiracion?.toISOString().split('T')[0] || ''
      }));
  
      worksheet.addRows(datosParaExcel);

      worksheet.getRow(1).font = { bold: true };
      worksheet.columns.forEach(column => {
        column.alignment = { vertical: 'middle', horizontal: 'left' };
      });
  
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="registros_${startDate}_a_${endDate}.xlsx"`
      );
  
      await workbook.xlsx.write(res);
      res.end();
  
      const usuario = req.session.usuario;
      const descripcion = `${usuario.username} (${usuario.rol}) exportó registros del ${startDate} al ${endDate}`;
  
      const logModel = require('../models/logModel');
      logModel.registrar(usuario.id, 'exportar_excel', descripcion, (err) => {
        if (err) console.error('Error al registrar log:', err);
      });
  
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      res.status(500).json({ success: false, message: 'Error al generar el reporte' });
    }
  },

  obtenerUltimoFolio: (req, res) => {
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const prefix = `0${yearSuffix}`;

    const getLastFolio = `
      SELECT MAX(CAST(SUBSTRING(folio, 4) AS UNSIGNED)) AS lastFolio 
      FROM informacion 
      WHERE folio LIKE '${prefix}%'
    `;

    const conexion = require('../db');
    conexion.query(getLastFolio, (err, result) => {
      if (err) {
        console.error('Error al obtener último folio:', err);
        return res.status(500).json({ error: 'Error al obtener último folio' });
      }

      const lastSequential = result[0]?.lastFolio || 0;
      const newSequential = String(lastSequential + 1).padStart(3, '0');
      const newFolio = `${prefix}${newSequential}`;

      res.json({ ultimoFolio: newFolio });
    });
  }
};

module.exports = informacionController;