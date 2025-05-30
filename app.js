require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const conexion = require('./db');
const informacionRoute = require('./routes/informacionRoute');
const misRutas = require('./routes/main');
const session = require('express-session');

const app = express();

const upload = multer({ dest: 'public/uploads/' });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
     secret: 'imju123',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rutas
app.use('/', misRutas);
app.use('/api', informacionRoute);
app.use('/admin', misRutas);

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en http://localhost:${PUERTO}`);
});