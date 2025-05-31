const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const informacionController = require('../controllers/informacionController');
const { estaAutenticado, soloEditorOAdmin } = require('../middlewares/usuarios.js');

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

// Protege todas las rutas
router.use(estaAutenticado);

// Rutas
router.get('/informacion', informacionController.obtenerTodo);
router.get('/consulta', informacionController.consultaView);  
router.get('/buscar', informacionController.encontrarPorNombreOCurp);
router.get('/api/ultimo-folio', informacionController.obtenerUltimoFolio);
router.get('/consulta/:id', informacionController.consultaPorId);
router.get('/exportar-excel/:id', informacionController.exportarExcel);
router.get('/exportar-excel-fecha', informacionController.exportarExcelPorFecha);
router.get('/exportar-excel-rango-fechas', informacionController.exportarExcelPorRangoFechas);
router.post('/guardar', upload.single('fotografia'), informacionController.guardar);
router.post('/actualizar', upload.single('fotografia'), informacionController.actualizar);
router.post('/eliminar/:id', soloEditorOAdmin, informacionController.eliminar);


module.exports = router;