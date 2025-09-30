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

/**
 * HU13: Registro de cuenta empresarial
 * CA1: Formulario empresa con campos específicos
 * CA2: Validación de formato NIT
 * CA3: Verificar duplicidad de NIT
 * CA4: Registro exitoso con rol Empresa
 */
exports.registerEmpresa = async (req, res) => {
  try {
    const { 
      razonSocial,     // CA1: Razón social legal
      nit,             // CA1: NIT de la empresa
      contacto,        // CA1: Persona de contacto { nombre, cargo, telefono }
      email,           // CA1: Correo corporativo
      password         // CA1: Contraseña
    } = req.body;

    // CA1: Validar que todos los campos requeridos estén presentes
    if (!razonSocial || !nit || !email || !password) {
      return res.status(400).json({ 
        success: false,
        msg: 'Todos los campos son requeridos',
        requiredFields: ['razonSocial', 'nit', 'email', 'password'],
        camposFaltantes: {
          razonSocial: !razonSocial,
          nit: !nit,
          email: !email,
          password: !password
        }
      });
    }

    // CA1: Validar datos de contacto
    if (!contacto || !contacto.nombre || !contacto.telefono) {
      return res.status(400).json({
        success: false,
        msg: 'Los datos de contacto son requeridos',
        requiredFields: ['contacto.nombre', 'contacto.telefono']
      });
    }

    // CA2: Validación de formato NIT
    // Formato Colombia: números con o sin guiones, puede terminar en dígito de verificación
    // Ejemplos válidos: 900123456-1, 9001234561, 900.123.456-1
    const nitLimpio = nit.replace(/[\s.-]/g, ''); // Remover espacios, puntos y guiones
    
    // Debe tener entre 9 y 10 dígitos
    if (!/^\d{9,10}$/.test(nitLimpio)) {
      return res.status(400).json({
        success: false,
        msg: 'Formato de NIT inválido',
        detalle: 'El NIT debe tener 9 o 10 dígitos (puede incluir dígito de verificación)',
        ejemplos: ['900123456-1', '9001234561', '900.123.456-1'],
        formatoNIT: false // CA2: Flag para UI
      });
    }

    // Validar email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Formato de email inválido' 
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        msg: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // CA3: Verificar duplicidad de NIT
    const empresaExistente = await Usuario.findOne({ nit: nitLimpio });
    if (empresaExistente) {
      return res.status(409).json({ 
        success: false,
        msg: 'Ya existe una empresa registrada con este NIT',
        detalle: 'Este NIT ya está asociado a otra cuenta empresarial',
        nitDuplicado: true, // CA3: Flag para UI
        razonSocialExistente: empresaExistente.razonSocial // Para mostrar al usuario
      });
    }

    // Verificar si el email ya existe
    const emailExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (emailExistente) {
      return res.status(409).json({ 
        success: false,
        msg: 'Ya existe un usuario con ese email',
        detalle: 'Este correo electrónico ya está registrado en el sistema'
      });
    }

    // Hash de la contraseña
    const hash = await bcrypt.hash(password, 12);

    // CA4: Crear cuenta con rol Empresa
    const empresa = new Usuario({
      nombre: contacto.nombre, // Nombre del contacto principal
      email: email.toLowerCase(),
      password: hash,
      tipo: 'empresa', // CA4: Rol Empresa
      razonSocial: razonSocial.trim(),
      nit: nitLimpio, // Guardar NIT sin formato
      contactoEmpresa: {
        nombre: contacto.nombre.trim(),
        cargo: contacto.cargo ? contacto.cargo.trim() : 'Representante Legal',
        telefono: contacto.telefono.trim()
      },
      empresa: razonSocial.trim() // Mantener compatibilidad con campo legacy
    });

    await empresa.save();

    // CA4: Generar token JWT para inicio de sesión automático
    const token = jwt.sign(
      { 
        id: empresa._id,
        tipo: empresa.tipo,
        razonSocial: empresa.razonSocial,
        nit: empresa.nit
      },
      process.env.JWT_SECRET || 'fallback_secret_key_change_in_production',
      { expiresIn: '7d' }
    );

    console.log(`✅ Empresa registrada exitosamente: ${empresa.razonSocial} (NIT: ${empresa.nit})`);

    // CA4: Respuesta con datos de la empresa y token (inicia sesión automáticamente)
    res.status(201).json({
      success: true,
      msg: 'Empresa registrada exitosamente',
      token, // CA4: Token para inicio de sesión automático
      empresa: {
        _id: empresa._id,
        razonSocial: empresa.razonSocial,
        nit: empresa.nit,
        nitFormateado: formatearNIT(empresa.nit), // Para mostrar en UI
        email: empresa.email,
        tipo: empresa.tipo,
        contacto: empresa.contactoEmpresa,
        createdAt: empresa.createdAt
      }
    });

  } catch (err) {
    console.error('❌ Error en registro de empresa:', err);
    
    // Errores de validación de Mongoose
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: 'Error de validación',
        errores: Object.keys(err.errors).map(key => ({
          campo: key,
          mensaje: err.errors[key].message
        }))
      });
    }

    // Error de duplicado (por si el índice único falla)
    if (err.code === 11000) {
      const campo = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        success: false,
        msg: `Ya existe un registro con ese ${campo}`,
        campo: campo,
        duplicado: true
      });
    }

    res.status(500).json({ 
      success: false,
      msg: 'Error interno del servidor',
      error: err.message 
    });
  }
};

