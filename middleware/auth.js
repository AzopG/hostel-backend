const jwt = require('jsonwebtoken');

// Middleware básico de autenticación
const auth = function (req, res, next) {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ msg: 'Acceso denegado. Token requerido.' });
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  if (!token) {
    return res.status(401).json({ msg: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expirado.' });
    }
    return res.status(401).json({ msg: 'Token inválido.' });
  }
};

// Middleware para verificar roles específicos
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ msg: 'Usuario no autenticado.' });
    }

    if (!roles.includes(req.usuario.tipo)) {
      return res.status(403).json({ 
        msg: 'Acceso denegado. Permisos insuficientes.',
        requiredRoles: roles,
        userRole: req.usuario.tipo
      });
    }

    next();
  };
};

// Middleware para admin central
const requireAdminCentral = (req, res, next) => {
  return requireRole('admin_central')(req, res, next);
};

// Middleware para admin hotel o admin central
const requireHotelAdmin = (req, res, next) => {
  return requireRole('admin_hotel', 'admin_central')(req, res, next);
};

// Middleware para empresas o admins
const requireEmpresaOrAdmin = (req, res, next) => {
  return requireRole('empresa', 'admin_hotel', 'admin_central')(req, res, next);
};

module.exports = {
  auth,
  requireRole,
  requireAdminCentral,
  requireHotelAdmin,
  requireEmpresaOrAdmin
};
