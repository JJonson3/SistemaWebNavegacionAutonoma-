/**
 * Estadísticas - Panel lateral de telemetría en tiempo real
 * Reemplazo de PanelEstadisticas.java
 */

export class PanelEstadisticas {
    constructor() {
        // Configuración
        this.elVehiculo = document.getElementById('stat-vehiculo');
        this.elVelocidad = document.getElementById('stat-velocidad');
        this.elMision = document.getElementById('stat-mision');
        this.elPrioridad = document.getElementById('stat-prioridad');

        // Análisis A*
        this.elPasos = document.getElementById('stat-pasos');
        this.elNodos = document.getElementById('stat-nodos');
        this.elCosto = document.getElementById('stat-costo');

        // Análisis Matemático
        this.elDistancia = document.getElementById('stat-distancia');
        this.elTiempo = document.getElementById('stat-tiempo');
        this.elEficiencia = document.getElementById('stat-eficiencia');

        // Batería y Consumo
        this.elBateria = document.getElementById('stat-bateria');
        this.elBateriaFill = document.getElementById('bateria-fill');
        this.elBateriaText = document.getElementById('bateria-text');
        this.elConsumo = document.getElementById('stat-consumo');
        this.elRecargas = document.getElementById('stat-recargas');
        this.elObstaculos = document.getElementById('stat-obstaculos');
    }

    /**
     * Actualiza todos los datos del panel.
     * Traducción de PanelEstadisticas.actualizarDatos()
     */
    actualizar(vehiculo, prioridad, mision, pasos, nodos, costo, bateria, consumo, recargas, obstaculos) {
        if (this.elVehiculo) this.elVehiculo.textContent = vehiculo ? `${vehiculo.icono} ${vehiculo.nombre}` : '—';
        if (this.elVelocidad) this.elVelocidad.textContent = vehiculo ? `${vehiculo.velocidad} km/h` : '—';
        if (this.elMision) this.elMision.textContent = mision ? `${mision.icono} ${mision.nombre}` : '—';
        if (this.elPrioridad) this.elPrioridad.textContent = prioridad ? `${prioridad.icono} ${prioridad.nombre}` : '—';

        if (this.elPasos) this.elPasos.textContent = pasos;
        if (this.elNodos) this.elNodos.textContent = nodos;
        if (this.elCosto) this.elCosto.textContent = costo.toFixed(2);

        const pct = Math.max(0, Math.min(100, bateria));

        if (this.elBateria) this.elBateria.textContent = `${pct.toFixed(1)}%`;
        if (this.elConsumo) this.elConsumo.textContent = `${consumo.toFixed(1)} u`;
        if (this.elRecargas) this.elRecargas.textContent = recargas;
        if (this.elObstaculos) this.elObstaculos.textContent = obstaculos;

        // Cálculos Matemáticos
        if (vehiculo) {
            const metrosPorCelda = 50;
            const distanciaMetros = pasos * metrosPorCelda;
            const distanciaKm = distanciaMetros / 1000;
            
            const tiempoHoras = distanciaKm / vehiculo.velocidad;
            const tiempoMinutos = tiempoHoras * 60;
            const tiempoSegundos = tiempoMinutos * 60;
            
            let tiempoEstimado = "";
            if (tiempoMinutos >= 60) {
                tiempoEstimado = `${Math.floor(tiempoHoras)}h ${Math.round(tiempoMinutos % 60)}m`;
            } else if (tiempoMinutos >= 1) {
                tiempoEstimado = `${Math.floor(tiempoMinutos)}m ${Math.round(tiempoSegundos % 60)}s`;
            } else {
                tiempoEstimado = `${Math.round(tiempoSegundos)} seg`;
            }

            const eficiencia = (distanciaKm / Math.max(0.01, consumo)).toFixed(2);

            if (this.elDistancia) this.elDistancia.textContent = `${distanciaKm.toFixed(2)} km`;
            if (this.elTiempo) this.elTiempo.textContent = tiempoEstimado;
            if (this.elEficiencia) this.elEficiencia.textContent = `${eficiencia} km/u`;
        } else {
            if (this.elDistancia) this.elDistancia.textContent = `0.00 km`;
            if (this.elTiempo) this.elTiempo.textContent = `0 seg`;
            if (this.elEficiencia) this.elEficiencia.textContent = `0.00 km/u`;
        }

        // Barra de batería animada
        if (this.elBateriaFill) {
            this.elBateriaFill.style.width = `${pct}%`;

            // Colores dinámicos como en Java
            if (pct > 50) {
                this.elBateriaFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
            } else if (pct > 20) {
                this.elBateriaFill.style.background = 'linear-gradient(90deg, #f1c40f, #e67e22)';
            } else {
                this.elBateriaFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
            }
        }

        if (this.elBateriaText) {
            this.elBateriaText.textContent = `${pct.toFixed(1)}%`;
        }
    }
}
