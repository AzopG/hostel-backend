const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../config/email');

exports.register = async (req, res) => {
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

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({ msg: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Validar tipos permitidos
    const tiposPermitidos = ['cliente', 'empresa', 'admin_hotel', 'admin_central'];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({ 
        msg: 'Tipo de usuario inválido',
        tiposPermitidos 
      });
    }

    // Validar que si es tipo empresa, tenga el campo empresa
    if (tipo === 'empresa' && !empresa) {
      return res.status(400).json({ msg: 'El campo empresa es requerido para usuarios tipo empresa' });
    }

    // Verificar si el usuario ya existe
    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ msg: 'Ya existe un usuario con ese email' });
    }

    // Hash de la contraseña
    const hash = await bcrypt.hash(password, 12);

    // Crear usuario
    const usuario = new Usuario({ 
      nombre, 
      email: email.toLowerCase(), 
      password: hash, 
      tipo, 
      empresa: tipo === 'empresa' ? empresa : undefined
    });

    await usuario.save();

    // No devolver la contraseña
    const usuarioResponse = {
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      tipo: usuario.tipo,
      empresa: usuario.empresa
    };

    res.status(201).json({ 
      msg: 'Usuario registrado exitosamente',
      usuario: usuarioResponse 
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ msg: 'Error interno del servidor', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ 
        msg: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar usuario
    const usuario = await Usuario.findOne({ email: email.toLowerCase() });
    if (!usuario) {
      return res.status(401).json({ msg: 'Credenciales incorrectas' });
    }

    // Verificar contraseña
    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) {
      return res.status(401).json({ msg: 'Credenciales incorrectas' });
    }

    // Generar token JWT
    const payload = {
      id: usuario._id,
      tipo: usuario.tipo,
      email: usuario.email
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Datos del usuario sin contraseña
    const usuarioData = {
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      tipo: usuario.tipo,
      empresa: usuario.empresa
    };

    res.json({ 
      msg: 'Login exitoso',
      token, 
      usuario: usuarioData,
      expiresIn: '24h'
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ msg: 'Error interno del servidor', error: err.message });
  }
};

// Verificar token y obtener datos del usuario
exports.verifyToken = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-password');
    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    res.json({ usuario });
  } catch (err) {
    console.error('Error verificando token:', err);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// Cambiar contraseña
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.usuario.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        msg: 'Contraseña actual y nueva contraseña son requeridas' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        msg: 'La nueva contraseña debe tener al menos 6 caracteres' 
      });
    }

    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const valido = await bcrypt.compare(currentPassword, usuario.password);
    if (!valido) {
      return res.status(401).json({ msg: 'Contraseña actual incorrecta' });
    }

    // Hash nueva contraseña
    const hash = await bcrypt.hash(newPassword, 12);
    usuario.password = hash;
    await usuario.save();

    res.json({ msg: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    console.error('Error cambiando contraseña:', err);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// HU03 - CA1, CA2, CA3: Solicitar recuperación de contraseña
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validación
    if (!email) {
      return res.status(400).json({ msg: 'El email es requerido' });
    }

    // Buscar usuario
    const usuario = await Usuario.findOne({ email: email.toLowerCase() });
    
    // CA3: Si el correo no existe, informar
    if (!usuario) {
      return res.status(404).json({ msg: 'No existe una cuenta con este correo' });
    }

    // CA2: Generar token de restablecimiento (válido por 1 hora)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    usuario.resetPasswordToken = hash;
    usuario.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await usuario.save();

    // CA2: Generar URL de recuperación
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    
    // CA1, CA2: Enviar email de recuperación
    try {
      const emailResult = await sendPasswordResetEmail(email, resetUrl, usuario.nombre);
      
      // En desarrollo, incluir preview URL de Ethereal
      const response = { 
        msg: 'Se ha enviado un enlace de recuperación a tu correo'
      };
      
      // Solo en desarrollo: incluir información adicional
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔗 Reset URL:', resetUrl);
        response.resetToken = resetToken; // Para testing
        response.resetUrl = resetUrl; // Para testing
        if (emailResult.previewUrl) {
          response.emailPreviewUrl = emailResult.previewUrl;
          console.log('📧 Email preview:', emailResult.previewUrl);
        }
      }
      
      res.json(response);
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
      // Aunque falle el email, guardamos el token para poder probarlo
      // En producción, podrías querer retornar un error aquí
      res.json({ 
        msg: 'Se ha enviado un enlace de recuperación a tu correo',
        // En desarrollo, retornar el token aunque falle el email
        ...(process.env.NODE_ENV !== 'production' && {
          resetToken,
          resetUrl,
          warning: 'Email no enviado (error en servicio de email)'
        })
      });
    }
  } catch (err) {
    console.error('Error en forgot password:', err);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// HU03 - CA4: Restablecer contraseña con token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validaciones
    if (!password) {
      return res.status(400).json({ msg: 'La contraseña es requerida' });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        msg: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Hash del token recibido
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar usuario con token válido y no expirado
    const usuario = await Usuario.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!usuario) {
      return res.status(400).json({ 
        msg: 'Token inválido o expirado. Solicita un nuevo enlace de recuperación.' 
      });
    }

    // CA4: Establecer nueva contraseña
    const hash = await bcrypt.hash(password, 12);
    usuario.password = hash;
    usuario.resetPasswordToken = undefined;
    usuario.resetPasswordExpires = undefined;
    await usuario.save();

    // CA4: Enviar email de confirmación
    try {
      await sendPasswordChangedEmail(usuario.email, usuario.nombre);
    } catch (emailError) {
      console.error('Error enviando email de confirmación:', emailError);
      // No fallar la operación si el email falla
    }

    res.json({ msg: 'Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.' });
  } catch (err) {
    console.error('Error en reset password:', err);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};
