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

module.exports = router;