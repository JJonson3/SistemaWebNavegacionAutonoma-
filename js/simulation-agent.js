import { buscarRuta, nodosExplorados } from './algoritmo.js';
import { Ruta } from './ruta.js';
import { Bateria } from './bateria.js';
import { matrizTerreno, Mapa } from './mapa.js';

/**
 * Gestiona un vehículo individual moviéndose por la escena.
 */
export class SimulationAgent {
    constructor(tipoVehiculo, prioridad, mision, mesh3D, startRow, startCol, destRow, destCol, paradaRow = -1, paradaCol = -1) {
        this.vehiculo = tipoVehiculo;
        this.prioridad = prioridad;
        this.mision = mision;
        
        this.mesh = mesh3D;
        
        this.start = { fila: startRow, col: startCol };
        this.current = { fila: startRow, col: startCol };
        this.destino = { fila: destRow, col: destCol };
        if (paradaRow !== -1 && paradaCol !== -1) {
            this.parada = { fila: paradaRow, col: paradaCol };
        } else {
            this.parada = null;
        }
        this.pasoParada = false;
        
        this.path = [];
        this.pathIndex = 0;
        
        this.bateria = 100.0;
        this.consumoTotal = 0.0;
        this.costoRuta = 0.0;
        
        this.isFinished = false;

        // Grupo para las celdas iluminadas de la ruta
        this.trailGroup = new THREE.Group();
        this.trailColor = parseInt(this.vehiculo.color.replace('#', '0x'));
        
        // Calcular ruta inicial
        this.recalculatePath();
        
        // Construir la ruta visual con celdas de la base usando el color exacto
        const mat = new THREE.MeshBasicMaterial({ 
            color: this.trailColor, 
            transparent: true, 
            opacity: 0.85 
        });
        const geo = new THREE.PlaneGeometry(0.55, 0.55); // Más ancho como el principal
        
        for (let i = 0; i < this.path.length; i++) {
            const paso = this.path[i];
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = -Math.PI / 2;
            // Desfase en Y ligeramente diferente para evitar Z-fighting si hay rutas superpuestas
            const yOffset = 0.06 + ((this.vehiculo.codigo || 1) * 0.002);
            mesh.position.set(paso.col, yOffset, paso.fila);
            this.trailGroup.add(mesh);
        }
    }
    
    recalculatePath() {
        this.path = [];
        this.pathIndex = 0;

        if (this.parada && !this.pasoParada) {
            // Ir a la parada primero
            const ok1 = buscarRuta(this.current, this.parada, this.vehiculo, this.mision, this.prioridad);
            if (ok1) {
                for (let i = 0; i < Ruta.cantidadPasosGlobal; i++) {
                    this.path.push({ fila: Ruta.rutaGlobalFilas[i], col: Ruta.rutaGlobalColumnas[i] });
                }
            }
            
            // Y luego de la parada al destino
            const ok2 = buscarRuta(this.parada, this.destino, this.vehiculo, this.mision, this.prioridad);
            if (ok2) {
                for (let i = 1; i < Ruta.cantidadPasosGlobal; i++) { // Evitar duplicar el nodo de la parada
                    this.path.push({ fila: Ruta.rutaGlobalFilas[i], col: Ruta.rutaGlobalColumnas[i] });
                }
            }
        } else {
            // Directo al destino
            const ok = buscarRuta(this.current, this.destino, this.vehiculo, this.mision, this.prioridad);
            if (ok) {
                for (let i = 0; i < Ruta.cantidadPasosGlobal; i++) {
                    this.path.push({ fila: Ruta.rutaGlobalFilas[i], col: Ruta.rutaGlobalColumnas[i] });
                }
            }
        }
    }
    
