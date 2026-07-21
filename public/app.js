document.addEventListener('DOMContentLoaded', () => {
    const vistaLogin = document.getElementById('vista-login');
    const vistaDashboard = document.getElementById('vista-dashboard');
    const vistaResponder = document.getElementById('vista-responder');
    const vistaAdmin = document.getElementById('vista-admin');
    
    const formLogin = document.getElementById('form-login');
    const errorLogin = document.getElementById('error-login');
    const bienvenidaUsuario = document.getElementById('bienvenida-usuario');
    const listaEncuestas = document.getElementById('lista-encuestas');
    const listaEncuestasAdmin = document.getElementById('lista-encuestas-admin');
    const resultadoEstadisticas = document.getElementById('resultado-estadisticas');
    
    const btnVolver = document.getElementById('btn-volver');
    const btnIrAdmin = document.getElementById('btn-ir-admin');
    
    const formResponder = document.getElementById('form-responder');
    const tituloEncuestaActiva = document.getElementById('titulo-encuesta-activa');
    const descripcionEncuestaActiva = document.getElementById('descripcion-encuesta-activa');
    const contenedorPreguntasDinamicas = document.getElementById('contenedor-preguntas-dinamicas');

    let usuarioActual = null;
    let encuestaSeleccionadaId = null;
    let encuestaActualData = null;

    // 1. LOGIN
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const respuesta = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const datos = await respuesta.json();
            if (!respuesta.ok) throw new Error(datos.error || 'Credenciales incorrectas');

            usuarioActual = datos.usuario;
            bienvenidaUsuario.textContent = `Bienvenido, ${usuarioActual.nombre} (${usuarioActual.rol})`;
            
            vistaLogin.classList.add('hidden');
            vistaDashboard.classList.remove('hidden');

            // Si es administrador, mostramos el botón superior derecho
            if (usuarioActual.rol === 'admin') {
                btnIrAdmin.classList.remove('hidden');
            } else {
                btnIrAdmin.classList.add('hidden');
            }
            
            cargarEncuestas();
        } catch (error) {
            errorLogin.textContent = error.message;
        }
    });

    // 2. CARGAR ENCUESTAS PARA RESPONDER
    async function cargarEncuestas() {
        try {
            const respuesta = await fetch('/api/encuestas');
            const encuestas = await respuesta.json();

            listaEncuestas.innerHTML = '';
            if (encuestas.length === 0) {
                listaEncuestas.innerHTML = '<p>No hay encuestas disponibles.</p>';
                return;
            }

            encuestas.forEach(encuesta => {
                const div = document.createElement('div');
                div.style.cssText = 'border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px; background: #fafafa;';
                div.innerHTML = `
                    <h4>${encuesta.titulo}</h4>
                    <p>${encuesta.descripcion}</p>
                    <button class="btn-primary" onclick="abrirEncuesta('${encuesta._id}')">Responder Encuesta</button>
                `;
                listaEncuestas.appendChild(div);
            });
        } catch (error) {
            console.error('Error al cargar encuestas:', error);
        }
    }

    // ABRIR ENCUESTA PARA RESPONDER
    window.abrirEncuesta = async (id) => {
        encuestaSeleccionadaId = id;
        try {
            const respuesta = await fetch('/api/encuestas');
            const encuestas = await respuesta.json();
            encuestaActualData = encuestas.find(e => e._id === id);

            if (!encuestaActualData) return;

            tituloEncuestaActiva.textContent = encuestaActualData.titulo;
            descripcionEncuestaActiva.textContent = encuestaActualData.descripcion;
            
            contenedorPreguntasDinamicas.innerHTML = '';
            encuestaActualData.preguntas.forEach((item, index) => {
                let opcionesHTML = '';
                item.opciones.forEach(opcion => {
                    opcionesHTML += `
                        <label style="display: block; margin: 5px 0; cursor: pointer;">
                            <input type="radio" name="pregunta_${index}" value="${opcion}" required> ${opcion}
                        </label>
                    `;
                });

                const preguntaDiv = document.createElement('div');
                preguntaDiv.className = 'pregunta-card';
                preguntaDiv.innerHTML = `<p><strong>${item.pregunta}</strong></p>${opcionesHTML}`;
                contenedorPreguntasDinamicas.appendChild(preguntaDiv);
            });

            vistaDashboard.classList.add('hidden');
            vistaResponder.classList.remove('hidden');
        } catch (error) {
            console.error('Error al abrir la encuesta:', error);
        }
    };

    // ENVIAR RESPUESTAS
    formResponder.addEventListener('submit', async (e) => {
        e.preventDefault();
        const respuestasEnviadas = [];
        encuestaActualData.preguntas.forEach((item, index) => {
            const seleccionada = document.querySelector(`input[name="pregunta_${index}"]:checked`);
            if (seleccionada) {
                respuestasEnviadas.push({ pregunta: item.pregunta, respuesta: seleccionada.value });
            }
        });

        try {
            const respuesta = await fetch(`/api/encuestas/${encuestaSeleccionadaId}/responder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuarioEmail: usuarioActual.email, respuestas: respuestasEnviadas })
            });

            const resultado = await respuesta.json();
            if (!respuesta.ok) throw new Error(resultado.error);

            alert('¡Encuesta respondida con éxito!');
            vistaResponder.classList.add('hidden');
            vistaDashboard.classList.remove('hidden');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });

    // 3. BOTÓN ADMIN: ACCEDER A VISTA DE RESULTADOS
    btnIrAdmin.addEventListener('click', async () => {
        if (!usuarioActual || usuarioActual.rol !== 'admin') {
            alert('Acceso denegado. Se requieren permisos de administrador.');
            return;
        }

        vistaDashboard.classList.add('hidden');
        vistaAdmin.classList.remove('hidden');
        cargarEncuestasAdmin();
    });

    async function cargarEncuestasAdmin() {
        try {
            const respuesta = await fetch('/api/encuestas');
            const encuestas = await respuesta.json();

            listaEncuestasAdmin.innerHTML = '';
            resultadoEstadisticas.innerHTML = '<p>Selecciona una encuesta para ver su reporte consolidado.</p>';

            if (encuestas.length === 0) {
                listaEncuestasAdmin.innerHTML = '<p>No hay encuestas registradas.</p>';
                return;
            }

            encuestas.forEach(encuesta => {
                const div = document.createElement('div');
                div.style.cssText = 'border: 1px solid #ccc; padding: 10px; margin-bottom: 8px; border-radius: 4px; background: white; display: flex; justify-content: space-between; align-items: center;';
                div.innerHTML = `
                    <span><strong>${encuesta.titulo}</strong></span>
                    <button class="btn-primary" style="width: auto; margin: 0; padding: 6px 12px;" onclick="verResultadosAdmin('${encuesta._id}')">Ver Reporte</button>
                `;
                listaEncuestasAdmin.appendChild(div);
            });
        } catch (error) {
            console.error('Error al cargar encuestas para admin:', error);
        }
    }

    // VER REPORTE CONSOLIDADO (Ruta GET que creamos antes)
    window.verResultadosAdmin = async (id) => {
        if (!usuarioActual || usuarioActual.rol !== 'admin') {
            alert('No autorizado.');
            return;
        }

        try {
            const respuesta = await fetch(`/api/encuestas/${id}/consolidar`);
            const datos = await respuesta.json();

            if (!respuesta.ok) {
                resultadoEstadisticas.innerHTML = `<p style="color: red;">${datos.mensaje || datos.error}</p>`;
                return;
            }

            let htmlReporte = `<h4>Reporte: ${datos.reporte.totalParticipantes} Participante(s)</h4>`;
            const stats = datos.reporte.resultadosContabilizados;

            for (const [pregunta, opciones] of Object.entries(stats)) {
                htmlReporte += `<div style="margin-bottom: 10px;"><strong>${pregunta}</strong><ul>`;
                for (const [opcion, votos] of Object.entries(opciones)) {
                    htmlReporte += `<li>${opcion}: <strong>${votos} voto(s)</strong></li>`;
                }
                htmlReporte += `</ul></div>`;
            }

            resultadoEstadisticas.innerHTML = htmlReporte;
        } catch (error) {
            resultadoEstadisticas.innerHTML = '<p style="color: red;">Error al obtener el reporte estadístico.</p>';
        }
    };

    // 4. BOTÓN DE FLECHA (VOLVER O CERRAR APLICACIÓN)
    btnVolver.addEventListener('click', () => {
        if (!vistaResponder.classList.contains('hidden')) {
            vistaResponder.classList.add('hidden');
            vistaDashboard.classList.remove('hidden');
        } else if (!vistaAdmin.classList.contains('hidden')) {
            vistaAdmin.classList.add('hidden');
            vistaDashboard.classList.remove('hidden');
        } else if (!vistaDashboard.classList.contains('hidden')) {
            vistaDashboard.classList.add('hidden');
            vistaLogin.classList.remove('hidden');
            usuarioActual =валь = null;
            btnIrAdmin.classList.add('hidden');
        } else if (!vistaLogin.classList.contains('hidden')) {
            // Si está en el login y pulsa la flecha, intenta cerrar la ventana o redirigir
            if (confirm('¿Deseas cerrar la aplicación?')) {
                window.close();
                // Como los navegadores modernos bloquean window.close() si no fue abierta por script, mostramos un mensaje alternativo:
                window.location.href = "about:blank";
            }
        }
    });
});