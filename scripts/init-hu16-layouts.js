/**
 * HU16: Script para agregar layouts a los salones existentes
 * Agrega diferentes configuraciones de espacio (Teatro, Banquete, Escuela, etc.)
 * con sus respectivas capacidades
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Salon = require('../models/Salon');

// Layouts típicos para salones de eventos
const layoutsDisponibles = {
  teatro: {
    nombre: 'Teatro',
    descripcion: 'Disposición de asientos en filas mirando al frente, ideal para presentaciones y conferencias',
    factorCapacidad: 1.0 // 100% de la capacidad máxima
  },
  banquete: {
    nombre: 'Banquete',
    descripcion: 'Mesas redondas con sillas, ideal para comidas y cenas de gala',
    factorCapacidad: 0.6 // 60% de la capacidad máxima
  },
  escuela: {
    nombre: 'Escuela',
    descripcion: 'Mesas en filas con sillas, ideal para capacitaciones y talleres',
    factorCapacidad: 0.7 // 70% de la capacidad máxima
  },
  uforma: {
    nombre: 'U-Form',
    descripcion: 'Mesas en forma de U, ideal para reuniones de trabajo y discusiones',
    factorCapacidad: 0.4 // 40% de la capacidad máxima
  },
  cocktail: {
    nombre: 'Cocktail',
    descripcion: 'Mesas altas de pie, ideal para networking y eventos sociales',
    factorCapacidad: 1.2 // 120% de la capacidad máxima (más personas de pie)
  },
  boardroom: {
    nombre: 'Boardroom',
    descripcion: 'Mesa única grande tipo sala de juntas',
    factorCapacidad: 0.3 // 30% de la capacidad máxima
  }
};

async function agregarLayoutsASalones() {
  try {
    console.log('🔧 HU16: Agregando layouts a salones existentes...\n');

    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB Atlas\n');

    // Obtener todos los salones
    const salones = await Salon.find({});
    console.log(`📊 Se encontraron ${salones.length} salones\n`);

    let contador = 0;

    for (const salon of salones) {
      console.log(`\n🏢 Procesando: ${salon.nombre} (Capacidad máxima: ${salon.capacidad})`);

      // Determinar qué layouts son apropiados según la capacidad
      const layouts = [];

      if (salon.capacidad >= 100) {
        // Salones grandes: todos los layouts
        layouts.push(
          {
            nombre: layoutsDisponibles.teatro.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.teatro.factorCapacidad),
            descripcion: layoutsDisponibles.teatro.descripcion,
            imagen: '/assets/layouts/teatro.jpg'
          },
          {
            nombre: layoutsDisponibles.banquete.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.banquete.factorCapacidad),
            descripcion: layoutsDisponibles.banquete.descripcion,
            imagen: '/assets/layouts/banquete.jpg'
          },
          {
            nombre: layoutsDisponibles.escuela.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.escuela.factorCapacidad),
            descripcion: layoutsDisponibles.escuela.descripcion,
            imagen: '/assets/layouts/escuela.jpg'
          },
          {
            nombre: layoutsDisponibles.cocktail.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.cocktail.factorCapacidad),
            descripcion: layoutsDisponibles.cocktail.descripcion,
            imagen: '/assets/layouts/cocktail.jpg'
          },
          {
            nombre: layoutsDisponibles.uforma.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.uforma.factorCapacidad),
            descripcion: layoutsDisponibles.uforma.descripcion,
            imagen: '/assets/layouts/uforma.jpg'
          }
        );
      } else if (salon.capacidad >= 30) {
        // Salones medianos: layouts versátiles
        layouts.push(
          {
            nombre: layoutsDisponibles.teatro.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.teatro.factorCapacidad),
            descripcion: layoutsDisponibles.teatro.descripcion,
            imagen: '/assets/layouts/teatro.jpg'
          },
          {
            nombre: layoutsDisponibles.escuela.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.escuela.factorCapacidad),
            descripcion: layoutsDisponibles.escuela.descripcion,
            imagen: '/assets/layouts/escuela.jpg'
          },
          {
            nombre: layoutsDisponibles.uforma.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.uforma.factorCapacidad),
            descripcion: layoutsDisponibles.uforma.descripcion,
            imagen: '/assets/layouts/uforma.jpg'
          },
          {
            nombre: layoutsDisponibles.cocktail.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.cocktail.factorCapacidad),
            descripcion: layoutsDisponibles.cocktail.descripcion,
            imagen: '/assets/layouts/cocktail.jpg'
          }
        );
      } else {
        // Salones pequeños: solo layouts para reuniones
        layouts.push(
          {
            nombre: layoutsDisponibles.boardroom.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.boardroom.factorCapacidad),
            descripcion: layoutsDisponibles.boardroom.descripcion,
            imagen: '/assets/layouts/boardroom.jpg'
          },
          {
            nombre: layoutsDisponibles.uforma.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.uforma.factorCapacidad),
            descripcion: layoutsDisponibles.uforma.descripcion,
            imagen: '/assets/layouts/uforma.jpg'
          },
          {
            nombre: layoutsDisponibles.escuela.nombre,
            capacidad: Math.floor(salon.capacidad * layoutsDisponibles.escuela.factorCapacidad),
            descripcion: layoutsDisponibles.escuela.descripcion,
            imagen: '/assets/layouts/escuela.jpg'
          }
        );
      }

      // Actualizar salón con layouts
      salon.layouts = layouts;
      await salon.save();

      console.log(`  ✅ Layouts agregados:`);
      layouts.forEach(layout => {
        console.log(`     • ${layout.nombre}: ${layout.capacidad} personas`);
      });

      contador++;
    }

    console.log(`\n✅ Proceso completado: ${contador} salones actualizados con layouts\n`);

    // Mostrar resumen
    console.log('📊 RESUMEN DE LAYOUTS:');
    const salonesActualizados = await Salon.find({}).select('nombre capacidad layouts.nombre layouts.capacidad');
    salonesActualizados.forEach(salon => {
      console.log(`\n${salon.nombre} (${salon.capacidad} personas):`);
      salon.layouts.forEach(layout => {
        console.log(`  ${layout.nombre}: ${layout.capacidad} personas`);
      });
    });

  } catch (error) {
    console.error('❌ Error al agregar layouts:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar script
agregarLayoutsASalones();
