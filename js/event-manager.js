import { Mapa, COLUMNAS, FILAS } from './mapa.js';

export class EventManager {
    constructor(scene, markerGroup, renderer) {
        this.scene = scene;
        this.markerGroup = markerGroup; // Para añadir visualizaciones de eventos
        this.renderer = renderer; // Referencia al renderer para crear modelos
        this.eventosActivos = [];
        this.tiempoSiguienteEvento = Date.now() + 3000;
        
        // Materiales para eventos
        this.matObra = new THREE.MeshStandardMaterial({ color: 0xff6600 });
        this.matAccidente = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    }

    update() {
        const ahora = Date.now();
        
        // Expirar eventos viejos
        this.eventosActivos = this.eventosActivos.filter(evt => {
            if (ahora > evt.expira) {
                if(evt.mesh) {
                    this.markerGroup.remove(evt.mesh);
                }
                return false;
            }
            return true;
        });

        // Spawnear nuevo evento aleatorio?
        if (ahora > this.tiempoSiguienteEvento) {
            this.generarEventoAleatorio();
            this.tiempoSiguienteEvento = ahora + (Math.random() * 4000 + 3000); // Entre 3 y 7 seg
        }
    }

    generarEventoAleatorio() {
        // Solo generar eventos en calles transitables
        let f, c;
        let intentos = 0;
        do {
            f = Math.floor(Math.random() * FILAS);
            c = Math.floor(Math.random() * COLUMNAS);
            intentos++;
        } while (intentos < 20 && Mapa.mapaObstaculos[f][c] && !Mapa.mapaObstaculos[f][c].transitable);

        if (intentos >= 20) return;

        const tipoAleatorio = Math.random();
        let evtTipo, duracion, mesh;

        if (tipoAleatorio < 0.4) {
            // Peatón cruzando 
            evtTipo = 'PEATON';
            duracion = 3000;
            // Usar modelo real si el renderer lo permite
            if (this.renderer && this.renderer.crearPeatonIndividual) {
                mesh = this.renderer.crearPeatonIndividual();
                mesh.position.set(c, 0, f);
                this.markerGroup.add(mesh);
            }
        } else if (tipoAleatorio < 0.7) {
            // Obra rápida
            evtTipo = 'OBRA';
            duracion = 6000;
            const geo = new THREE.ConeGeometry(0.3, 0.6, 16);
            mesh = new THREE.Mesh(geo, this.matObra);
            mesh.position.set(c, 0.3, f);
            this.markerGroup.add(mesh);
        } else {
            // Accidente
            evtTipo = 'ACCIDENTE';
            duracion = 8000;
            const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            mesh = new THREE.Mesh(geo, this.matAccidente);
            mesh.position.set(c, 0.25, f);
            this.markerGroup.add(mesh);
        }

        this.eventosActivos.push({
            fila: f,
            col: c,
            tipo: evtTipo,
            expira: Date.now() + duracion,
            mesh: mesh
        });
    }

    getEventos() {
        return this.eventosActivos;
    }
    
    limpiar() {
        this.eventosActivos.forEach(e => {
            if(e.mesh) this.markerGroup.remove(e.mesh);
        });
        this.eventosActivos = [];
    }
}
