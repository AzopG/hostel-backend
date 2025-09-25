const jwt = require('jsonwebtoken');
const { auth, requireRole, requireAdminCentral } = require('../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('auth middleware', () => {
    it('debería permitir acceso con token válido', () => {
      const userId = '123456789';
      const userType = 'cliente';
      const token = jwt.sign({ id: userId, tipo: userType }, process.env.JWT_SECRET);
      
      req.header.mockReturnValue(`Bearer ${token}`);

      auth(req, res, next);

      expect(req.usuario).toBeDefined();
      expect(req.usuario.id).toBe(userId);
      expect(req.usuario.tipo).toBe(userType);
      expect(next).toHaveBeenCalled();
    });

    it('debería rechazar acceso sin token', () => {
      req.header.mockReturnValue(null);

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Acceso denegado. Token requerido.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería rechazar token inválido', () => {
      req.header.mockReturnValue('Bearer invalid-token');

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Token inválido.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería manejar token expirado', () => {
      const expiredToken = jwt.sign(
        { id: '123', tipo: 'cliente' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '-1h' }
      );
      
      req.header.mockReturnValue(`Bearer ${expiredToken}`);

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Token expirado.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería aceptar token sin Bearer prefix', () => {
      const token = jwt.sign({ id: '123', tipo: 'cliente' }, process.env.JWT_SECRET);
      req.header.mockReturnValue(token);

      auth(req, res, next);

      expect(req.usuario).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole middleware', () => {
    beforeEach(() => {
      req.usuario = { id: '123', tipo: 'cliente' };
    });

    it('debería permitir acceso con rol correcto', () => {
      const middleware = requireRole('cliente', 'empresa');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería rechazar acceso con rol incorrecto', () => {
      const middleware = requireRole('admin_central');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        msg: 'Acceso denegado. Permisos insuficientes.',
        requiredRoles: ['admin_central'],
        userRole: 'cliente'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería rechazar acceso sin usuario autenticado', () => {
      req.usuario = null;
      const middleware = requireRole('cliente');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Usuario no autenticado.' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdminCentral middleware', () => {
    it('debería permitir acceso a admin central', () => {
      req.usuario = { id: '123', tipo: 'admin_central' };

      requireAdminCentral(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería rechazar acceso a otros roles', () => {
      req.usuario = { id: '123', tipo: 'admin_hotel' };

      requireAdminCentral(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});