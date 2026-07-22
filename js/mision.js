/**
 * TipoMision - Tipos de misión
 * Traducción de TipoMision.java
 */

export const TipoMision = [
    {
        codigo: 1, nombre: 'Transporte Normal',
        multiplicadorHeuristica: 1.0, multiplicadorCosto: 1.0, toleranciaRiesgo: 1.0,
        icono: '🚗'
    },
    {
        codigo: 2, nombre: 'Emergencia Médica',
        multiplicadorHeuristica: 2.0, multiplicadorCosto: 0.6, toleranciaRiesgo: 1.5,
        icono: '🏥'
    },
    {
        codigo: 3, nombre: 'Incendio',
        multiplicadorHeuristica: 1.5, multiplicadorCosto: 0.8, toleranciaRiesgo: 0.7,
        icono: '🔥'
    },
    {
        codigo: 4, nombre: 'Operativo Policial',
        multiplicadorHeuristica: 1.8, multiplicadorCosto: 0.7, toleranciaRiesgo: 1.3,
        icono: '🚨'
    },
    {
        codigo: 5, nombre: 'Entrega de Paquetes',
        multiplicadorHeuristica: 0.8, multiplicadorCosto: 1.3, toleranciaRiesgo: 0.9,
        icono: '📦'
    }
];
