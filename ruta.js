/**
 * Ruta - Gestión global de rutas calculadas
 * Traducción de Ruta.java
 */

export const Ruta = {
    rutaGlobalFilas: new Int16Array(2000),
    rutaGlobalColumnas: new Int16Array(2000),
    cantidadPasosGlobal: 0,
    costoAcumuladoGlobal: 0.0,

    reiniciar() {
        this.cantidadPasosGlobal = 0;
        this.costoAcumuladoGlobal = 0.0;
        this.rutaGlobalFilas.fill(-1);
        this.rutaGlobalColumnas.fill(-1);
    },

    registrarPaso(fila, columna) {
        if (this.cantidadPasosGlobal < 2000) {
            this.rutaGlobalFilas[this.cantidadPasosGlobal] = fila;
            this.rutaGlobalColumnas[this.cantidadPasosGlobal] = columna;
            this.cantidadPasosGlobal++;
        }
    },

    verificarCelda(fila, columna) {
        for (let i = 0; i < this.cantidadPasosGlobal; i++) {
            if (this.rutaGlobalFilas[i] === fila && this.rutaGlobalColumnas[i] === columna) {
                return true;
            }
        }
        return false;
    },

    /** Crea una snapshot del estado actual */
    snapshot() {
        return {
            filas: Int16Array.from(this.rutaGlobalFilas),
            columnas: Int16Array.from(this.rutaGlobalColumnas),
            pasos: this.cantidadPasosGlobal,
            costo: this.costoAcumuladoGlobal
        };
    },

    /** Restaura desde una snapshot */
    restore(snap) {
        this.rutaGlobalFilas.set(snap.filas);
        this.rutaGlobalColumnas.set(snap.columnas);
        this.cantidadPasosGlobal = snap.pasos;
        this.costoAcumuladoGlobal = snap.costo;
    }
};
