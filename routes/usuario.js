const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');

// Consultar usuarios por tipo
router.get('/', async (req, res) => {
  const { tipo } = req.query;
  const filtro = {};
  if (tipo) filtro.tipo = tipo;
  const usuarios = await Usuario.find(filtro);
  res.json(usuarios);
});

// Crear usuario
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password, tipo, empresa } = req.body;
    
    // Validaciones básicas
    if (!nombre || !email || !password || !tipo) {
      return res.status(400).json({ 
        msg: 'Todos los campos son requeridos',
        requiredFields: ['nombre', 'email', 'password', 'tipo']
      });
    }

    // Validar email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Formato de email inválido' });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(400).json({ msg: 'Ya existe un usuario con ese email' });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    // Crear usuario
    const usuario = new Usuario({
      nombre,
      email: email.toLowerCase(),
      password: hash,
      tipo,
      empresa: tipo === 'empresa' || tipo === 'admin_hotel' ? empresa : undefined
    });

    await usuario.save();

    // No devolver la contraseña en la respuesta
    const usuarioResponse = {
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      tipo: usuario.tipo,
      empresa: usuario.empresa
    };

    res.status(201).json({
      msg: 'Usuario creado exitosamente',
      usuario: usuarioResponse
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ 
      msg: 'Error interno del servidor al crear usuario',
      error: error.message 
    });
  }
});

// Editar usuario por ID (con cambio de contraseña si se envía nuevaPassword)
const bcrypt = require('bcrypt');
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.nuevaPassword && req.body.nuevaPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(req.body.nuevaPassword, salt);
      delete updateData.nuevaPassword;
    }
    const usuario = await Usuario.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar usuario por ID
router.delete('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;