/**
 * MapRenderer - Renderizado del mapa en 3D usando Three.js
 * Reemplaza el anterior canvas 2D por una escena tridimensional interactiva.
 */

import { Mapa, FILAS, COLUMNAS, matrizTerreno } from './mapa.js';
import { Ruta } from './ruta.js';
import { TipoObstaculo, OBSTACULOS_ARRAY } from './obstaculo.js';
import { CameraController } from './camera-controller.js';
import { ModelLoader, ARCHIVOS_MODELOS } from './model-loader.js';

// Materiales predefinidos para optimizar rendimiento
const MATERIALES = {
    terrenoNormal: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9, metalness: 0.1 }),
    terrenoBarro: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }),
    terrenoInundacion: new THREE.MeshStandardMaterial({ color: 0x1a4a6e, roughness: 0.2, metalness: 0.5 }),
    terrenoPasto: new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 1.0, metalness: 0.0 }), // Verde tipo pasto
    
    obsBloqueo: new THREE.MeshStandardMaterial({ color: 0x8957e5, roughness: 0.5 }),
    obsTrafico: new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.6 }),
    obsIncidencia: new THREE.MeshStandardMaterial({ color: 0xe650a0, roughness: 0.5 }),
    obsServicios: new THREE.MeshStandardMaterial({ color: 0x46a0f0, roughness: 0.5 }),
    
    inicio: new THREE.MeshStandardMaterial({ color: 0x23862e, emissive: 0x23862e, emissiveIntensity: 0.4 }),
    destino: new THREE.MeshStandardMaterial({ color: 0xda3633, emissive: 0xda3633, emissiveIntensity: 0.4 }),
    parada: new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.4 }),
    ruta: new THREE.MeshStandardMaterial({ color: 0x58a6ff, emissive: 0x58a6ff, emissiveIntensity: 0.6 }),
    
    vehiculo: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2 }),
    peaton: new THREE.MeshStandardMaterial({ color: 0xe6edf3, roughness: 0.8 })
};

