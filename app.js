const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const errorHandler = require('./middleware/errorHandler');

// Configuración de MongoDB
mongoose.connect('mongodb+srv://afmaldonado10:Andres1070.@cluster0.9swl2u0.mongodb.net/Hotel?retryWrites=true&w=majority&appName=Cluster0');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/hotel', require('./routes/hotel'));

// Manejo de errores
app.use(errorHandler);

module.exports = app;