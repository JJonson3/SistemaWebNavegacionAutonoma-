/**
 * Comparativo - Carrera multi-vehículo en la vista 3D principal
 */

import { TipoVehiculo } from './vehiculo.js';
import { Bateria } from './bateria.js';
import { exportarComparativoCSV } from './exportar.js';
import { SimulationAgent } from './simulation-agent.js';
import { getEventManager } from './app.js';
import { COLUMNAS } from './mapa.js';
import { logsDecisiones } from './algoritmo.js';

let timerCarrera = null;
let agentesCarrera = [];
let resultadosGuardados = [];

export function ejecutarComparacion(inicio, parada, destino, prioridad, mision) {
    // Instanciar los 5 agentes
    agentesCarrera = [];
    
    // Obtener mapRenderer (asumiendo que está global, o lo pasamos?)
    // Lo más seguro es emitir un custom event para que app.js empiece la carrera, o depender de que window.mapRenderer exista.
    // Vamos a acceder al mapRenderer global asumiendo que lo seteamos en window
    if(!window.mapRenderer) return;

    window.mapRenderer.setEdicionBloqueada(true);

    const logTodos = [];

    for (let i = 0; i < TipoVehiculo.length; i++) {
        const tipo = TipoVehiculo[i];
        const mesh = window.mapRenderer._crearVehiculo(tipo);
        
        // Espaciar un poco los vehículos en la salida
        const colStart = Math.min(COLUMNAS - 1, Math.max(0, inicio.col + (i - 2)));
        mesh.position.set(colStart, 0.25, inicio.fila);

        const agent = new SimulationAgent(tipo, prioridad, mision, mesh, inicio.fila, colStart, destino.fila, destino.col);
        
        // Guardar el log de este vehículo para la tabla
        logTodos.push({ nombre: tipo.nombre, logs: [...logsDecisiones] });
        
        // Si no encuentra ruta, path = [] y terminará rápido
        agentesCarrera.push(agent);
    }

    sessionStorage.setItem('logsDecisiones', JSON.stringify({ vehiculos: logTodos }));

    window.mapRenderer.setAgentes(agentesCarrera);

    mostrarTablaTelemetria();

    if (timerCarrera) clearInterval(timerCarrera);

    timerCarrera = setInterval(() => {
        let alguienCorre = false;
        const evts = getEventManager() ? getEventManager().getEventos() : [];
        if(getEventManager()) getEventManager().update();

        for (let idx = 0; idx < agentesCarrera.length; idx++) {
            const agent = agentesCarrera[idx];
            if (!agent.isFinished) {
                agent.update(evts);
                alguienCorre = true;
                actualizarFilaTabla(idx, agent);
            }
        }

        if (!alguienCorre) {
            clearInterval(timerCarrera);
            timerCarrera = null;
            window.mapRenderer.setEdicionBloqueada(false);
            
            // Recolectar resultados finales
            resultadosGuardados = agentesCarrera.map(a => ({
                nombre: a.vehiculo.nombre,
                velocidad: a.vehiculo.velocidad,
                pasos: a.pathIndex,
                nodosExpl: 0, // simplification, not tracking per-agent exactly here
                costo: a.costoRuta,
                bateria: Math.max(0, a.bateria),
                consumo: a.consumoTotal
            }));
            
            document.getElementById('btn-export-csv-comp').style.display = 'block';
        }
    }, 150);
}

function mostrarTablaTelemetria() {
    const prev = document.getElementById('panel-telemetria');
    if (prev) prev.remove();

    const panel = document.createElement('div');
    panel.id = 'panel-telemetria';
    panel.style.position = 'absolute';
    panel.style.top = '20px';
    panel.style.left = '20px';
    panel.style.background = 'rgba(22, 27, 34, 0.85)';
    panel.style.backdropFilter = 'blur(10px)';
    panel.style.border = '1px solid rgba(88, 166, 255, 0.2)';
    panel.style.padding = '15px';
    panel.style.borderRadius = '12px';
    panel.style.zIndex = '1000';
    panel.style.color = 'white';
    panel.style.width = '350px';

    panel.innerHTML = `
        <h3 style="margin-bottom: 10px; font-size: 0.9rem; color: #58a6ff;">🏁 Carrera Multi-Vehículo</h3>
        <table style="width:100%; font-size: 0.75rem; border-collapse: collapse;">
            <thead>
                <tr style="text-align:left; color: #8b949e; border-bottom: 1px solid #333;">
                    <th style="padding: 4px;">Vehículo</th>
                    <th style="padding: 4px;">Bat.</th>
                    <th style="padding: 4px;">Estado</th>
                </tr>
            </thead>
            <tbody id="telemetria-body">
            </tbody>
        </table>
        <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="btn btn-secondary" id="btn-cerrar-carrera">Terminar</button>
            <button class="btn btn-primary" id="btn-export-csv-comp" style="display:none;">Exportar CSV</button>
        </div>
    `;

    document.body.appendChild(panel);

    const tbody = document.getElementById('telemetria-body');
    for (let i = 0; i < agentesCarrera.length; i++) {
        const agent = agentesCarrera[i];
        const tr = document.createElement('tr');
        tr.id = 'tele-row-' + i;
        tr.innerHTML = `
            <td style="padding: 4px; color:${agent.vehiculo.color}; font-weight:bold;">${agent.vehiculo.icono} ${agent.vehiculo.nombre}</td>
            <td style="padding: 4px;" id="tele-bat-${i}">100%</td>
            <td style="padding: 4px;" id="tele-state-${i}">Corriendo</td>
        `;
        tbody.appendChild(tr);
    }

    document.getElementById('btn-cerrar-carrera').addEventListener('click', () => {
        if(timerCarrera) clearInterval(timerCarrera);
        panel.remove();
        if(window.mapRenderer) {
            window.mapRenderer.setAgentes([]);
            window.mapRenderer.setEdicionBloqueada(false);
        }
    });

    document.getElementById('btn-export-csv-comp').addEventListener('click', () => {
        exportarComparativoCSV(resultadosGuardados);
    });
}

function actualizarFilaTabla(idx, agent) {
    const elBat = document.getElementById('tele-bat-' + idx);
    const elState = document.getElementById('tele-state-' + idx);
    if(elBat) elBat.textContent = agent.bateria.toFixed(1) + '%';
    
    if(elState) {
        if(agent.isFinished) {
            elState.textContent = '🏁 Meta';
            elState.style.color = '#3fb950';
        } else if(agent.path.length === 0) {
            elState.textContent = 'Bloqueado';
            elState.style.color = '#f85149';
        } else {
            elState.textContent = 'Corriendo';
            elState.style.color = '#8b949e';
        }
    }
}
