/**
 * App - Punto de entrada y orquestador principal
 * Reemplazo de Main.java
 * Conecta todos los módulos y gestiona el flujo de la aplicación
 */

import { Mapa, matrizTerreno, reiniciarTerreno } from './mapa.js';
import { Ruta } from './ruta.js';
import { Bateria } from './bateria.js';
import { TipoVehiculo } from './vehiculo.js';
import { TipoMision } from './mision.js';
import { Prioridad } from './prioridad.js';
import { TipoObstaculo } from './obstaculo.js';
import { MapRenderer } from './renderer.js';
import { PanelEstadisticas } from './estadisticas.js';
import { buscarRuta, simularRecorrido, nodosExplorados, obstaculosEncontrados, resetContadores, setObstaculosEncontrados, logsDecisiones } from './algoritmo.js';
import { GestorAudio } from './audio.js';
import { exportarReporteTXT, exportarMapaPNG } from './exportar.js';
import { ejecutarComparacion } from './comparativo.js';
import { EventManager } from './event-manager.js';
import { SimulationAgent } from './simulation-agent.js';

// ======================================================================
// ======================================================================

let temporizador = null;
let pasoActual = 0;
let enPausa = false;

let inicio = { fila: 0, col: 0 };
let parada = null;
let destino = { fila: 34, col: 49 };

let vehiculoSelIdx = 0;
let prioridadSelIdx = 4; // Equilibrada por defecto
let misionSelIdx = 0;

let mapRenderer = null;
let panelStats = null;

let eventManager = null;

// ======================================================================
//   INICIALIZACIÓN
// ======================================================================

export function getEventManager() { return eventManager; }

document.addEventListener('DOMContentLoaded', () => {
    // Generar mapa inicial
    Mapa.generarMapa();
    Mapa.asegurarAccesibilidad(inicio, destino);

    // Inicializar renderer del mapa
    const canvas = document.getElementById('mapa-canvas');
    mapRenderer = new MapRenderer(canvas);
    window.mapRenderer = mapRenderer; // Para que comparativo.js tenga acceso
    mapRenderer.setPuntos(inicio, parada, destino);

    // Inicializar EventManager con la escena del renderer
    eventManager = new EventManager(mapRenderer.scene, mapRenderer.marcadoresGroup, mapRenderer);

    // Callback cuando el usuario cambia coordenadas en el mapa
    mapRenderer.onCambioCoordenada = (nuevoInicio, nuevaParada, nuevoDestino) => {
        inicio = nuevoInicio;
        parada = nuevaParada;
        destino = nuevoDestino;
        if (temporizador) {
            clearInterval(temporizador);
            temporizador = null;
        }
    };

    // Inicializar panel de estadísticas
    panelStats = new PanelEstadisticas();

    // Llenar combos
    llenarCombos();

    // Binding de botones
    document.getElementById('btn-nuevo-mapa').addEventListener('click', nuevoMapa);
    document.getElementById('btn-calcular').addEventListener('click', calcularRuta);
    document.getElementById('btn-pausa').addEventListener('click', togglePausa);
    document.getElementById('btn-reiniciar').addEventListener('click', reiniciar);
    document.getElementById('btn-comparar').addEventListener('click', comparar);
    

    const btnDecisiones = document.getElementById('btn-decisiones');
    if(btnDecisiones) btnDecisiones.addEventListener('click', () => {
        window.open('decisiones.html', '_blank');
    });

    document.getElementById('btn-exportar').addEventListener('click', exportar);
    
    document.getElementById('btn-camara-fps').addEventListener('click', (e) => {
        const btn = e.target;
        const modoFPS = !mapRenderer.cameraController.modoPrimeraPersona;
        mapRenderer.cameraController.setModoPrimeraPersona(modoFPS);
        if (modoFPS) {
            btn.classList.add('btn-warning');
            btn.classList.remove('btn-secondary');
            btn.textContent = '❌ Desactivar FPS';
        } else {
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-secondary');
            btn.textContent = '🎥 1ra Persona';
        }
    });

    // Combos
    document.getElementById('combo-vehiculo').addEventListener('change', (e) => {
        vehiculoSelIdx = parseInt(e.target.value);
        
        // Auto-seleccionar misión y prioridad por defecto
        misionSelIdx = vehiculoSelIdx; 
        document.getElementById('combo-mision').value = misionSelIdx;
        
        if (vehiculoSelIdx === 1 || vehiculoSelIdx === 2 || vehiculoSelIdx === 3) {
            prioridadSelIdx = 0; // Ruta más rápida para ambulancia/bomberos/policía
        } else if (vehiculoSelIdx === 4) {
            prioridadSelIdx = 1; // Ruta más económica para reparto
        } else {
            prioridadSelIdx = 4; // Equilibrio para transporte normal
        }
        document.getElementById('combo-prioridad').value = prioridadSelIdx;
    });
    document.getElementById('combo-prioridad').addEventListener('change', (e) => {
        prioridadSelIdx = parseInt(e.target.value);
    });
    document.getElementById('combo-mision').addEventListener('change', (e) => {
        misionSelIdx = parseInt(e.target.value);
    });

    // Slider de velocidad
    document.getElementById('slider-velocidad').addEventListener('input', (e) => {
        document.getElementById('velocidad-valor').textContent = `${e.target.value}ms`;
    });

    // Renderizar mapa inicial
    requestAnimationFrame(() => mapRenderer.resize());

    // Animación suave de entrada
    document.body.classList.add('loaded');
});

