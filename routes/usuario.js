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

module.exports = router;