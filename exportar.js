/**
 * Exportar - Funciones de exportación de reportes
 * Reemplazo de las funciones de FileWriter del Java
 */

import { Ruta } from './ruta.js';
import { Bateria } from './bateria.js';
import { nodosExplorados, obstaculosEncontrados } from './algoritmo.js';

/**
 * Descarga un archivo de texto con el contenido dado
 */
function descargarArchivo(nombre, contenido, tipo = 'text/plain') {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Exporta reporte de telemetría como TXT
 * Traducción del btnExportar de Main.java
 */
export function exportarReporteTXT(vehiculo, prioridad, mision) {
    // Cálculos matemáticos adicionales
    const metrosPorCelda = 50; // Supongamos que cada celda mide 50 metros
    const distanciaMetros = Ruta.cantidadPasosGlobal * metrosPorCelda;
    const distanciaKm = distanciaMetros / 1000;
    
    // Tiempo estimado (Tiempo = Distancia / Velocidad)
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

    const eficiencia = (distanciaKm / Math.max(0.01, Bateria.consumoTotal)).toFixed(2);

    const txt = [
        '╔═══════════════════════════════════════════════════════════╗',
        '║           SISTEMA DE NAVEGACIÓN AUTÓNOMA A*               ║',
        '║                 INFORME DE TELEMETRÍA                     ║',
        '╠═══════════════════════════════════════════════════════════╣',
        '  [CONFIGURACIÓN DE LA MISIÓN]',
        `  • Vehículo Activo     : ${vehiculo.nombre} (${vehiculo.velocidad} km/h)`,
        `  • Tipo de Misión      : ${mision.nombre}`,
        `  • Prioridad           : ${prioridad.nombre}`,
        '───────────────────────────────────────────────────────────',
        '  [MÉTRICAS DE RUTA Y ALGORITMO]',
        `  • Pasos Totales       : ${Ruta.cantidadPasosGlobal} celdas`,
        `  • Nodos Explorados    : ${nodosExplorados} nodos`,
        `  • Costo Acumulado     : ${Ruta.costoAcumuladoGlobal.toFixed(2)} unidades`,
        '───────────────────────────────────────────────────────────',
        '  [ANÁLISIS MATEMÁTICO (Escala: 1 celda = 50m)]',
        `  • Distancia Recorrida : ${distanciaKm.toFixed(2)} km (${distanciaMetros} m)`,
        `  • Tiempo Estimado     : ${tiempoEstimado}`,
        `  • Eficiencia Energét. : ${eficiencia} km/unidad de energía`,
        '───────────────────────────────────────────────────────────',
        '  [DESEMPEÑO Y ENERGÍA]',
        `  • Estado Batería      : ${Bateria.getPorcentaje().toFixed(1)}%`,
        `  • Consumo Total       : ${Bateria.consumoTotal.toFixed(1)} unidades`,
        `  • Recargas Técnicas   : ${Bateria.recargas}`,
        `  • Obstáculos Evitados : ${obstaculosEncontrados}`,
        '╚═══════════════════════════════════════════════════════════╝'
    ].join('\n');

    descargarArchivo('Reporte_Navegacion.txt', txt);
}

/**
 * Exporta el canvas del mapa como PNG
 */
export function exportarMapaPNG(canvas, nombre = 'Mapa_Navegacion.png') {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Exporta datos comparativos como CSV
 */
export function exportarComparativoCSV(rutas) {
    let csv = 'Vehiculo,Velocidad,Pasos,NodosExplorados,CostoRuta,ConsumoEnergy,BateriaRestante\n';
    for (const rv of rutas) {
        csv += `${rv.nombre},${rv.velocidad.toFixed(0)},${rv.pasos},${rv.nodosExpl},${rv.costo.toFixed(2)},${rv.consumo.toFixed(1)},${rv.bateria.toFixed(1)}%\n`;
    }
    descargarArchivo('Comparativa_Telemetria.csv', csv, 'text/csv');
}