// ======================================================================
//   LLENAR COMBOS (SELECT)
// ======================================================================

function llenarCombos() {
    const comboVeh = document.getElementById('combo-vehiculo');
    const comboPrio = document.getElementById('combo-prioridad');
    const comboMis = document.getElementById('combo-mision');

    TipoVehiculo.forEach((v, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${v.icono} ${v.nombre}`;
        if (i === vehiculoSelIdx) opt.selected = true;
        comboVeh.appendChild(opt);
    });

    Prioridad.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${p.icono} ${p.nombre}`;
        if (i === prioridadSelIdx) opt.selected = true;
        comboPrio.appendChild(opt);
    });

    TipoMision.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${m.icono} ${m.nombre}`;
        if (i === misionSelIdx) opt.selected = true;
        comboMis.appendChild(opt);
    });
}

// ======================================================================
//   ACCIONES DE LOS BOTONES
// ======================================================================

/** Genera un nuevo mapa aleatorio */
function nuevoMapa() {
    if (temporizador) { clearInterval(temporizador); temporizador = null; }
    reiniciarTerreno();
    Mapa.generarMapa();
    Mapa.asegurarAccesibilidad(inicio, destino);
    Ruta.reiniciar();
    mapRenderer.setEdicionBloqueada(false);
    mapRenderer.render();
    mostrarNotificacion('🗺️ Nuevo mapa generado');
}

let currentAgent = null;

/** Calcula la ruta A* y anima el vehículo */
function calcularRuta() {
    if (temporizador) { clearInterval(temporizador); temporizador = null; }
    enPausa = false;
    document.getElementById('btn-pausa').textContent = '⏸ Pausar';

    setObstaculosEncontrados(0);

    const vehiculo = TipoVehiculo[vehiculoSelIdx];
    const prioridad = Prioridad[prioridadSelIdx];
    const mision = TipoMision[misionSelIdx];

    const mesh = mapRenderer._crearVehiculo(vehiculo);
    mesh.position.set(inicio.col, 0.25, inicio.fila);
    
    const agent = new SimulationAgent(vehiculo, prioridad, mision, mesh, inicio.fila, inicio.col, destino.fila, destino.col, parada ? parada.fila : -1, parada ? parada.col : -1);
    currentAgent = agent;
    
    // Guardar los logs de decisiones para la tabla
    sessionStorage.setItem('logsDecisiones', JSON.stringify({
        vehiculos: [{ nombre: vehiculo.nombre, logs: [...logsDecisiones] }]
    }));

    mapRenderer.setAgentes([currentAgent]);
    mapRenderer.actualizarRuta();

    if (currentAgent.path.length > 0) {
        const velocidadMs = parseInt(document.getElementById('slider-velocidad').value);
        mapRenderer.setEdicionBloqueada(true);

        GestorAudio.reproducirInicio();

        temporizador = setInterval(() => {
            if (!currentAgent.isFinished) {
                if (eventManager) eventManager.update();
                currentAgent.update(eventManager ? eventManager.getEventos() : []);
                
                panelStats.actualizar(vehiculo, prioridad, mision,
                    currentAgent.pathIndex, nodosExplorados, currentAgent.costoRuta,
                    Math.max(0, currentAgent.bateria), currentAgent.consumoTotal,
                    0, obstaculosEncontrados);
            } else {
                clearInterval(temporizador);
                temporizador = null;
                mapRenderer.setEdicionBloqueada(false);
                GestorAudio.reproducirLlegada();
                mostrarNotificacion('✅ ¡Destino alcanzado!', 'success');
            }
        }, velocidadMs);

        mostrarNotificacion(`🚀 Ruta calculada`);
    } else {
        mostrarNotificacion('⚠️ No se encontró un camino posible hacia el destino', 'warning');
        mapRenderer.setAgentes([]);
    }
}

/** Pausa / Reanuda la animación */
function togglePausa() {
    const btn = document.getElementById('btn-pausa');
    if (enPausa) {
        // Reanudar
        if (currentAgent && !currentAgent.isFinished) {
            const velocidadMs = parseInt(document.getElementById('slider-velocidad').value);
            temporizador = setInterval(() => {
                if (!currentAgent.isFinished) {
                    if (eventManager) eventManager.update();
                    currentAgent.update(eventManager ? eventManager.getEventos() : []);
                    
                    panelStats.actualizar(currentAgent.vehiculo, currentAgent.prioridad, currentAgent.mision,
                        currentAgent.pathIndex, nodosExplorados, currentAgent.costoRuta,
                        Math.max(0, currentAgent.bateria), currentAgent.consumoTotal,
                        0, obstaculosEncontrados);
                } else {
                    clearInterval(temporizador);
                    temporizador = null;
                    mapRenderer.setEdicionBloqueada(false);
                    GestorAudio.reproducirLlegada();
                    mostrarNotificacion('✅ ¡Destino alcanzado!', 'success');
                }
            }, velocidadMs);
        }
        enPausa = false;
        btn.textContent = '⏸ Pausar';
    } else {
        if (temporizador) {
            clearInterval(temporizador);
            temporizador = null;
        }
        enPausa = true;
        btn.textContent = '▶ Reanudar';
    }
    mapRenderer.setEdicionBloqueada(true);
}



/** Reinicia la simulación */
function reiniciar() {
    if (temporizador) { clearInterval(temporizador); temporizador = null; }
    enPausa = false;
    pasoActual = 0;
    document.getElementById('btn-pausa').textContent = '⏸ Pausar';
    mapRenderer.setEdicionBloqueada(false);

    if (eventManager) eventManager.limpiar();
    currentAgent = null;
    mapRenderer.setAgentes([]);

    const vehiculo = TipoVehiculo[vehiculoSelIdx];
    const prioridad = Prioridad[prioridadSelIdx];
    const mision = TipoMision[misionSelIdx];

    panelStats.actualizar(vehiculo, prioridad, mision, 0, 0, 0.0, Bateria.getPorcentaje(), 0.0, 0, 0);
    mostrarNotificacion('🔄 Simulación reiniciada');
}

/** Abre la comparación multi-vehículo */
function comparar() {
    const prioridad = Prioridad[prioridadSelIdx];
    const mision = TipoMision[misionSelIdx];
    ejecutarComparacion(inicio, parada, destino, prioridad, mision);
}

/** Exporta el reporte TXT */
function exportar() {
    const vehiculo = TipoVehiculo[vehiculoSelIdx];
    const prioridad = Prioridad[prioridadSelIdx];
    const mision = TipoMision[misionSelIdx];
    exportarReporteTXT(vehiculo, prioridad, mision);
    mostrarNotificacion('📄 Reporte exportado');
}

// ======================================================================
//   NOTIFICACIONES TOAST
// ======================================================================

function mostrarNotificacion(mensaje, tipo = 'info') {
    const container = document.getElementById('notificaciones') || crearContainerNotificaciones();
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function crearContainerNotificaciones() {
    const div = document.createElement('div');
    div.id = 'notificaciones';
    document.body.appendChild(div);
    return div;
}
