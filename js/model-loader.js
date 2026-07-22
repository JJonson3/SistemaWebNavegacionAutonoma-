/**
 * ModelLoader - Sistema de gestión de activos 3D (GLB/GLTF)
 * 
 * Carga, cachea y clasifica automáticamente los modelos de Poly Pizza
 * ubicados en /models. Usa keywords en los nombres de archivo para
 * asignar cada modelo a su rol (vehículo, peatón, edificio, decoración).
 */

// Mapeo de keywords → rol lógico
// IMPORTANTE: El orden de chequeo es por código numérico.
// Para evitar que "Police Car" matchee 'car' (código 1) antes que 'police' (código 4),
// se clasifican los más específicos primero.
const KEYWORDS_VEHICULO_ORDERED = [
    { codigo: 2, keywords: ['ambulance', 'ambulan'] },              // Ambulancia
    { codigo: 3, keywords: ['fire truck', 'fire_truck', 'firetruck', 'fire', 'bombero'] }, // Bomberos
    { codigo: 4, keywords: ['police', 'patrol', 'policia', 'patrulla'] },          // Policía
    { codigo: 5, keywords: ['banana', 'reparto', 'delivery'] },                    // Reparto
    { codigo: 1, keywords: ['suv', 'taxi', 'car', 'sedan', 'transporte'] },        // Transporte Normal (al final)
];

const KEYWORDS_PEATON = ['human', 'woman', 'man', 'person', 'people', 'casual', 'peaton'];
const KEYWORDS_EDIFICIO = ['building', 'house', 'edificio', 'casa', 'tower', 'office'];
const KEYWORDS_DECORACION = ['tree', 'lamp', 'bench', 'arbol', 'banca'];
const KEYWORDS_VALLA = ['fence', 'valla'];
const KEYWORDS_SPEEDBUMP = ['speed bump', 'speedbump', 'speed_bump', 'bump', 'policia acostado', 'reductor'];

class ModelLoaderSingleton {
    constructor() {
        this.loader = null;
        this.cache = {};           // url → THREE.Group (original cargado)
        this.vehiculos = {};       // codigo → { url, scene }
        this.peatones = [];        // [{ url, scene }, ...]
        this.edificios = [];       // [{ url, scene }, ...]
        this.decoraciones = [];    // [{ url, scene }, ...]
        this.vallas = [];          // [{ url, scene }, ...]
        this.speedBumps = [];      // [{ url, scene }, ...]
        this.isReady = false;
        this._readyCallbacks = [];
        
        // Escalas para normalizar los modelos (llenar visualmente la celda)
        this.ESCALA_VEHICULO = 0.6;
        this.ESCALA_PEATON = 0.20;
        this.ESCALA_EDIFICIO = 0.95;
        this.ESCALA_DECORACION = 0.6;
        this.ESCALA_VALLA = 0.95;
        this.ESCALA_SPEEDBUMP = 0.8;
    }

    /**
     * Inicializa el loader y carga todos los modelos del directorio.
     * @param {string[]} archivos - Lista de nombres de archivo en /models
     */
    async init(archivos) {
        if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
            console.warn('[ModelLoader] GLTFLoader no disponible, usando fallbacks.');
            this.isReady = true;
            this._notifyReady();
            return;
        }

        this.loader = new THREE.GLTFLoader();

        // Clasificar archivos por keywords
        const clasificados = this._clasificarArchivos(archivos);

        // Cargar todos en paralelo
        const promesas = [];

        for (const [codigo, url] of Object.entries(clasificados.vehiculos)) {
            promesas.push(
                this._cargarModelo(url).then(scene => {
                    if (scene) {
                        this._normalizarModelo(scene, this.ESCALA_VEHICULO);
                        this.vehiculos[codigo] = { url, scene };
                    }
                })
            );
        }

        for (const url of clasificados.peatones) {
            promesas.push(
                this._cargarModelo(url).then(scene => {
                    if (scene) {
                        this._normalizarModelo(scene, this.ESCALA_PEATON);
                        this.peatones.push({ url, scene });
                    }
                })
            );
        }

        for (const url of clasificados.edificios) {
            promesas.push(
                this._cargarModelo(url).then(scene => {
                    if (scene) {
                        const wrapper = this._normalizarModelo(scene, this.ESCALA_EDIFICIO, true);
                        this.edificios.push({ url, scene: wrapper });
                    }
                })
            );
        }

