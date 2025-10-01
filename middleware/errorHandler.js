function errorHandler(err, req, res, next) {
    // Error personalizado
    if (err.statusCode && err.message) {
        return res.status(err.statusCode).json({ mensaje: err.message });
    }
    // Error genérico
    res.status(500).json({ mensaje: 'Error interno del servidor. Por favor, intente más tarde.' });
}

module.exports = errorHandler;
