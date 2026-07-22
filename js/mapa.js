/**
 * Mapa - Generación y gestión de la grilla 20×20
 * Traducción de Mapa.java
 */

import { TipoObstaculo } from './obstaculo.js';

export const FILAS = 35;
export const COLUMNAS = 50;

export const Mapa = {
    mapaTerrenos: [],
    mapaObstaculos: [],

    /** Inicializa las matrices vacías */
    init() {
        this.mapaTerrenos = Array.from({ length: FILAS }, () => new Array(COLUMNAS).fill(null));
        this.mapaObstaculos = Array.from({ length: FILAS }, () => new Array(COLUMNAS).fill(TipoObstaculo.NINGUNO));
    },

    /**
     * Genera un mapa estructurado en manzanas (City Blocks).
     * Los edificios forman bloques y las calles forman una cuadrícula transitable.
     */
    generarMapa() {
        this.init();
        
        const isStreet = (index) => {
            // Calles cada 4 celdas (0, 4, 8, 12, 16) y en los bordes finales
            return index % 4 === 0 || index === FILAS - 1;
        };

        for (let f = 0; f < FILAS; f++) {
            for (let c = 0; c < COLUMNAS; c++) {
                const rowStreet = isStreet(f);
                const colStreet = isStreet(c);

                if (!rowStreet && !colStreet) {
                    // Interior de la manzana (Bloque de edificios)
                    // La mayoría son edificios (OBRA_CONSTRUCCION, ID 6)
                    // Pequeña probabilidad de dejar un hueco vacío
                    if (Math.random() < 0.9) {
                        this.mapaObstaculos[f][c] = TipoObstaculo.OBRA_CONSTRUCCION;
                    }
                } else {
                    // Es una calle
                    if (rowStreet && colStreet) {
                        // Intersección
                        if (Math.random() < 0.3) {
                            this.mapaObstaculos[f][c] = TipoObstaculo.SEMAFORO;
                        }
                    } else {
                        // Tramo de calle normal
                        const prob = Math.random();
                        if (prob < 0.05) {
                            this.mapaObstaculos[f][c] = TipoObstaculo.SPEED_BUMP;
                        } else if (prob < 0.08) {
                            this.mapaObstaculos[f][c] = TipoObstaculo.PEATON;
                        } else if (prob < 0.10) {
                            this.mapaObstaculos[f][c] = TipoObstaculo.TRAFICO;
                        } else if (prob < 0.12) {
                            // Calle cerrada (Fence) de forma muy infrecuente
                            this.mapaObstaculos[f][c] = TipoObstaculo.CALLE_CERRADA;
                        }
                    }
                }
            }
        }
    },

    /** Asegura que inicio y destino no tengan obstáculos */
    asegurarAccesibilidad(inicio, destino) {
        if (inicio) {
            this.mapaObstaculos[inicio.fila][inicio.col] = TipoObstaculo.NINGUNO;
        }
        if (destino) {
            this.mapaObstaculos[destino.fila][destino.col] = TipoObstaculo.NINGUNO;
        }
    }
};

/** Matriz de terreno editable (0=normal, 1=barro, 2=inundación) */
export const matrizTerreno = Array.from({ length: FILAS }, () => new Int8Array(COLUMNAS));

/** Reinicia la matriz de terreno */
export function reiniciarTerreno() {
    for (let f = 0; f < FILAS; f++) {
        matrizTerreno[f].fill(0);
    }
}
