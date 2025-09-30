const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Registro de usuario
router.post('/register', authController.register);

// HU13: Registro de cuenta empresarial
router.post('/register-empresa', authController.registerEmpresa);

// Login de usuario
router.post('/login', authController.login);

// Verificar token y obtener datos del usuario (ruta protegida)
router.get('/verify', auth, authController.verifyToken);

// Cambiar contraseña (ruta protegida)
router.put('/change-password', auth, authController.changePassword);

// HU03: Recuperación de contraseña
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// HU12 CA3: Actualizar perfil (email, nombre, teléfono)
router.put('/perfil', auth, authController.actualizarPerfil);

module.exports = router;