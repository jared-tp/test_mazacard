const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const informacionController = require('../controllers/informacionController');
const usuariosController = require('../controllers/usuariosController');
const { estaAutenticado, soloEditorOAdmin, soloAdmin } = require('../middlewares/usuarios');

// Configuración de multer para almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Rutas públicas
router.get('/', usuariosController.mostrarLogin);
router.post('/login', usuariosController.login);
router.get('/logout', usuariosController.logout);

// Rutas protegidas
router.get('/buscar', estaAutenticado, informacionController.obtenerTodo);
router.get('/consulta', estaAutenticado, informacionController.consultaView);
router.get('/consulta/:id', estaAutenticado, informacionController.consultaPorId);
router.get('/api/ultimo-folio', informacionController.obtenerUltimoFolio);
router.get('/panelAdmin', estaAutenticado, soloAdmin, usuariosController.panelAdminView);
router.get('/gestionUsuarios', estaAutenticado, soloAdmin, usuariosController.gestionUsuariosView);
router.get('/logAdmin', estaAutenticado, soloAdmin, usuariosController.logAdminView);
router.post('/eliminar/:id', soloEditorOAdmin, soloAdmin, informacionController.eliminar);
router.get('/agregarUsuario', estaAutenticado, soloAdmin, usuariosController.agregarUsuarioView);
router.post('/registrarUsuario', estaAutenticado, soloAdmin, upload.single('imagen'), usuariosController.registrarUsuarioAdmin);
router.post('/admin/usuarios/:id/rol', soloAdmin, usuariosController.actualizarRol);
router.post('/admin/usuarios/:id/eliminar', estaAutenticado, soloAdmin, usuariosController.eliminarUsuario);

module.exports = router;