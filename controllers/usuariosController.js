const bcrypt = require('bcrypt');
const saltRounds = 10;

const usuariosController = {
    mostrarLogin: (req, res) => {
        res.render('index', { error: req.query.error });
    },

    login: (req, res) => {
        const { usuario, clave } = req.body;
        const conexion = require('../db');
        
        conexion.query('SELECT * FROM usuarios WHERE username = ?', [usuario], (err, resultados) => {
            if (err) {
                console.error('Error al buscar usuario:', err);
                return res.redirect('/?error=Error en el servidor');
            }
            
            if (resultados.length === 0) {
                return res.redirect('/?error=Usuario o contraseña incorrectos');
            }
            
            const usuarioDB = resultados[0];
            
            bcrypt.compare(clave, usuarioDB.password, (err, result) => {
                if (err || !result) {
                    return res.redirect('/?error=Usuario o contraseña incorrectos');
                }
                
                req.session.usuario = usuarioDB;
                const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
                conexion.query('UPDATE usuarios SET ultima_conexion = ? WHERE id = ?', [now, usuarioDB.id]);
                res.redirect('/buscar');
            });
        });
    },

    mostrarRegistro: (req, res) => {
        res.render('registro', { error: req.query.error });
    },

    registrar: (req, res) => {
        const { usuario, clave, confirmar_clave } = req.body;
        
        if (clave !== confirmar_clave) {
            return res.redirect('/registro?error=Las contraseñas no coinciden');
        }
        
        bcrypt.hash(clave, saltRounds, (err, hash) => {
            if (err) {
                console.error('Error al hashear contraseña:', err);
                return res.redirect('/registro?error=Error en el servidor');
            }
            
            const conexion = require('../db');
            conexion.query('INSERT INTO usuarios (username, password) VALUES (?, ?)', 
                [usuario, hash], 
                (err, resultados) => {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.redirect('/registro?error=El nombre de usuario ya existe');
                        }
                        console.error('Error al registrar usuario:', err);
                        return res.redirect('/registro?error=Error al registrar usuario');
                    }
                    
                    res.redirect('/?success=Usuario registrado correctamente');
                });
        });
    },

    registrarUsuarioAdmin: (req, res) => {
        const { usuario, clave, confirmar_clave, rol } = req.body;
        const imagen = req.file ? req.file.filename : null;

        if (!usuario || !clave || !confirmar_clave || !rol) {
            return res.render('agregarUsuario', { error: 'Todos los campos son obligatorios' });
        }

        if (clave !== confirmar_clave) {
            return res.render('agregarUsuario', { error: 'Las contraseñas no coinciden' });
        }

        bcrypt.hash(clave, saltRounds, (err, hash) => {
            if (err) {
                console.error('Error al hashear la contraseña:', err);
                return res.render('agregarUsuario', { error: 'Error al procesar la contraseña' });
            }

            const conexion = require('../db');
            const fecha_creacion = new Date().toISOString().slice(0, 10); // formato YYYY-MM-DD

            const sql = `INSERT INTO usuarios (username, password, fecha_creacion, rol, imagen) VALUES (?, ?, ?, ?, ?)`;
            const valores = [usuario, hash, fecha_creacion, rol, imagen];

            conexion.query(sql, valores, (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.render('agregarUsuario', { error: 'El nombre de usuario ya existe' });
                    }
                    console.error('Error al registrar el usuario:', err);
                    return res.render('agregarUsuario', { error: 'Error al registrar el usuario' });
                }

                res.redirect('/gestionUsuarios');
            });
        });
    },

    logout: (req, res) => {
        req.session.destroy(err => {
            if (err) {
                console.error('Error al cerrar sesión:', err);
            }
            res.redirect('/');
        });
    },

    eliminarUsuario: (req, res) => {
        const usuarioId = req.params.id;
        const conexion = require('../db');

        const sql = 'DELETE FROM usuarios WHERE id = ?';

        conexion.query(sql, [usuarioId], (err, resultado) => {
            if (err) {
                console.error('Error al eliminar usuario:', err);
                return res.redirect('/gestionUsuarios?mensaje=Error al eliminar usuario');
            }

            if (resultado.affectedRows === 0) {
                return res.redirect('/gestionUsuarios?mensaje=Usuario no encontrado');
            }

            res.redirect('/gestionUsuarios?mensaje=Usuario eliminado correctamente');
        });
    },


    panelAdminView: (req, res) => {
        res.render('panelAdmin', { usuario: req.session.usuario });
    },

    gestionUsuariosView: (req, res) => {
        const sql = 'SELECT id, username, rol, imagen, fecha_creacion, ultima_conexion FROM usuarios';
        const conexion = require('../db');

        conexion.query(sql, (err, results) => {
            if (err) {
            console.error('Error al obtener usuarios:', err);
            return res.status(500).send('Error al cargar usuarios');
        }

        res.render('gestionUsuarios', {
            usuario: req.session.usuario,
            usuarios: results,
            mensaje: req.query.mensaje || null
            });
        });
    },

    agregarUsuarioView: (req, res) => {
        res.render('agregarUsuario', { error: null });
    },

    logAdminView: (req, res) => {
        const conexion = require('../db');
        const sql = `
            SELECT l.id, u.username, l.accion, l.fecha, l.descripcion
            FROM log_actividad l
            JOIN usuarios u ON l.usuario_id = u.id
            ORDER BY l.fecha DESC
        `;

        conexion.query(sql, (err, results) => {
            if (err) {
                console.error('Error al obtener el log de la actividad: ', err);
                return res.status(500).send('Error al cargar el log de la actividad');
            }

            res.render('logAdmin', {
                usuario: req.session.usuario,
                logs: results
            });
        });   
    },

    actualizarRol: (req, res) => {
        const { id } = req.params;
        const nuevoRol = req.body.rol;

        const conexion = require('../db');

        // Primero obtenemos el rol actual
        conexion.query('SELECT rol FROM usuarios WHERE id = ?', [id], (err, resultados) => {
            if (err) {
                console.error('Error al buscar el usuario:', err);
                return res.status(500).send('Error en el servidor');
            }

            if (resultados.length === 0) {
                return res.status(404).send('Usuario no encontrado');
            }

            const rolActual = resultados[0].rol;

            if (rolActual === nuevoRol) {
                // No hay cambios, redirige simplemente
                return res.redirect('/gestionUsuarios');
            }

            // Actualizar solo si hay cambios
            conexion.query('UPDATE usuarios SET rol = ? WHERE id = ?', [nuevoRol, id], (err2) => {
                if (err2) {
                    console.error('Error al actualizar el rol:', err2);
                    return res.status(500).send('Error al actualizar el rol');
                }

                res.redirect('/gestionUsuarios?mensaje=Rol actualizado correctamente');
            });
        });
    }
};

module.exports = usuariosController;