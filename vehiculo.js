/**
 * TipoVehiculo y Vehiculo - Tipos y lógica de vehículos
 * Traducción de TipoVehiculo.java y Vehiculo.java
 */

import { TipoObstaculo } from './obstaculo.js';
import { FILAS, COLUMNAS } from './mapa.js';

export const TipoVehiculo = [
    {
        codigo: 1, nombre: 'Transporte Normal', velocidad: 60.0,
        consumoBateria: 1.0, prioridad: 1, costoPorMovimiento: 1.0,
        pesoHeuristica: 1.5, evitarObstaculosCercanos: false, ignoraTrafico: false,
        icono: '🚗', color: '#ffd700' // Taxi
    },
    {
        codigo: 2, nombre: 'Ambulancia', velocidad: 120.0,
        consumoBateria: 1.8, prioridad: 5, costoPorMovimiento: 0.5,
        pesoHeuristica: 3.0, evitarObstaculosCercanos: false, ignoraTrafico: true,
        icono: '🚑', color: '#ffffff'
    },
    {
        codigo: 3, nombre: 'Bomberos', velocidad: 100.0,
        consumoBateria: 2.0, prioridad: 4, costoPorMovimiento: 0.8,
        pesoHeuristica: 1.0, evitarObstaculosCercanos: true, ignoraTrafico: false,
        icono: '🚒', color: '#ff3333'
    },
    {
        codigo: 4, nombre: 'Policía', velocidad: 110.0,
        consumoBateria: 1.5, prioridad: 4, costoPorMovimiento: 0.75,
        pesoHeuristica: 2.0, evitarObstaculosCercanos: true, ignoraTrafico: true,
        icono: '🚓', color: '#3333ff'
    },
    {
        codigo: 5, nombre: 'Vehículo de Reparto', velocidad: 40.0,
        consumoBateria: 0.6, prioridad: 1, costoPorMovimiento: 3.0, // Muy sensible a la distancia
        pesoHeuristica: 0.5, evitarObstaculosCercanos: false, ignoraTrafico: false,
        icono: '🚚', color: '#d97b29'
    }
];

/**
 * Calcula el costo de moverse a una celda específica.
 * Traducción directa de Vehiculo.calcularCostoEstructurado()
 */
export function calcularCostoEstructurado(fDes, cDes, vehiculo, mision, prioridad, mapaTerrenos, mapaObstaculos) {
    let costoBase = vehiculo.costoPorMovimiento;

    const terrenoDestino = mapaTerrenos[fDes][cDes];
    const obstaculoDestino = mapaObstaculos[fDes][cDes];

    const costoTerreno = terrenoDestino ? terrenoDestino.costoMovimiento : 1.0;
    const modificadorMision = mision ? mision.multiplicadorCosto : 1.0;
    const modificadorPrioridad = prioridad ? prioridad.pesoCosto : 1.0;

    // Operación lineal combinada
    let costoMovimiento = costoBase * costoTerreno * modificadorMision * modificadorPrioridad;

    // Penalización de obstáculos transitables
    if (obstaculoDestino && obstaculoDestino.transitable && obstaculoDestino.costoAdicional > 0) {
        if (vehiculo.ignoraTrafico && (obstaculoDestino.id === 2 || obstaculoDestino.id === 3 || obstaculoDestino.id === 4)) {
            // Ambulancia/Policía ignoran semáforos, tráfico y peatones en el costo de A* (se abrirán paso)
            costoMovimiento += 0.1;
        } else {
            costoMovimiento += obstaculoDestino.costoAdicional;
        }
    }

    // Condiciones de seguridad perimetral
    const factorSeguridad = prioridad ? prioridad.pesoSeguridad : 1.0;
    if (vehiculo.evitarObstaculosCercanos || factorSeguridad > 1.0) {
        if (obstaculoDestino) {
            costoMovimiento += obstaculoDestino.penalizacionSeguridad * factorSeguridad * 2.0; // Exagerado para forzar rutas anchas
        }
        // Penalizar adyacentes a edificios/obras
        for(let i=-1; i<=1; i++){
            for(let j=-1; j<=1; j++){
                if(i===0 && j===0) continue;
                if(fDes+i >= 0 && fDes+i < FILAS && cDes+j >= 0 && cDes+j < COLUMNAS) {
                    const obsVecino = mapaObstaculos[fDes+i][cDes+j];
                    if(obsVecino && (!obsVecino.transitable || obsVecino.id === 6)) { // Cerca a muros/obras
                        costoMovimiento += vehiculo.evitarObstaculosCercanos ? 5.0 : 0.5;
                    }
                }
            }
        }
    }

    return costoMovimiento;
}

/**
 * Calcula la tasa de consumo de batería.
 * Traducción directa de Vehiculo.calcularConsumoEstructurado()
 */
export function calcularConsumoEstructurado(fDes, cDes, vehiculo, prioridad, mapaTerrenos) {
    const consumoBase = vehiculo.consumoBateria;
    const terrenoDestino = mapaTerrenos[fDes][cDes];
    const consumoTerreno = terrenoDestino ? terrenoDestino.consumoBateria : 1.0;
    const pesoBateria = prioridad.pesoBateria;

    return consumoBase * consumoTerreno * pesoBateria;
}
