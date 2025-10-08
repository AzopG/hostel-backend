const connectDB = require('./config/db');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(express.json());
app.use(cors());

// Middleware para log de tiempo de cada request (único log permitido)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  next();
});

// Solo una conexión a MongoDB
connectDB();

// Importar rutas
app.use('/api/hoteles', require('./routes/hotel'));
app.use('/api/admin/hoteles', require('./routes/hotel'));
app.use('/api/habitaciones', require('./routes/habitacion'));
app.use('/api/salones', require('./routes/salon'));
app.use('/api/reservas', require('./routes/reserva'));
app.use('/api/paquetes', require('./routes/paquete'));
app.use('/api/usuarios', require('./routes/usuario'));
app.use('/api/eventos', require('./routes/evento'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/disponibilidad', require('./routes/disponibilidad'));
app.use('/api/reportes', require('./routes/reporte'));
app.use('/api/calendario', require('./routes/calendario'));
app.use('/api/filtros', require('./routes/filtros'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/comprobantes', require('./routes/comprobante')); // HU11
// ...existing code...
app.use('/api/estadisticas', require('./routes/estadisticas')); // Estadísticas del dashboard
app.use('/api/admin/paquetes', require('./routes/paqueteAdmin')); // Gestión administrativa de paquetes
app.use('/api/reservas-paquetes', require('./routes/reservaPaquete')); // Reservas de paquetes empresariales

const PORT = process.env.PORT || 4000;

// Solo iniciar el servidor si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  // Usar el evento de conexión de mongoose en lugar de conectar de nuevo
  mongoose.connection.once('open', () => {
    app.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    });
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ Error de conexión a MongoDB:', err);
  });
}

// Exportar app para testing
module.exports = app;
