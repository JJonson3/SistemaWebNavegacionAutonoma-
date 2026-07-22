/**
 * Prioridad - Tipos de prioridad de ruta
 * Traducción de Prioridad.java
 */

export const Prioridad = [
    {
        codigo: 1, nombre: 'Ruta más rápida',
        pesoVelocidad: 2.0, pesoCosto: 0.5, pesoBateria: 0.5, pesoSeguridad: 0.3,
        icono: '⚡'
    },
    {
        codigo: 2, nombre: 'Ruta más económica',
        pesoVelocidad: 0.5, pesoCosto: 2.0, pesoBateria: 1.0, pesoSeguridad: 0.8,
        icono: '💰'
    },
    {
        codigo: 3, nombre: 'Menor consumo de batería',
        pesoVelocidad: 0.5, pesoCosto: 1.0, pesoBateria: 2.5, pesoSeguridad: 0.8,
        icono: '🔋'
    },
    {
        codigo: 4, nombre: 'Ruta más segura',
        pesoVelocidad: 0.5, pesoCosto: 0.8, pesoBateria: 0.8, pesoSeguridad: 2.5,
        icono: '🛡️'
    },
    {
        codigo: 5, nombre: 'Ruta equilibrada',
        pesoVelocidad: 1.0, pesoCosto: 1.0, pesoBateria: 1.0, pesoSeguridad: 1.0,
        icono: '⚖️'
    }
];
