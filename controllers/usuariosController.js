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

    logout: (req, res) => {
        req.session.destroy(err => {
            if (err) {
                console.error('Error al cerrar sesión:', err);
            }
            res.redirect('/');
        });
    }
};

module.exports = usuariosController;