/**
 * AlgoritmoAEstrella - Algoritmo de búsqueda de rutas A*
 * Traducción completa de AlgoritmoAEstrella.java
 */

import { TipoObstaculo } from './obstaculo.js';
import { Ruta } from './ruta.js';
import { Mapa, FILAS, COLUMNAS, matrizTerreno } from './mapa.js';
import { calcularCostoEstructurado, calcularConsumoEstructurado } from './vehiculo.js';
import { Bateria } from './bateria.js';

/** Contadores globales del algoritmo */
export let nodosExplorados = 0;
export let decisionesTomadas = 0;
export let obstaculosEncontrados = 0;

export let logsDecisiones = []; // Almacena el log de decisiones tomadas por el vehículo

export function resetContadores() {
    nodosExplorados = 0;
    decisionesTomadas = 0;
    obstaculosEncontrados = 0;
    logsDecisiones = [];
}

export function setNodosExplorados(v) { nodosExplorados = v; }
export function setObstaculosEncontrados(v) { obstaculosEncontrados = v; }

/**
 * Calcula la distancia Manhattan entre dos puntos.
 * Traducción de Coordenada.calcularDistanciaManhattan()
 */
function distanciaManhattan(f1, c1, f2, c2) {
    let df = f1 - f2;
    let dc = c1 - c2;
    if (df < 0) df = -df;
    if (dc < 0) dc = -dc;
    return df + dc;
}

/**
 * Busca la ruta óptima usando A*.
 * Traducción directa de AlgoritmoAEstrella.buscarRuta()
 */
export function buscarRuta(inicio, destino, vehiculo, mision, prioridad) {
    Ruta.reiniciar();
    nodosExplorados = 0;
    decisionesTomadas = 0;
    logsDecisiones = []; // Resetear el log en cada nueva búsqueda

    // Estructuras locales de control para la malla 20×20
    const listaAbierta = Array.from({ length: FILAS }, () => new Uint8Array(COLUMNAS));
    const listaCerrada = Array.from({ length: FILAS }, () => new Uint8Array(COLUMNAS));
    const costoG = Array.from({ length: FILAS }, () => new Float64Array(COLUMNAS).fill(999999.0));
    const costoF = Array.from({ length: FILAS }, () => new Float64Array(COLUMNAS).fill(999999.0));
    const padreFila = Array.from({ length: FILAS }, () => new Int16Array(COLUMNAS));
    const padreColumna = Array.from({ length: FILAS }, () => new Int16Array(COLUMNAS));

    // Configurar punto inicial
    const fIni = inicio.fila;
    const cIni = inicio.col;
    costoG[fIni][cIni] = 0.0;
    costoF[fIni][cIni] = distanciaManhattan(fIni, cIni, destino.fila, destino.col);
    listaAbierta[fIni][cIni] = 1;

    // Desplazamientos en las 4 direcciones cardinales
    const despF = [-1, 1, 0, 0];
    const despC = [0, 0, -1, 1];

    while (true) {
        let fAct = -1;
        let cAct = -1;
        let menorF = 999999.0;

        // Búsqueda lineal secuencial del mejor nodo (sin PriorityQueue, fiel al Java)
        for (let f = 0; f < FILAS; f++) {
            for (let c = 0; c < COLUMNAS; c++) {
                if (listaAbierta[f][c] && costoF[f][c] < menorF) {
                    menorF = costoF[f][c];
                    fAct = f;
                    cAct = c;
                }
            }
        }

        // Sin más nodos por evaluar
        if (fAct === -1 || cAct === -1) {
            Ruta.reiniciar();
            return false;
        }

        listaAbierta[fAct][cAct] = 0;
        listaCerrada[fAct][cAct] = 1;
        nodosExplorados++;
        decisionesTomadas++;

        // Llegamos al destino
        if (fAct === destino.fila && cAct === destino.col) {
            return reconstruirRuta(fAct, cAct, fIni, cIni, padreFila, padreColumna);
        }

        // Expandir vecinos
        for (let i = 0; i < 4; i++) {
            const fVecino = fAct + despF[i];
            const cVecino = cAct + despC[i];

            if (fVecino >= 0 && fVecino < FILAS && cVecino >= 0 && cVecino < COLUMNAS) {
                const obs = Mapa.mapaObstaculos[fVecino][cVecino];
                
                if (listaCerrada[fVecino][cVecino]) {
                    continue;
                }

                // LOG DE DECISIONES: Evaluar el obstáculo
                if (obs && obs.id !== 0) {
                    let condicion = obs.nombre;
                    let decision = '';
                    let razon = '';

                    if (obs === TipoObstaculo.CALLE_CERRADA || obs === TipoObstaculo.OBRA_CONSTRUCCION) {
                        decision = 'Evitar (Bloqueo Total)';
                        razon = 'El vehículo no puede atravesar este obstáculo bajo ninguna circunstancia.';
                        if (logsDecisiones.length < 150) logsDecisiones.push({ f: fVecino, c: cVecino, condicion, decision, razon });
                        continue;
                    }

                    const costoMovimiento = calcularCostoEstructurado(fVecino, cVecino, vehiculo, mision, prioridad, Mapa.mapaTerrenos, Mapa.mapaObstaculos);

                    if (obs === TipoObstaculo.TRAFICO && vehiculo.ignoraTrafico) {
                        decision = 'Avanzar (Ignorar Tráfico)';
                        razon = 'Vehículo de emergencia autorizado para ignorar el tráfico.';
                    } else if (obs === TipoObstaculo.SEMAFORO) {
                        decision = 'Evaluar Semáforo';
                        razon = 'Costo ajustado según estado actual del semáforo.';
                    } else {
                        decision = 'Avanzar (Con Penalidad)';
                        razon = `Se aplicó una penalización al costo del movimiento (Costo: ${costoMovimiento.toFixed(1)}).`;
                    }
                    if (logsDecisiones.length < 150) logsDecisiones.push({ f: fVecino, c: cVecino, condicion, decision, razon });
                    
                } else {
                    // Para celdas libres sin obstáculo que están bloqueadas
                    if (obs === TipoObstaculo.CALLE_CERRADA || obs === TipoObstaculo.OBRA_CONSTRUCCION) {
                        continue;
                    }
                }

                const costoMovimiento = calcularCostoEstructurado(
                    fVecino, cVecino, vehiculo, mision, prioridad,
                    Mapa.mapaTerrenos, Mapa.mapaObstaculos
                );

                const nuevoG = costoG[fAct][cAct] + costoMovimiento;

                if (nuevoG < costoG[fVecino][cVecino]) {
                    padreFila[fVecino][cVecino] = fAct;
                    padreColumna[fVecino][cVecino] = cAct;
                    costoG[fVecino][cVecino] = nuevoG;

                    const h = distanciaManhattan(fVecino, cVecino, destino.fila, destino.col);
                    costoF[fVecino][cVecino] = nuevoG + (h * (1.0 + vehiculo.pesoHeuristica));

                    listaAbierta[fVecino][cVecino] = 1;
                }
            }
        }
    }
}