export class MapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.edicionBloqueada = false;
        this.onCambioCoordenada = null;

        this.inicio = { fila: 0, col: 0 };
        this.destino = { fila: 34, col: 49 };
        this.parada = null;
        this.posicionVehiculo = { fila: 0, col: 0 };

        this._initThree();
        this._setupMouseEvents();
        this._setupResizeObserver();
        
        // Loop de animación
        this.animFrameId = null;
        this._animate();

        // Iniciar carga de modelos GLB en segundo plano
        this._initModelLoader();
    }

    async _initModelLoader() {
        await ModelLoader.init(ARCHIVOS_MODELOS);
        console.log('[Renderer] Modelos Poly Pizza listos. Reemplazando fallbacks...');
        
        // Reemplazar peatones cilindro por modelos reales
        this._reemplazarPeatonesConModelos();
        
        // Reconstruir el mapa para usar modelos de edificios
        this._reconstruirMapa();
        
        // Si hay un vehículo por defecto visible, reemplazarlo también
        if (this.vehiculosMesh.length > 0 && this.agentes.length === 0) {
            const oldMesh = this.vehiculoMesh;
            const newMesh = this._crearVehiculo(null);
            newMesh.position.copy(oldMesh.position);
            newMesh.rotation.copy(oldMesh.rotation);
            this.scene.remove(oldMesh);
            this.vehiculosMesh = [newMesh];
            this.vehiculoMesh = newMesh;
            this.cameraController.setVehiculo(newMesh);
        }
    }

    _initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d1117);
        this.scene.fog = new THREE.Fog(0x0d1117, 20, 60);

        this.camera = new THREE.PerspectiveCamera(50, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        
        const isMobile = window.innerWidth <= 900;
        const maxPixelRatio = isMobile ? 1.5 : 2;
        
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
        this.renderer.shadowMap.enabled = !isMobile;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.cameraController = new CameraController(this.camera, this.canvas);

        // Iluminación mejorada para una ciudad más realista
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
        dirLight.position.set(15, 30, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -22;
        dirLight.shadow.camera.right = 22;
        dirLight.shadow.camera.top = 22;
        dirLight.shadow.camera.bottom = -22;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 60;
        this.scene.add(dirLight);

        // Luz de relleno desde el lado opuesto
        const fillLight = new THREE.DirectionalLight(0x88aacc, 0.3);
        fillLight.position.set(-10, 15, -10);
        this.scene.add(fillLight);

        // Geometría base para celdas
        this.celdaGeo = new THREE.BoxGeometry(0.95, 0.1, 0.95);
        this.celdaMeshGroup = new THREE.Group();
        this.scene.add(this.celdaMeshGroup);

        // Cuadrícula sutil
        const gridHelper = new THREE.GridHelper(COLUMNAS, COLUMNAS, 0x555555, 0x444444);
        gridHelper.position.set(COLUMNAS / 2 - 0.5, 0.06, FILAS / 2 - 0.5);
        this.scene.add(gridHelper);

        // Geometría para obstáculos
        this.obsGroup = new THREE.Group();
        this.scene.add(this.obsGroup);

        // Marcadores (Inicio, Fin, Parada, Ruta)
        this.marcadoresGroup = new THREE.Group();
        this.scene.add(this.marcadoresGroup);

        // Vehículo inicial por defecto
        this.vehiculosMesh = [];
        this.vehiculoMesh = this._crearVehiculo(null); 
        this.vehiculosMesh.push(this.vehiculoMesh);
        this.cameraController.setVehiculo(this.vehiculoMesh);
        
        this.peatones = [];
        this._crearPeatones();

        // Semáforos dinámicos
        this.semaforos = [];

        // Agentes de Simulación
        this.agentes = [];

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this._reconstruirMapa();
    }

    setAgentes(listaAgentes) {
        this.agentes = listaAgentes;
        // Limpiar mallas antiguas y estelas
        for(let mesh of this.vehiculosMesh) {
            this.scene.remove(mesh);
        }
        if (this.trailGroups) {
            for(let group of this.trailGroups) {
                this.scene.remove(group);
            }
        }
        this.vehiculosMesh = [];
        this.trailGroups = [];

        // Registrar nuevas mallas
        if (listaAgentes.length === 0) {
            this.vehiculoMesh = this._crearVehiculo(null);
            this.vehiculosMesh.push(this.vehiculoMesh);
            this.cameraController.setVehiculo(this.vehiculoMesh);
        } else {
            for(let a of listaAgentes) {
                this.vehiculosMesh.push(a.mesh);
                if (a.trailGroup) {
                    this.scene.add(a.trailGroup);
                    this.trailGroups.push(a.trailGroup);
                }
            }
            this.vehiculoMesh = this.vehiculosMesh[0];
            this.cameraController.setVehiculo(this.vehiculoMesh);
        }
    }

    _crearVehiculo(tipo) {
        const codigo = tipo ? tipo.codigo : 1;

        // Intentar usar modelo GLB real si está cargado
        if (ModelLoader.isReady) {
            const glbClone = ModelLoader.getVehiculo(codigo);
            if (glbClone) {
                const wrapper = new THREE.Group();
                wrapper.add(glbClone);
                wrapper.castShadow = true;

                // Añadir luces de emergencia para ambulancia y policía
                if (codigo === 2) {
                    const pointLight = new THREE.PointLight(0xff0000, 1.5, 4);
                    pointLight.position.set(0, 0.6, 0);
                    wrapper.add(pointLight);
                    wrapper.userData.emergencyLight = pointLight;
                } else if (codigo === 4) {
                    const pointLight = new THREE.PointLight(0x0000ff, 1.5, 4);
                    pointLight.position.set(0, 0.6, 0);
                    wrapper.add(pointLight);
                    wrapper.userData.emergencyLight = pointLight;
                }

                this.scene.add(wrapper);
                return wrapper;
            }
        }

        // === FALLBACK: Modelos Low-Poly programáticos ===
        return this._crearVehiculoFallback(tipo);
    }

    /** Fallback low-poly cuando los modelos GLB no están disponibles */
    _crearVehiculoFallback(tipo) {
        const group = new THREE.Group();
        let bodyGeo, bodyMat;

        let colorMain = 0xffd700;
        let isAmbulancia = false;
        let isBomberos = false;
        let isPolicia = false;
        let isReparto = false;

        if (tipo) {
            if (tipo.codigo === 2) { colorMain = 0xffffff; isAmbulancia = true; }
            if (tipo.codigo === 3) { colorMain = 0xff3333; isBomberos = true; }
            if (tipo.codigo === 4) { colorMain = 0x3333ff; isPolicia = true; }
            if (tipo.codigo === 5) { colorMain = 0xd97b29; isReparto = true; }
        }

        const mainMat = new THREE.MeshStandardMaterial({ color: colorMain, roughness: 0.3, metalness: 0.2 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7, metalness: 0.9 });

        if (isAmbulancia) {
            bodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.8);
            const body = new THREE.Mesh(bodyGeo, mainMat);
            body.position.y = 0.25;
            body.castShadow = true;
            group.add(body);
            const lightGeo = new THREE.BoxGeometry(0.3, 0.05, 0.1);
            const lightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(0, 0.48, 0);
            group.add(light);
            const pointLight = new THREE.PointLight(0xff0000, 1.5, 3);
            pointLight.position.set(0, 0.6, 0);
            group.add(pointLight);
            group.userData.emergencyLight = pointLight;
        } else if (isBomberos) {
            bodyGeo = new THREE.BoxGeometry(0.6, 0.5, 1.0);
            const body = new THREE.Mesh(bodyGeo, mainMat);
            body.position.y = 0.3;
            body.castShadow = true;
            group.add(body);
            const escGeo = new THREE.BoxGeometry(0.2, 0.1, 0.9);
            const escMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });
            const escalera = new THREE.Mesh(escGeo, escMat);
            escalera.position.set(0, 0.6, -0.05);
            group.add(escalera);
        } else if (isPolicia) {
            bodyGeo = new THREE.BoxGeometry(0.45, 0.25, 0.7);
            const body = new THREE.Mesh(bodyGeo, mainMat);
            body.position.y = 0.15;
            body.castShadow = true;
            group.add(body);
            const cabGeo = new THREE.BoxGeometry(0.35, 0.15, 0.35);
            const cabin = new THREE.Mesh(cabGeo, glassMat);
            cabin.position.set(0, 0.32, -0.05);
            group.add(cabin);
            const lightGeo = new THREE.BoxGeometry(0.25, 0.04, 0.08);
            const lightMat = new THREE.MeshStandardMaterial({ color: 0x0000ff, emissive: 0x0000ff });
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(0, 0.42, -0.05);
            group.add(light);
            const pointLight = new THREE.PointLight(0x0000ff, 1.5, 3);
            pointLight.position.set(0, 0.5, -0.05);
            group.add(pointLight);
            group.userData.emergencyLight = pointLight;
        } else if (isReparto) {
            const cabGeo = new THREE.BoxGeometry(0.4, 0.35, 0.3);
            const cabin = new THREE.Mesh(cabGeo, new THREE.MeshStandardMaterial({ color: 0xdddddd }));
            cabin.position.set(0, 0.25, 0.25);
            cabin.castShadow = true;
            group.add(cabin);
            const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.6);
            const box = new THREE.Mesh(boxGeo, mainMat);
            box.position.set(0, 0.35, -0.2);
            box.castShadow = true;
            group.add(box);
        } else {
            bodyGeo = new THREE.BoxGeometry(0.45, 0.25, 0.7);
            const body = new THREE.Mesh(bodyGeo, mainMat);
            body.position.y = 0.15;
            body.castShadow = true;
            group.add(body);
            const cabGeo = new THREE.BoxGeometry(0.35, 0.15, 0.35);
            const cabin = new THREE.Mesh(cabGeo, glassMat);
            cabin.position.set(0, 0.32, -0.05);
            group.add(cabin);
            const letreroGeo = new THREE.BoxGeometry(0.15, 0.05, 0.05);
            const letrero = new THREE.Mesh(letreroGeo, blackMat);
            letrero.position.set(0, 0.42, -0.05);
            group.add(letrero);
        }

        // Llantas comunes
        const llantaGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8);
        llantaGeo.rotateZ(Math.PI / 2);
        let xOffset = 0.25;
        if(isBomberos) xOffset = 0.32;
        if(isReparto) xOffset = 0.28;
        const posicionesLlantas = [
            [-xOffset, 0.08, 0.2], [xOffset, 0.08, 0.2],
            [-xOffset, 0.08, -0.2], [xOffset, 0.08, -0.2]
        ];
        posicionesLlantas.forEach(pos => {
            const llanta = new THREE.Mesh(llantaGeo, blackMat);
            llanta.position.set(pos[0], pos[1], pos[2]);
            group.add(llanta);
        });

        this.scene.add(group);
        return group;
    }

    _isWalkableForPedestrian(f, c) {
        if(f < 0 || f >= FILAS || c < 0 || c >= COLUMNAS) return false;
        const obs = Mapa.mapaObstaculos[f][c];
        if (!obs) return true;
        // 1 (Calle Cerrada/Valla) y 6 (Obra/Edificio) bloquean físicamente a los peatones
        if (obs.id === 1 || obs.id === 6) return false;
        return true;
    }

    _crearPeatones() {
        // Crear peatones con fallback de cilindros (serán reemplazados cuando los GLB carguen)
        const peatonGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        for(let i=0; i<15; i++) {
            const peaton = new THREE.Mesh(peatonGeo, MATERIALES.peaton);
            peaton.castShadow = true;
            
            // Posicionar en una celda transitable inicialmente
            let f, c;
            let attempts = 0;
            do {
                f = Math.floor(Math.random() * FILAS);
                c = Math.floor(Math.random() * COLUMNAS);
                attempts++;
            } while(!this._isWalkableForPedestrian(f, c) && attempts < 100);

            peaton.position.set(c, 0, f);
            peaton.userData = {
                target: new THREE.Vector3(c, 0, f),
                currentCell: {f, c},
                speed: 0.015 + Math.random() * 0.015,
                isFallback: true,
                animPhase: Math.random() * Math.PI * 2 // Para balanceo
            };
            this.scene.add(peaton);
            this.peatones.push(peaton);
        }
    }

    /** Reemplaza los cilindros por modelos GLB reales de peatones */
    _reemplazarPeatonesConModelos() {
        if (!ModelLoader.isReady || ModelLoader.peatones.length === 0) return;

        const nuevosPeatones = [];
        for (const oldPeaton of this.peatones) {
            const modelo = ModelLoader.getPeaton();
            if (!modelo) {
                nuevosPeatones.push(oldPeaton);
                continue;
            }

            // Wrapper para mantener la misma API de posición/userData
            const wrapper = new THREE.Group();
            wrapper.add(modelo);
            wrapper.position.copy(oldPeaton.position);
            wrapper.castShadow = true;
            wrapper.userData = { ...oldPeaton.userData, isFallback: false };

            this.scene.remove(oldPeaton);
            this.scene.add(wrapper);
            nuevosPeatones.push(wrapper);
        }
        this.peatones = nuevosPeatones;
    }

    /** Crea un peatón individual (para EventManager) */
    crearPeatonIndividual() {
        if (ModelLoader.isReady) {
            const modelo = ModelLoader.getPeaton();
            if (modelo) {
                const wrapper = new THREE.Group();
                wrapper.add(modelo);
                wrapper.castShadow = true;
                wrapper.userData = { isFallback: false, animPhase: Math.random() * Math.PI * 2 };
                return wrapper;
            }
        }
        // Fallback cilindro
        const peatonGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        const peaton = new THREE.Mesh(peatonGeo, MATERIALES.peaton);
        peaton.castShadow = true;
        peaton.userData = { isFallback: true, animPhase: Math.random() * Math.PI * 2 };
        return peaton;
    }

    _reconstruirMapa() {
        // Limpiar grupos
        while(this.celdaMeshGroup.children.length > 0){ 
            this.celdaMeshGroup.remove(this.celdaMeshGroup.children[0]); 
        }
        while(this.obsGroup.children.length > 0){ 
            this.obsGroup.remove(this.obsGroup.children[0]); 
        }

        this.semaforos = []; // Resetear semáforos

        // Material para aceras
        const matAcera = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
        // Material para lineas de carretera
        const matLinea = new THREE.MeshStandardMaterial({ color: 0xcccc66, emissive: 0xcccc66, emissiveIntensity: 0.1 });

        // Crear celdas base y terrenos
        for (let f = 0; f < FILAS; f++) {
            for (let c = 0; c < COLUMNAS; c++) {
                let mat = MATERIALES.terrenoNormal;
                if (matrizTerreno[f][c] === 1) mat = MATERIALES.terrenoBarro;
                else if (matrizTerreno[f][c] === 2) mat = MATERIALES.terrenoInundacion;

                const celda = new THREE.Mesh(this.celdaGeo, mat);
                celda.position.set(c, 0, f);
                celda.receiveShadow = true;
                celda.userData = { fila: f, col: c, tipo: 'celda' };
                this.celdaMeshGroup.add(celda);

                // Crear obstáculos
                const obs = Mapa.mapaObstaculos[f][c];
                if (obs && obs.id !== 0) {
                    let alto = 0.5;
                    let obsMat = MATERIALES.obsServicios;
                    
                    if (obs.id === 1 || obs.id === 6) { obsMat = MATERIALES.obsBloqueo; alto = 2.0; }
                    else if (obs.id === 2 || obs.id === 3) { obsMat = MATERIALES.obsTrafico; alto = 0.8; }
                    else if (obs.id === 4 || obs.id === 5) { obsMat = MATERIALES.obsIncidencia; alto = 0.4; }

                    // Intentar usar modelo GLB para edificios (obs.id 6)
                    if (obs.id === 6 && ModelLoader.isReady && ModelLoader.edificios.length > 0) {
                        const edificioModel = ModelLoader.getEdificio();
                        if (edificioModel) {
                            edificioModel.position.set(c, 0, f);
                            // Rotación aleatoria múltiplo de 90° para variedad
                            edificioModel.rotation.y = (Math.floor(Math.random() * 4)) * (Math.PI / 2);
                            this.obsGroup.add(edificioModel);
                        } else {
                            this._agregarObsFallback(c, f, alto, obsMat);
                        }
                    } else if (obs.id === 1 && ModelLoader.isReady && ModelLoader.vallas.length > 0) {
                        // Calle cerrada (Fence End)
                        const valla = ModelLoader.getValla();
                        if (valla) {
                            valla.position.set(c, 0, f);
                            valla.rotation.y = Math.random() > 0.5 ? 0 : Math.PI / 2;
                            this.obsGroup.add(valla);
                        } else {
                            this._agregarObsFallback(c, f, alto, obsMat);
                        }
                    } else if ((obs.id === 2 || obs.id === 3) && ModelLoader.isReady) {
                        // Semáforo para tráfico ligero y pesado (afecta batería/tiempo)
                        this._crearSemaforo3D(c, f);
                    } else if ((obs.id === 4 || obs.id === 5 || obs.id === 11) && ModelLoader.isReady && ModelLoader.speedBumps.length > 0) {
                        // Speed bump explícito para incidencias, baches y policías acostados (afecta batería/tiempo)
                        const bump = ModelLoader.getSpeedBump();
                        if (bump) {
                            bump.position.set(c, 0, f);
                            bump.rotation.y = Math.random() > 0.5 ? 0 : Math.PI / 2;
                            this.obsGroup.add(bump);
                        }
                    }
                } else if (obs && obs.id === 0) {
                    // Celda libre: distribuir decoraciones para llenar la ciudad
                    this._decorarCeldaLibre(f, c);
                }
            }
        }

        this._crearBosqueExterior();
        this.actualizarRuta();
    }

    /** Crea un bosque decorativo en el exterior de la cuadrícula de la ciudad */
    _crearBosqueExterior() {
        if (!ModelLoader.isReady || ModelLoader.decoraciones.length === 0) return;
        
        // El usuario pidió colocar árboles grandes SOLO arriba y abajo del mapa
        // y con un suelo de pasto verde.
        const GROSOR_CONTORNO = 2;
        
        for (let f = -GROSOR_CONTORNO; f < FILAS + GROSOR_CONTORNO; f++) {
            for (let c = 0; c < COLUMNAS; c++) {
                // Si la fila pertenece al centro de la ciudad (altura de los edificios), la ignoramos.
                // Esto hace que NO se generen árboles a los lados (izquierda/derecha).
                if (f >= 0 && f < FILAS) continue;
                
                // 1. Crear el suelo verde (pasto) para el contorno
                const celda = new THREE.Mesh(this.celdaGeo, MATERIALES.terrenoPasto);
                celda.position.set(c, 0, f);
                this.celdaMeshGroup.add(celda);
                
                // 2. Alta probabilidad para que el contorno superior e inferior se vea poblado
                if (Math.random() < 0.65) {
                    const arbol = ModelLoader.getDecoracion();
                    if (arbol) {
                        // Posición con un poco de aleatoriedad para naturalidad
                        const offsetX = (Math.random() - 0.5) * 0.4;
                        let offsetZ = (Math.random() - 0.5) * 0.4;
                        
                        // Empujar los árboles hacia afuera para que sus ramas grandes no invadan la calle
                        if (f < 0) offsetZ -= 0.5; // Hacia afuera (arriba)
                        if (f >= FILAS) offsetZ += 0.5; // Hacia afuera (abajo)
                        
                        arbol.position.set(c + offsetX, 0, f + offsetZ);
                        
                        // Rotación y escala aleatoria (Árboles mucho más GRANDES)
                        arbol.rotation.y = Math.random() * Math.PI * 2;
                        const escalaRandom = 1.5 + Math.random() * 1.2; // Escala base 1.5 hasta 2.7
                        arbol.scale.multiplyScalar(escalaRandom);
                        
                        this.obsGroup.add(arbol);
                    }
                }
            }
        }
    }

    /** Actualiza sólo los marcadores y la ruta sin reconstruir los edificios */
    actualizarRuta() {
        while(this.marcadoresGroup.children.length > 0){ 
            this.marcadoresGroup.remove(this.marcadoresGroup.children[0]); 
        }

        // La ruta verde global ya no se dibuja aquí.
        // Ahora cada SimulationAgent dibuja su propia ruta con su color en su trailGroup.

        // Marcadores Especiales
        const agregarMarcador = (f, c, mat) => {
            if(f===undefined || c===undefined) return;
            const geo = new THREE.BoxGeometry(0.7, 0.15, 0.7);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(c, 0.08, f);
            this.marcadoresGroup.add(mesh);
        };

        if (this.inicio) agregarMarcador(this.inicio.fila, this.inicio.col, MATERIALES.inicio);
        if (this.destino) agregarMarcador(this.destino.fila, this.destino.col, MATERIALES.destino);
        if (this.parada) agregarMarcador(this.parada.fila, this.parada.col, MATERIALES.parada);
    }

    /** Agrega un obstáculo fallback (cubo) */
    _agregarObsFallback(c, f, alto, obsMat) {
        const obsGeo = new THREE.BoxGeometry(0.8, alto, 0.8);
        const obsMesh = new THREE.Mesh(obsGeo, obsMat);
        obsMesh.position.set(c, alto / 2 + 0.05, f);
        obsMesh.castShadow = true;
        obsMesh.receiveShadow = true;
        this.obsGroup.add(obsMesh);
    }

    /** Crea un semáforo 3D en la posición dada y lo registra para ser dinámico */
    _crearSemaforo3D(c, f) {
        const posteGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6);
        const posteMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
        const poste = new THREE.Mesh(posteGeo, posteMat);
        poste.position.set(c, 0.4, f);
        poste.castShadow = true;
        this.obsGroup.add(poste);

        const cajaGeo = new THREE.BoxGeometry(0.12, 0.25, 0.08);
        const cajaMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const caja = new THREE.Mesh(cajaGeo, cajaMat);
        caja.position.set(c, 0.7, f);
        this.obsGroup.add(caja);

        // Luces (Rojo, Amarillo, Verde) apagadas por defecto
        const luzGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const luces = [];
        const offsetsY = [0.08, 0, -0.08]; // Arriba (Rojo), Medio (Amarillo), Abajo (Verde)
        
        for (let i = 0; i < 3; i++) {
            const luzMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x000000 });
            const luz = new THREE.Mesh(luzGeo, luzMat);
            luz.position.set(c, 0.7 + offsetsY[i], f + 0.04);
            this.obsGroup.add(luz);
            luces.push(luz);
        }

        // Desfase aleatorio para que no todos cambien al mismo tiempo
        const offsetTiempo = Math.random() * 10000;
        
        this.semaforos.push({
            fila: f,
            col: c,
            luces: luces,
            offsetTiempo: offsetTiempo,
            estadoActual: -1 // 0=Rojo, 1=Amarillo, 2=Verde
        });
    }

    /** Actualiza el estado de los semáforos basándose en el tiempo */
    _updateSemaforos(time) {
        // Ciclo total: 10 segundos (4s Verde, 1.5s Amarillo, 4.5s Rojo)
        const CICLO_MS = 10000;
        
        for (const sem of this.semaforos) {
            const t = (time + sem.offsetTiempo) % CICLO_MS;
            
            let nuevoEstado = 0; // Rojo por defecto
            if (t < 4000) nuevoEstado = 2; // Verde
            else if (t < 5500) nuevoEstado = 1; // Amarillo
            
            if (nuevoEstado !== sem.estadoActual) {
                sem.estadoActual = nuevoEstado;
                
                // Apagar todas
                sem.luces[0].material.color.setHex(0x330000); sem.luces[0].material.emissive.setHex(0x000000);
                sem.luces[1].material.color.setHex(0x333300); sem.luces[1].material.emissive.setHex(0x000000);
                sem.luces[2].material.color.setHex(0x003300); sem.luces[2].material.emissive.setHex(0x000000);
                
                // Encender la activa
                if (nuevoEstado === 0) {
                    sem.luces[0].material.color.setHex(0xff0000); sem.luces[0].material.emissive.setHex(0xff0000);
                } else if (nuevoEstado === 1) {
                    sem.luces[1].material.color.setHex(0xffaa00); sem.luces[1].material.emissive.setHex(0xffaa00);
                } else if (nuevoEstado === 2) {
                    sem.luces[2].material.color.setHex(0x00ff00); sem.luces[2].material.emissive.setHex(0x00ff00);
                }
            }
        }
    }

    /** Retorna el estado del semáforo en esa celda (0=Rojo, 1=Amarillo, 2=Verde), o -1 si no hay */
    getSemaforoEstado(fila, col) {
        const sem = this.semaforos.find(s => s.fila === fila && s.col === col);
        return sem ? sem.estadoActual : -1;
    }

    /** Decora una celda libre con elementos urbanos */
    _decorarCeldaLibre(f, c) {
        if (!ModelLoader.isReady) return;

        // No decorar los bordes del mapa (calles principales)
        const esBorde = f === 0 || f === FILAS - 1 || c === 0 || c === COLUMNAS - 1;
        // No decorar cerca de inicio/destino
        const esInicio = this.inicio && this.inicio.fila === f && this.inicio.col === c;
        const esDestino = this.destino && this.destino.fila === f && this.destino.col === c;
        const esParada = this.parada && this.parada.fila === f && this.parada.col === c;
        if (esInicio || esDestino || esParada) return;

        const rand = Math.random();

        if (rand < 0.05 && ModelLoader.speedBumps.length > 0) {
            // Speed bumps esparcidos en calles internas (~5%)
            const bump = ModelLoader.getSpeedBump();
            if (bump) {
                bump.position.set(c, 0, f);
                bump.rotation.y = Math.random() > 0.5 ? 0 : Math.PI / 2;
                this.obsGroup.add(bump);
                // Marcar la celda como speed bump para la simulación
                if (!this._speedBumpCells) this._speedBumpCells = new Set();
                this._speedBumpCells.add(`${f},${c}`);
            }
        }
    }

    /** Verifica si una celda tiene un speed bump (aleatorio o explícito) */
    isSpeedBump(fila, col) {
        // Verificar si es un obstáculo explícito
        if (Mapa.mapaObstaculos[fila] && Mapa.mapaObstaculos[fila][col]) {
            if (Mapa.mapaObstaculos[fila][col].id === 11) return true;
        }
        // Verificar si es una decoración aleatoria
        if (!this._speedBumpCells) return false;
        return this._speedBumpCells.has(`${fila},${col}`);
    }

    _setupResizeObserver() {
        const ro = new ResizeObserver(() => this.resize());
        ro.observe(this.canvas.parentElement || this.canvas);
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }

    _setupMouseEvents() {
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        this.canvas.addEventListener('mousedown', (e) => {
            // Ignorar si estamos moviendo la cámara (botón medio, ctrl+clic o espacio) o si está bloqueado
            if (this.edicionBloqueada || e.button === 1 || (e.button === 0 && e.ctrlKey) || (this.cameraController && this.cameraController.isSpaceDown)) return;

            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.celdaMeshGroup.children);

            if (intersects.length > 0) {
                const celda = intersects[0].object;
                const fila = celda.userData.fila;
                const col = celda.userData.col;

                if (e.button === 0) { // Izq
                    const obs = Mapa.mapaObstaculos[fila][col];
                    const childrenToRemove = this.obsGroup.children.filter(child => {
                        return Math.abs(child.position.x - col) < 0.1 && Math.abs(child.position.z - fila) < 0.1;
                    });
                    
                    if (childrenToRemove.length > 0 || (obs && obs.id !== 0)) {
                        // Hay un obstáculo lógico o visual (decoración/edificio), eliminarlo
                        if (obs && obs.id !== 0) {
                            Mapa.mapaObstaculos[fila][col] = null;
                        }
                        childrenToRemove.forEach(child => this.obsGroup.remove(child));
                        
                        // Si eliminamos algo, también limpiar de speedBumpCells
                        if (this._speedBumpCells) this._speedBumpCells.delete(`${fila},${col}`);
                    } else {
                        // Celda completamente vacía -> Mover inicio
                        this.inicio = { fila, col };
                        this.posicionVehiculo = { fila, col };
                    }
                } else if (e.button === 2) { // Der
                    this.destino = { fila, col };
                }

                // Parada con tecla 'meta' o dblclick? Vamos a hacerlo con 'p' key
                // Pero respetemos la lógica del e.ctrlKey si el user lo suelta rápido.
                
                Mapa.asegurarAccesibilidad(this.inicio, this.destino);
                Ruta.reiniciar();
                this.actualizarRuta();

                if (this.onCambioCoordenada) {
                    this.onCambioCoordenada(this.inicio, this.parada, this.destino);
                }
            }
        });

        // ==========================================
        // TOUCH EVENTS (Soporte para Móviles para Seleccionar Puntos)
        // ==========================================
        let touchTimer = null;
        let touchStartPos = { x: 0, y: 0 };
        
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.edicionBloqueada || e.touches.length > 1) return; // Si hay 2 dedos, está rotando/panneando
            
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            
            // Iniciar timer para detectar long press (clic derecho)
            touchTimer = setTimeout(() => {
                this._handleCanvasTap(touchStartPos.x, touchStartPos.y, 2); // 2 = Destino
                touchTimer = null;
            }, 500); // 500ms para considerar long press
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!touchTimer) return;
            // Si el dedo se mueve mucho, cancelar el long press
            const dx = e.touches[0].clientX - touchStartPos.x;
            const dy = e.touches[0].clientY - touchStartPos.y;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (touchTimer) {
                // Si el timer sigue activo al soltar, fue un tap corto (clic izquierdo)
                clearTimeout(touchTimer);
                touchTimer = null;
                this._handleCanvasTap(touchStartPos.x, touchStartPos.y, 0); // 0 = Inicio/Obstáculo
            }
        });
        
        // Manejar parada con una tecla para no interferir con la cámara
        window.addEventListener('keydown', (e) => {
            if(e.key.toLowerCase() === 'p' && !this.edicionBloqueada) {
                // Agregar parada en la pos del raton
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObjects(this.celdaMeshGroup.children);
                if (intersects.length > 0) {
                    const celda = intersects[0].object;
                    const fila = celda.userData.fila;
                    const col = celda.userData.col;
                    
                    if (this.parada && this.parada.fila === fila && this.parada.col === col) {
                        this.parada = null;
                    } else {
                        const obs = Mapa.mapaObstaculos[fila][col];
                        if (!obs || obs.transitable) {
                            this.parada = { fila, col };
                        }
                    }
                    Mapa.asegurarAccesibilidad(this.inicio, this.destino);
                    Ruta.reiniciar();
                    this.actualizarRuta();
                    if (this.onCambioCoordenada) this.onCambioCoordenada(this.inicio, this.parada, this.destino);
                }
            }
        });

        // Actualizar mouse coords
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        });
    }

    _handleCanvasTap(clientX, clientY, buttonType) {
        if (this.edicionBloqueada) return;

        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.celdaMeshGroup.children);

        if (intersects.length > 0) {
            const celda = intersects[0].object;
            const fila = celda.userData.fila;
            const col = celda.userData.col;

            if (buttonType === 0) { // Izq (Tap Corto)
                const obs = Mapa.mapaObstaculos[fila][col];
                const childrenToRemove = this.obsGroup.children.filter(child => {
                    return Math.abs(child.position.x - col) < 0.1 && Math.abs(child.position.z - fila) < 0.1;
                });
                
                if (childrenToRemove.length > 0 || (obs && obs.id !== 0)) {
                    if (obs && obs.id !== 0) Mapa.mapaObstaculos[fila][col] = null;
                    childrenToRemove.forEach(child => this.obsGroup.remove(child));
                    if (this._speedBumpCells) this._speedBumpCells.delete(`${fila},${col}`);
                } else {
                    this.inicio = { fila, col };
                    this.posicionVehiculo = { fila, col };
                }
            } else if (buttonType === 2) { // Der (Long Press)
                this.destino = { fila, col };
                
                // Mostrar un feedback visual o vibrar en móvil
                if (navigator.vibrate) navigator.vibrate(50);
            }

            Mapa.asegurarAccesibilidad(this.inicio, this.destino);
            Ruta.reiniciar();
            this.actualizarRuta();

            if (this.onCambioCoordenada) {
                this.onCambioCoordenada(this.inicio, this.parada, this.destino);
            }
        }
    }
        


    _animarPeatones() {
        const time = Date.now() * 0.003;
        this.peatones.forEach(p => {
            if (!p.userData || !p.userData.target || !p.userData.currentCell) return;
            const dir = p.userData.target.clone().sub(p.position);
            // Ignorar el eje Y para la distancia
            dir.y = 0;
            const dist = dir.length();
            
            if (dist < 0.05) {
                // Llegamos al objetivo, elegir siguiente celda adyacente que sea transitable
                const curF = p.userData.currentCell.f;
                const curC = p.userData.currentCell.c;
                const neighbors = [
                    {f: curF - 1, c: curC}, {f: curF + 1, c: curC},
                    {f: curF, c: curC - 1}, {f: curF, c: curC + 1}
                ].filter(n => this._isWalkableForPedestrian(n.f, n.c));
                
                if (neighbors.length > 0) {
                    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                    p.userData.currentCell = next;
                    p.userData.target.set(next.c, 0, next.f);
                }
            } else {
                dir.normalize();
                p.position.add(dir.multiplyScalar(p.userData.speed));

                // Rotar peatón hacia la dirección de movimiento
                if (Math.abs(dir.x) > 0.01 || Math.abs(dir.z) > 0.01) {
                    const targetAngle = Math.atan2(dir.x, dir.z);
                    let diff = targetAngle - p.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    p.rotation.y += diff * 0.15; // Suavizar giro
                }

                // Balanceo al caminar
                const phase = p.userData.animPhase || 0;
                if (!p.userData.isFallback) {
                    p.rotation.z = Math.sin(time * 2 + phase) * 0.08;
                }
            }
        });
    }

    _animate(time) {
        this.animFrameId = requestAnimationFrame((t) => this._animate(t));
        
        // Animación de agentes
        if (this.agentes.length > 0) {
            for (let a of this.agentes) {
                this._interpolarVehiculo(a.mesh, a.current);
            }
        } else if (this.posicionVehiculo && this.vehiculoMesh) {
            this._interpolarVehiculo(this.vehiculoMesh, this.posicionVehiculo);
        }

        this._animarPeatones();
        this.cameraController.update();

        // Animar semáforos (usar Date.now() si time es undefined)
        this._updateSemaforos(time || Date.now());

        this.renderer.render(this.scene, this.camera);
    }

    _interpolarVehiculo(mesh, target) {
        if(!mesh || !target) return;
        const targetX = target.col;
        const targetZ = target.fila;
        
        mesh.position.x += (targetX - mesh.position.x) * 0.2;
        mesh.position.z += (targetZ - mesh.position.z) * 0.2;
        mesh.position.y = 0.05; // Apoyado sobre el suelo, justo encima de la celda

        const dx = targetX - mesh.position.x;
        const dz = targetZ - mesh.position.z;
        
        if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
            const angle = Math.atan2(dx, dz);
            let diff = angle - mesh.rotation.y;
            while(diff < -Math.PI) diff += Math.PI * 2;
            while(diff > Math.PI) diff -= Math.PI * 2;
            
            mesh.rotation.y += diff * 0.2;
        }

        // Efectos de luces de emergencia
        if(mesh.userData.emergencyLight) {
            const time = Date.now();
            mesh.userData.emergencyLight.intensity = (Math.sin(time * 0.02) > 0) ? 2.0 : 0.0;
        }
    }

    // --- Interfaz Pública ---

    render() {
        // En Three.js la escena se actualiza contínuamente, 
        // pero usamos este método para forzar la reconstrucción visual si hay cambios en los datos.
        this._reconstruirMapa();
    }

    setPuntos(inicio, parada, destino) {
        this.inicio = inicio;
        this.parada = parada;
        this.destino = destino;
        this.posicionVehiculo = { fila: inicio.fila, col: inicio.col };
        if(this.vehiculoMesh) {
            this.vehiculoMesh.position.set(inicio.col, 0.25, inicio.fila);
        }
        this._reconstruirMapa();
    }

    setPosicionVehiculo(pos) {
        this.posicionVehiculo = pos;
    }

    setEdicionBloqueada(b) {
        this.edicionBloqueada = b;
        this.cameraController.setModoSeguimiento(b);
    }
}
