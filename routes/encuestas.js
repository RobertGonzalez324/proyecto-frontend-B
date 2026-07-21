const { ObjectId } = require('mongodb');
const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // 1. OBTENER ENCUESTAS (Con Auto-Seed integrado)
  router.get('/', async (req, res) => {
    try {
      const coleccion = db.collection('encuestas');
      let encuestas = await coleccion.find({}).toArray();

      // Si la colección está vacía, insertamos automáticamente la encuesta oficial de 10 preguntas
      if (encuestas.length === 0) {
        const encuestaInicial = {
          titulo: "Evaluación de Satisfacción Institucional",
          descripcion: "Encuesta detallada de 10 preguntas para medir el rendimiento y la calidad del servicio.",
          preguntas: [
            { pregunta: "¿Cómo califica la claridad de la información proporcionada?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿Los tiempos de respuesta cumplieron con sus expectativas?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿El nivel de atención y soporte técnico fue el adecuado?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿Considera que los recursos tecnológicos facilitaron el proceso?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿La plataforma web resultó intuitiva y fácil de navegar?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿La estabilidad del sistema durante el registro y envío fue óptima?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿El diseño visual de la interfaz fue agradable y profesional?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿Las instrucciones brindadas en cada sección fueron precisas?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿El proceso global cumplió con los estándares de calidad esperados?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
            { pregunta: "¿Recomendaría este sistema de evaluación para otros departamentos?", opciones: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] }
          ]
        };
        const resultado = await coleccion.insertOne(encuestaInicial);
        encuestaInicial._id = resultado.insertedId;
        encuestas = [encuestaInicial];
        console.log('✨ [Auto-Seed] Encuesta inicial de 10 preguntas inyectada automáticamente en MongoDB.');
      }

      res.status(200).json(encuestas);
    } catch (error) {
      console.error('Error al obtener encuestas:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. RESPONDER UNA ENCUESTA
  router.post('/:id/responder', async (req, res) => {
    try {
      const { id } = req.params;
      const { usuarioEmail, respuestas } = req.body;

      if (!usuarioEmail || !respuestas) {
        return res.status(400).json({ error: 'Faltan datos en la respuesta.' });
      }

      const coleccionRespuestas = db.collection('respuestas');
      const nuevaRespuesta = {
        encuestaId: new ObjectId(id),
        usuarioEmail: usuarioEmail,
        respuestas: respuestas,
        fecha: new Date()
      };

      await coleccionRespuestas.insertOne(nuevaRespuesta);
      res.status(201).json({ mensaje: 'Respuesta guardada con éxito.' });
    } catch (error) {
      console.error('Error al guardar respuesta:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. CONSOLIDAR RESULTADOS PARA EL ADMINISTRADOR
  router.get('/:id/consolidar', async (req, res) => {
    try {
      const { id } = req.params;
      const coleccionEncuestas = db.collection('encuestas');
      const coleccionRespuestas = db.collection('respuestas');

      const encuesta = await coleccionEncuestas.findOne({ _id: new ObjectId(id) });
      if (!encuesta) {
        return res.status(404).json({ error: 'Encuesta no encontrada.' });
      }

      const respuestasList = await coleccionRespuestas.find({ encuestaId: new ObjectId(id) }).toArray();

      if (respuestasList.length === 0) {
        return res.status(200).json({
          mensaje: 'Aún no hay respuestas registradas para esta encuesta.',
          reporte: { totalParticipantes: 0, resultadosContabilizados: {} }
        });
      }

      // Estructura para acumular los votos por opción estandarizada
      const resultadosContabilizados = {};
      encuesta.preguntas.forEach(p => {
        resultadosContabilizados[p.pregunta] = {};
        p.opciones.forEach(op => {
          resultadosContabilizados[p.pregunta][op] = 0;
        });
      });

      // Contabilizamos cada voto recibido
      respuestasList.forEach(item => {
        item.respuestas.forEach(r => {
          if (resultadosContabilizados[r.pregunta] && resultadosContabilizados[r.pregunta][r.respuesta] !== undefined) {
            resultadosContabilizados[r.pregunta][r.respuesta]++;
          }
        });
      });

      res.status(200).json({
        reporte: {
          tituloEncuesta: encuesta.titulo,
          totalParticipantes: respuestasList.length,
          resultadosContabilizados: resultadosContabilizados
        }
      });
    } catch (error) {
      console.error('Error al consolidar resultados:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};