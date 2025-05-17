module.exports = {
    estaAutenticado: (req, res, next) => {
        if (req.session.usuario) {
            return next();
        }
        res.redirect('/');
    }
};