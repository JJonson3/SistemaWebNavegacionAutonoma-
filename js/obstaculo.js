/**
 * TipoObstaculo - Tipos de obstáculos del mapa
 * Traducción de TipoObstaculo.java
 */

export const TipoObstaculo = {
    NINGUNO:            { id: 0,  nombre: 'Libre',                  costoAdicional: 0.0,  transitable: true,  simbolo: '.', penalizacionSeguridad: 0.0 },
    CALLE_CERRADA:      { id: 1,  nombre: 'Calle Cerrada',          costoAdicional: -1.0, transitable: false, simbolo: '#', penalizacionSeguridad: 3.0 },
    SEMAFORO:            { id: 2,  nombre: 'Semáforo',               costoAdicional: 2.0,  transitable: true,  simbolo: 'F', penalizacionSeguridad: 0.5 },
    TRAFICO:             { id: 3,  nombre: 'Tráfico',                costoAdicional: 3.0,  transitable: true,  simbolo: 'T', penalizacionSeguridad: 1.0 },
    PEATON:              { id: 4,  nombre: 'Peatón',                 costoAdicional: 1.5,  transitable: true,  simbolo: 'P', penalizacionSeguridad: 1.5 },
    ACCIDENTE:           { id: 5,  nombre: 'Accidente',              costoAdicional: 4.0,  transitable: true,  simbolo: 'X', penalizacionSeguridad: 2.5 },
    OBRA_CONSTRUCCION:   { id: 6,  nombre: 'Obra en Construcción',   costoAdicional: -1.0, transitable: false, simbolo: 'O', penalizacionSeguridad: 2.0 },
    HOSPITAL:            { id: 7,  nombre: 'Hospital',               costoAdicional: 0.5,  transitable: true,  simbolo: 'H', penalizacionSeguridad: 0.0 },
    ESTACION_POLICIA:    { id: 8,  nombre: 'Estación de Policía',    costoAdicional: 0.5,  transitable: true,  simbolo: 'K', penalizacionSeguridad: 0.0 },
    ESTACION_BOMBEROS:   { id: 9,  nombre: 'Estación de Bomberos',   costoAdicional: 0.5,  transitable: true,  simbolo: 'B', penalizacionSeguridad: 0.0 },
    ESTACION_CARGA:      { id: 10, nombre: 'Estación de Carga',      costoAdicional: 0.0,  transitable: true,  simbolo: 'C', penalizacionSeguridad: 0.0 },
    SPEED_BUMP:          { id: 11, nombre: 'Policía Acostado',       costoAdicional: 1.0,  transitable: true,  simbolo: '~', penalizacionSeguridad: 0.0 }
};

/** Array indexado para rotación con Shift+Clic */
export const OBSTACULOS_ARRAY = [
    TipoObstaculo.NINGUNO,
    TipoObstaculo.CALLE_CERRADA,
    TipoObstaculo.SEMAFORO,
    TipoObstaculo.TRAFICO,
    TipoObstaculo.PEATON,
    TipoObstaculo.ACCIDENTE,
    TipoObstaculo.OBRA_CONSTRUCCION,
    TipoObstaculo.HOSPITAL,
    TipoObstaculo.ESTACION_POLICIA,
    TipoObstaculo.ESTACION_BOMBEROS,
    TipoObstaculo.ESTACION_CARGA,
    TipoObstaculo.SPEED_BUMP
];