        for (const url of clasificados.decoraciones) {
            promesas.push(
                this._cargarModelo(url).then(scene => {
                    if (scene) {
                        const wrapper = this._normalizarModelo(scene, this.ESCALA_DECORACION, false);
                        this.decoraciones.push({ url, scene: wrapper });
                    }
                })
            );
        }

        for (const url of clasificados.vallas) {
            promesas.push(
                this._cargarModelo(url).then(scene => {
                    if (scene) {
                        const wrapper = this._normalizarModelo(scene, this.ESCALA_VALLA, true);
                        this.vallas.push({ url, scene: wrapper });
                    }
                })
            );
        }

        for (const url of clasificados.speedBumps) {
            promesas.push(
                this._cargarModelo(url).then(scene => {
                    if (scene) {
                        const wrapper = this._normalizarModelo(scene, this.ESCALA_SPEEDBUMP, false);
                        this.speedBumps.push({ url, scene: wrapper });
                    }
                })
            );
        }

        await Promise.all(promesas);

        this.isReady = true;
        console.log(`[ModelLoader] Cargados: ${Object.keys(this.vehiculos).length} vehículos, ${this.peatones.length} peatones, ${this.edificios.length} edificios, ${this.decoraciones.length} decoraciones, ${this.speedBumps.length} speed bumps`);
        this._notifyReady();
    }

    /**
     * Clasifica los archivos en categorías por keywords.
     */
    _clasificarArchivos(archivos) {
        const result = {
            vehiculos: {},  // codigo → url
            peatones: [],
            edificios: [],
            decoraciones: [],
            vallas: [],
            speedBumps: []
        };

        for (const archivo of archivos) {
            const lower = archivo.toLowerCase();
            const url = `models/${encodeURIComponent(archivo)}`;
            let clasificado = false;

            // Intentar clasificar como vehículo (orden de prioridad específico → genérico)
            for (const { codigo, keywords } of KEYWORDS_VEHICULO_ORDERED) {
                if (keywords.some(kw => lower.includes(kw))) {
                    if (!result.vehiculos[codigo]) {
                        result.vehiculos[codigo] = url;
                        clasificado = true;
                    }
                    break;
                }
            }
            if (clasificado) continue;

            // Intentar clasificar como peatón
            if (KEYWORDS_PEATON.some(kw => lower.includes(kw))) {
                result.peatones.push(url);
                continue;
            }

            // Intentar clasificar como edificio
            if (KEYWORDS_EDIFICIO.some(kw => lower.includes(kw))) {
                result.edificios.push(url);
                continue;
            }

            // Intentar clasificar como speed bump
            if (KEYWORDS_SPEEDBUMP.some(kw => lower.includes(kw))) {
                result.speedBumps.push(url);
                continue;
            }

            // Intentar clasificar como valla
            if (KEYWORDS_VALLA.some(kw => lower.includes(kw))) {
                result.vallas.push(url);
                continue;
            }

            // Intentar clasificar como decoración
            if (KEYWORDS_DECORACION.some(kw => lower.includes(kw))) {
                result.decoraciones.push(url);
                continue;
            }

            // Si no encaja en nada, ignorar
            console.log(`[ModelLoader] Archivo sin clasificar: ${archivo}`);
        }

        return result;
    }

    /**
     * Carga un modelo GLB/GLTF y lo cachea.
     */
    _cargarModelo(url) {
        if (this.cache[url]) {
            return Promise.resolve(this.cache[url].clone());
        }

        return new Promise((resolve) => {
            this.loader.load(
                url,
                (gltf) => {
                    const scene = gltf.scene;
                    scene.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.cache[url] = scene;
                    resolve(scene.clone());
                },
                undefined,
                (error) => {
                    console.warn(`[ModelLoader] Error cargando ${url}:`, error);
                    resolve(null);
                }
            );
        });
    }

    /**
     * Normaliza un modelo para que quepa en un tamaño `targetSize` y devuelve un contenedor.
     * @param {boolean} scaleByFootprint - Si es verdadero, escala según el tamaño XZ en lugar del XYZ máximo (ideal para edificios altos).
     */
    _normalizarModelo(scene, targetSize, scaleByFootprint = false) {
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        let maxDim;
        if (scaleByFootprint) {
            maxDim = Math.max(size.x, size.z); // Llenar la celda sin importar la altura
        } else {
            maxDim = Math.max(size.x, size.y, size.z);
        }

        if (maxDim > 0) {
            const scale = targetSize / maxDim;
            scene.scale.multiplyScalar(scale);
        }

        // Obtener la nueva caja tras escalar
        const newBox = new THREE.Box3().setFromObject(scene);
        const center = new THREE.Vector3();
        newBox.getCenter(center);
        
        // Crear un wrapper para que el renderer solo mueva el wrapper
        const wrapper = new THREE.Group();
        
        // Alinear la escena dentro del wrapper:
        // Centrada en X y Z, apoyada sobre Y=0.
        scene.position.x = -center.x;
        scene.position.z = -center.z;
        scene.position.y = -newBox.min.y;
        
        wrapper.add(scene);
        return wrapper;
    }

    // --- API Público ---

    /**
     * Obtiene un clon del modelo de vehículo para el código dado.
     * @param {number} codigo - Código del tipo de vehículo (1-5)
     * @returns {THREE.Group|null}
     */
    getVehiculo(codigo) {
        const entry = this.vehiculos[codigo];
        if (entry && entry.scene) {
            return entry.scene.clone();
        }
        return null;
    }

    /**
     * Obtiene un clon aleatorio de peatón (hombre o mujer).
     * @returns {THREE.Group|null}
     */
    getPeaton() {
        if (this.peatones.length === 0) return null;
        const idx = Math.floor(Math.random() * this.peatones.length);
        return this.peatones[idx].scene.clone();
    }

    /**
     * Obtiene un clon aleatorio de edificio.
     * @returns {THREE.Group|null}
     */
    getEdificio() {
        if (this.edificios.length === 0) return null;
        const idx = Math.floor(Math.random() * this.edificios.length);
        return this.edificios[idx].scene.clone();
    }

    /**
     * Obtiene un clon de decoración (valla, árbol, etc.).
     * @returns {THREE.Group|null}
     */
    getDecoracion() {
        if (this.decoraciones.length === 0) return null;
        const idx = Math.floor(Math.random() * this.decoraciones.length);
        return this.decoraciones[idx].scene.clone();
    }

    /**
     * Obtiene un clon de valla.
     * @returns {THREE.Group|null}
     */
    getValla() {
        if (this.vallas.length === 0) return null;
        const idx = Math.floor(Math.random() * this.vallas.length);
        return this.vallas[idx].scene.clone();
    }

    /**
     * Obtiene un clon de speed bump.
     * @returns {THREE.Group|null}
     */
    getSpeedBump() {
        if (this.speedBumps.length === 0) return null;
        const idx = Math.floor(Math.random() * this.speedBumps.length);
        return this.speedBumps[idx].scene.clone();
    }

    /**
     * Registra un callback para cuando todos los modelos estén listos.
     */
    onReady(callback) {
        if (this.isReady) {
            callback();
        } else {
            this._readyCallbacks.push(callback);
        }
    }

    _notifyReady() {
        for (const cb of this._readyCallbacks) cb();
        this._readyCallbacks = [];
    }
}