/**
 * Reconstruye la ruta desde el destino al inicio.
 * Traducción de AlgoritmoAEstrella.reconstruirRutaEstructurada()
 */
function reconstruirRuta(fAct, cAct, fIni, cIni, padreFila, padreColumna) {
    // Seguridad extendida
    if (padreFila[fAct][cAct] === 0 && padreColumna[fAct][cAct] === 0 &&
        !(fAct === fIni && cAct === cIni)) {
        Ruta.reiniciar();
        return false;
    }

    const camino = [];

    // Reconstruir camino desde destino hacia atrás
    let f = fAct, c = cAct;
    while (!(f === fIni && c === cIni)) {
        camino.unshift({ fila: f, col: c });
        const copiaF = f;
        f = padreFila[copiaF][c];
        c = padreColumna[copiaF][c];
    }
    camino.unshift({ fila: fIni, col: cIni });

    // Registrar en ruta global
    Ruta.reiniciar();
    for (const paso of camino) {
        Ruta.registrarPaso(paso.fila, paso.col);
    }

    return true;
}

/**
 * Simula el recorrido del vehículo por la ruta.
 * Traducción de AlgoritmoAEstrella.simularRecorrido()
 */
export function simularRecorrido(vehiculo, mision, prioridad) {
    obstaculosEncontrados = 0;
    let costoAcumulado = 0.0;

    for (let i = 0; i < Ruta.cantidadPasosGlobal; i++) {
        const f = Ruta.rutaGlobalFilas[i];
        const c = Ruta.rutaGlobalColumnas[i];

        // Detección de obstáculos
        const obs = Mapa.mapaObstaculos[f][c];
        if (obs && obs !== TipoObstaculo.NINGUNO) {
            obstaculosEncontrados++;
        }

        // Consumo de batería
        if (i > 0) {
            const consumoPaso = calcularConsumoEstructurado(f, c, vehiculo, prioridad, Mapa.mapaTerrenos);
            Bateria.consumir(consumoPaso);

            const costoPaso = calcularCostoEstructurado(f, c, vehiculo, mision, prioridad, Mapa.mapaTerrenos, Mapa.mapaObstaculos);
            costoAcumulado += costoPaso;
        }

        // Detección de batería baja
        if (Bateria.esBaja() && i < Ruta.cantidadPasosGlobal - 1) {
            Bateria.recargar();
        }
    }

    Ruta.costoAcumuladoGlobal = costoAcumulado;
}
