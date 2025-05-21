module.exports = {
    estaAutenticado: (req, res, next) => {
        if (req.session.usuario) {
            return next();
        }
        
        res.redirect('/');
    },

    soloAdmin: (req, res, next) => {
        if (req.session.usuario?.rol === 'admin') {
            return next();
        }

        return res.status(403).send('Acceso denegado.');
    },

    soloEditorOAdmin: (req, res, next) => {
        const rol = req.session.usuario?.rol;

        if (rol === 'editor' || rol === 'admin') {
            return next();
        }

        return res.status(403).send('Acceso denegado.');
    }
};