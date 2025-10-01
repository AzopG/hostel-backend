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
  const usuario = new Usuario(req.body);
  await usuario.save();
  res.status(201).json(usuario);
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