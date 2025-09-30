const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Registro de usuario
router.post('/register', authController.register);

// Login de usuario
router.post('/login', authController.login);

// Verificar token y obtener datos del usuario (ruta protegida)
router.get('/verify', auth, authController.verifyToken);

// Cambiar contraseña (ruta protegida)
router.put('/change-password', auth, authController.changePassword);

// HU03: Recuperación de contraseña
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;