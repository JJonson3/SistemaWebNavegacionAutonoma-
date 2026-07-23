/**
 * Bateria - Sistema de energía centralizado
 * Traducción de Bateria.java
 */

export const Bateria = {
    cargaActual: 100.0,
    capacidadMaxima: 100.0,
    consumoTotal: 0.0,
    recargas: 0,

    inicializar(capacidad) {
        this.capacidadMaxima = capacidad;
        this.cargaActual = capacidad;
        this.consumoTotal = 0.0;
        this.recargas = 0;
    },

    consumir(cantidad) {
        this.cargaActual -= cantidad;
        this.consumoTotal += cantidad;
        if (this.cargaActual < 0.0) {
            this.cargaActual = 0.0;
        }
    },

    recargar() {
        this.cargaActual = this.capacidadMaxima;
        this.recargas++;
    },

    esBaja() {
        return (this.cargaActual / this.capacidadMaxima) * 100.0 < 25.0;
    },

    getPorcentaje() {
        if (this.capacidadMaxima <= 0) return 0.0;
        return (this.cargaActual / this.capacidadMaxima) * 100.0;
    },

    /** Crea una snapshot del estado actual para respaldo */
    snapshot() {
        return {
            cargaActual: this.cargaActual,
            capacidadMaxima: this.capacidadMaxima,
            consumoTotal: this.consumoTotal,
            recargas: this.recargas
        };
    },

    /** Restaura desde una snapshot */
    restore(snap) {
        this.cargaActual = snap.cargaActual;
        this.capacidadMaxima = snap.capacidadMaxima;
        this.consumoTotal = snap.consumoTotal;
        this.recargas = snap.recargas;
    }
};
