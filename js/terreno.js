/**
 * TipoTerreno - Tipos de terreno del mapa
 * Traducción de TipoTerreno.java
 */

export const TipoTerreno = {
    CALLE_NORMAL:    { id: 0, nombre: 'Calle Normal',    costoMovimiento: 1.0, simbolo: '.', consumoBateria: 1.0 },
    AVENIDA:         { id: 1, nombre: 'Avenida',         costoMovimiento: 0.8, simbolo: 'A', consumoBateria: 0.9 },
    ZONA_ESCOLAR:    { id: 2, nombre: 'Zona Escolar',    costoMovimiento: 1.8, simbolo: 'Z', consumoBateria: 1.2 },
    TERRENO_DIFICIL: { id: 3, nombre: 'Terreno Difícil', costoMovimiento: 2.5, simbolo: 'D', consumoBateria: 2.0 },
    CALLE_RAPIDA:    { id: 4, nombre: 'Calle Rápida',    costoMovimiento: 0.5, simbolo: 'R', consumoBateria: 0.7 },
    CALLE_LENTA:     { id: 5, nombre: 'Calle Lenta',     costoMovimiento: 1.5, simbolo: 'L', consumoBateria: 1.5 }
};

export const TERRENOS_ARRAY = [
    TipoTerreno.CALLE_NORMAL,
    TipoTerreno.AVENIDA,
    TipoTerreno.ZONA_ESCOLAR,
    TipoTerreno.TERRENO_DIFICIL,
    TipoTerreno.CALLE_RAPIDA,
    TipoTerreno.CALLE_LENTA
];