/**
 * Helper: Formatear NIT para visualización
 * Ejemplo: 9001234561 → 900.123.456-1
 */
function formatearNIT(nit) {
  if (!nit) return '';
  
  const nitStr = nit.toString();
  
  if (nitStr.length === 10) {
    // Formato: XXX.XXX.XXX-X
    return `${nitStr.slice(0, 3)}.${nitStr.slice(3, 6)}.${nitStr.slice(6, 9)}-${nitStr.slice(9)}`;
  } else if (nitStr.length === 9) {
    // Formato: XXX.XXX.XXX
    return `${nitStr.slice(0, 3)}.${nitStr.slice(3, 6)}.${nitStr.slice(6)}`;
  }
  
  return nitStr;
}

/**
 * HU12 CA3: Actualizar perfil de usuario (especialmente email)
 */
exports.actualizarPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id; // Del middleware de auth
    const { nombre, email, telefono, empresa } = req.body;

    // Buscar usuario actual
    const usuario = await Usuario.findById(usuarioId);
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        msg: 'Usuario no encontrado' 
      });
    }

    // Validar email format si se está cambiando
    if (email && email !== usuario.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          msg: 'Formato de email inválido' 
        });
      }

      // Verificar que el nuevo email no esté en uso
      const emailExiste = await Usuario.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: usuarioId }
      });

      if (emailExiste) {
        return res.status(400).json({ 
          success: false,
          msg: 'Este email ya está en uso por otra cuenta' 
        });
      }

      // CA3: Actualizar email - las notificaciones futuras irán al nuevo email
      const emailAnterior = usuario.email;
      usuario.email = email.toLowerCase();
      
      console.log(`📧 Email actualizado para usuario ${usuarioId}: ${emailAnterior} → ${email}`);
    }

    // Actualizar otros campos si se proporcionan
    if (nombre) usuario.nombre = nombre;
    if (telefono) usuario.telefono = telefono;
    if (empresa && usuario.tipo === 'empresa') usuario.empresa = empresa;

    await usuario.save();

    res.json({
      success: true,
      msg: 'Perfil actualizado exitosamente',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        tipo: usuario.tipo,
        empresa: usuario.empresa
      },
      emailCambiado: email && email !== usuario.email
    });

  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Error interno del servidor',
      error: err.message
    });
  }
};
