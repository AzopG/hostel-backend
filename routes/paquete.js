const express = require('express');
const router = express.Router();
const Paquete = require('../models/Paquete');

// Consultar paquetes empresariales
router.get('/', async (req, res) => {
  const paquetes = await Paquete.find();
  res.json(paquetes);
});

// Crear paquete
router.post('/', async (req, res) => {
  const paquete = new Paquete(req.body);
  await paquete.save();
  res.status(201).json(paquete);
});

module.exports = router;