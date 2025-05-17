const express = require('express');
const router = express.Router();
const informacionController = require('../controllers/informacionController');
const usuariosController = require('../controllers/usuariosController');
const { estaAutenticado } = require('../middlewares/usuarios');

// Rutas públicas
router.get('/', usuariosController.mostrarLogin);
router.get('/registro', usuariosController.mostrarRegistro);
router.post('/login', usuariosController.login);
router.post('/registro', usuariosController.registrar);
router.get('/logout', usuariosController.logout);

// Rutas protegidas
router.get('/buscar', estaAutenticado, informacionController.obtenerTodo);
router.get('/consulta', estaAutenticado, informacionController.consultaView);
router.get('/consulta/:id', estaAutenticado, informacionController.consultaPorId);
  
module.exports = router;