    update(eventosEnMapa) {
        if (this.isFinished || this.path.length === 0) return;
        
        // Simular reducción de velocidad (ej: al pasar por un speed bump)
        if (this._skipNextTick) {
            this._skipNextTick = false;
            return;
        }
        
        if (this.pathIndex < this.path.length) {
            const nextStep = this.path[this.pathIndex];
            
            // Verificar semáforo
            if (window.mapRenderer) {
                const semaforo = window.mapRenderer.getSemaforoEstado(nextStep.fila, nextStep.col);
                if (semaforo === 0) { // 0 es Rojo
                    // Vehículos normales se detienen, vehículos de emergencia ignoran
                    if (!this.vehiculo.ignoraTrafico) {
                        return; // Saltar el tick (detenido)
                    }
                } else if (semaforo === 1) { // 1 es Amarillo
                    // Probabilidad de detenerse en amarillo
                    if (!this.vehiculo.ignoraTrafico && Math.random() > 0.5) {
                        return; // Saltar el tick
                    }
                }
            }
            
            // Verificar eventos dinámicos en los próximos 3 pasos
            let estaBloqueado = false;
            let distanciaPeaton = -1;
            
            for (let offset = 0; offset < 3; offset++) {
                if (this.pathIndex + offset >= this.path.length) break;
                const checkStep = this.path[this.pathIndex + offset];
                
                for (const evt of eventosEnMapa) {
                    if (evt.fila === checkStep.fila && evt.col === checkStep.col) {
                        if (evt.tipo === 'PEATON' && !this.vehiculo.ignoraTrafico) {
                            estaBloqueado = true;
                            distanciaPeaton = offset;
                            break;
                        } else if (evt.tipo === 'ACCIDENTE' || evt.tipo === 'OBRA') {
                            if (offset === 0) {
                                // Obstáculo inminente: Recalcular ruta
                                Mapa.mapaObstaculos[evt.fila][evt.col] = { transitable: false, id: 6 }; // Falsificamos obs temporal
                                this.recalculatePath();
                                Mapa.mapaObstaculos[evt.fila][evt.col] = null; // Limpiar
                                return; // Esperamos al siguiente frame
                            }
                        }
                    }
                }
                if (estaBloqueado) break;
            }
            
            if (estaBloqueado && distanciaPeaton === 0) {
                // Peatón justo enfrente: Frenar por completo, esperar, penalizar batería por ralentí
                this.bateria -= 0.1;
                this.consumoTotal += 0.1;
                this.costoRuta += 2.0; // Aumentar costo / tiempo de viaje
                return;
            } else if (estaBloqueado && distanciaPeaton > 0) {
                // Peatón más adelante: Simular frenado progresivo saltando el tick (reduce vel. a la mitad)
                if (Math.random() > 0.5) {
                    return;
                }
            }

            // Moverse al paso
            this.current = nextStep;

            if (this.parada && this.current.fila === this.parada.fila && this.current.col === this.parada.col) {
                this.pasoParada = true;
            }

            // La estela ya está pre-dibujada (trailGroup)

            // Verificar speed bump (reduce velocidad en el siguiente tick)
            if (window.mapRenderer && window.mapRenderer.isSpeedBump(nextStep.fila, nextStep.col)) {
                // Penalización: coste extra y ralentización
                const penalizacion = this.vehiculo.ignoraTrafico ? 0.5 : 1.5;
                this.costoRuta += penalizacion;
                this.consumoTotal += penalizacion * 0.1;
                // Simular desaceleración: saltar el siguiente tick con probabilidad
                if (!this.vehiculo.ignoraTrafico && Math.random() > 0.3) {
                    this._skipNextTick = true;
                }
            }
            
            // Consumo
            const consumoBase = 100.0 / 80.0;
            let factor = 1.0;
            if (matrizTerreno[nextStep.fila][nextStep.col] === 1) factor = 1.5;
            else if (matrizTerreno[nextStep.fila][nextStep.col] === 2) factor = 2.0;
            
            const consumoPaso = (consumoBase * factor * this.vehiculo.consumoBateria) / 5;
            this.bateria -= consumoPaso;
            this.consumoTotal += consumoPaso;
            
            this.pathIndex++;
            
            if (this.pathIndex >= this.path.length) {
                this.isFinished = true;
            }
        }
    }
}