// Singleton exportado
export const ModelLoader = new ModelLoaderSingleton();

// Lista de archivos disponibles en /models (hardcoded para evitar necesitar un servidor con directory listing)
export const ARCHIVOS_MODELOS = [
    'Ambulance by Poly by Google - beDwEv9UB7x.glb',
    'Building Red Corner by J-Toastie - 9JuFwnivP0.glb',
    'Building by Kay Lousberg - EL3ePInr1N.glb',
    'Fence End by J-Toastie - tQ5zhPd5UC.glb',
    'Fire Truck by Ivan Klus - 7iHJ519SwxG.glb',
    'House by Poly by Google - 75V_MLvKMqM.glb',
    'Human V1 by Mike Chatterton - 6bpeYfAwKUp.glb',
    'Police Car by Quaternius - BwwnUrWGmV.glb',
    'SUV by Quaternius - xsMtZhBkxL.glb',
    'Speed bump by Username12 - 8lVa2k0Mo6.glb',
    'Tree Assets by Ben Desai - eLqmfpqu_Ig.glb',
    'Trees by Poly by Google - dTy_L-TMS2z.glb',
    'Woman Casual by Quaternius - jpKRgGDxhk.glb',
    'cartoon banana car by Felipe Lujan-Bear - 1RjuCX8gI9w.glb'
];
