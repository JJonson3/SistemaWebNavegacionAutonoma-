/**
 * CameraController - Gestiona la cámara dinámica de la simulación 3D
 */

import { FILAS, COLUMNAS } from './mapa.js';

export class CameraController {
    constructor(camera, canvas) {
        this.camera = camera;
        this.canvas = canvas;
        
        this.modoSeguimiento = false;
        this.objetivo = new THREE.Vector3(0, 0, 0);
        this.vehiculoObj = null;
        
        // Configuración de la cámara general
        this.posicionGeneral = new THREE.Vector3(COLUMNAS / 2, Math.max(FILAS, COLUMNAS) * 0.8, FILAS / 2 + 15);
        this.lookAtGeneral = new THREE.Vector3(COLUMNAS / 2, 0, FILAS / 2);
        
        // Inicializar cámara
        this.camera.position.copy(this.posicionGeneral);
        this.camera.lookAt(this.lookAtGeneral);
        
        // Variables para suavizado
        this.currentLookAt = this.lookAtGeneral.clone();
        
        // Eventos manuales (Pan/Zoom básicos)
        this.isDragging = false;
        this.isPanning = false;
        this.isSpaceDown = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.angleX = 0; 
        this.angleY = Math.PI / 4;
        this.radio = 25;
        this.centroOrbita = new THREE.Vector3(10, 0, 10);

        this._setupEvents();
        this._updateCameraFromAngles();
    }

    _setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.isSpaceDown) {
                this.isPanning = true;
                this.previousMousePosition = { x: e.offsetX, y: e.offsetY };
                this.canvas.style.cursor = 'grabbing';
            } else if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Clic medio o Ctrl+Clic izquierdo para rotar
                this.isDragging = true;
                this.previousMousePosition = { x: e.offsetX, y: e.offsetY };
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isPanning = false;
            if (this.isSpaceDown) this.canvas.style.cursor = 'grab';
            else this.canvas.style.cursor = 'default';
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.modoSeguimiento && !this.modoPrimeraPersona) {
                this.isSpaceDown = true;
                if (!this.isPanning) this.canvas.style.cursor = 'grab';
                e.preventDefault(); // Prevenir scroll de la página
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isSpaceDown = false;
                this.isPanning = false;
                this.canvas.style.cursor = 'default';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning && !this.modoSeguimiento) {
                const deltaMove = {
                    x: e.offsetX - this.previousMousePosition.x,
                    y: e.offsetY - this.previousMousePosition.y
                };

                // Velocidad de paneo proporcional al zoom
                const panSpeed = this.radio * 0.002;
                
                // Mover en la dirección plana XZ de la cámara
                const dirX = new THREE.Vector3(Math.cos(this.angleX), 0, -Math.sin(this.angleX)).normalize();
                const dirZ = new THREE.Vector3(Math.sin(this.angleX), 0, Math.cos(this.angleX)).normalize();
                
                // Restar deltaMove para que el mundo siga al ratón (arrastrar)
                this.centroOrbita.add(dirX.multiplyScalar(-deltaMove.x * panSpeed));
                this.centroOrbita.add(dirZ.multiplyScalar(-deltaMove.y * panSpeed));

                this._updateCameraFromAngles();
                this.previousMousePosition = { x: e.offsetX, y: e.offsetY };
            } else if (this.isDragging && !this.modoSeguimiento) {
                const deltaMove = {
                    x: e.offsetX - this.previousMousePosition.x,
                    y: e.offsetY - this.previousMousePosition.y
                };

                this.angleX -= deltaMove.x * 0.01;
                this.angleY -= deltaMove.y * 0.01;
                
                // Limitar elevación
                this.angleY = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.angleY));

                this._updateCameraFromAngles();
                this.previousMousePosition = { x: e.offsetX, y: e.offsetY };
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            if (!this.modoSeguimiento) {
                this.radio += e.deltaY * 0.02;
                this.radio = Math.max(5, Math.min(60, this.radio));
                this._updateCameraFromAngles();
                e.preventDefault();
            }
        });

        // ==========================================
        // TOUCH EVENTS (Soporte para Móviles)
        // ==========================================
        let initialPinchDistance = 0;
        let initialRadio = this.radio;
        
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.modoSeguimiento || this.modoPrimeraPersona) return;

            if (e.touches.length === 1) {
                // 1 dedo: Rotar
                this.isDragging = true;
                this.isPanning = false;
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                // 2 dedos: Paneo y Zoom
                this.isDragging = false;
                this.isPanning = true;
                this.previousMousePosition = { 
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2, 
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2 
                };
                
                // Iniciar Pinch to zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDistance = Math.sqrt(dx*dx + dy*dy);
                initialRadio = this.radio;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.modoSeguimiento || this.modoPrimeraPersona) return;
            e.preventDefault(); // Prevenir scroll nativo de la página al tocar el canvas

            if (this.isDragging && e.touches.length === 1) {
                const deltaMove = {
                    x: e.touches[0].clientX - this.previousMousePosition.x,
                    y: e.touches[0].clientY - this.previousMousePosition.y
                };
                
                this.angleX -= deltaMove.x * 0.01;
                this.angleY -= deltaMove.y * 0.01;
                
                // Limitar elevación
                this.angleY = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.angleY));
                
                this._updateCameraFromAngles();
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            } else if (this.isPanning && e.touches.length === 2) {
                // Paneo
                const currentMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const deltaMove = {
                    x: currentMidX - this.previousMousePosition.x,
                    y: currentMidY - this.previousMousePosition.y
                };

                const panSpeed = this.radio * 0.002;
                const dirX = new THREE.Vector3(Math.cos(this.angleX), 0, -Math.sin(this.angleX)).normalize();
                const dirZ = new THREE.Vector3(Math.sin(this.angleX), 0, Math.cos(this.angleX)).normalize();
                
                this.centroOrbita.add(dirX.multiplyScalar(-deltaMove.x * panSpeed));
                this.centroOrbita.add(dirZ.multiplyScalar(-deltaMove.y * panSpeed));
                this.previousMousePosition = { x: currentMidX, y: currentMidY };

                // Zoom (Pinch)
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (initialPinchDistance > 0) {
                    const zoomFactor = initialPinchDistance / dist;
                    this.radio = initialRadio * zoomFactor;
                    this.radio = Math.max(5, Math.min(60, this.radio));
                }
                
                this._updateCameraFromAngles();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.isDragging = false;
                this.isPanning = false;
            } else if (e.touches.length === 1) {
                // Si queda un dedo, pasamos de paneo a rotación
                this.isPanning = false;
                this.isDragging = true;
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });
    }

    _updateCameraFromAngles() {
        this.camera.position.x = this.centroOrbita.x + this.radio * Math.sin(this.angleX) * Math.cos(this.angleY);
        this.camera.position.y = this.centroOrbita.y + this.radio * Math.sin(this.angleY);
        this.camera.position.z = this.centroOrbita.z + this.radio * Math.cos(this.angleX) * Math.cos(this.angleY);
        
        this.currentLookAt.copy(this.centroOrbita);
        this.camera.lookAt(this.currentLookAt);
    }

    setVehiculo(vehiculoMesh) {
        this.vehiculoObj = vehiculoMesh;
    }

    setModoSeguimiento(activo) {
        this.modoSeguimiento = activo;
        this.modoPrimeraPersona = false;
        if (!activo) {
            // Regresar al centro
            this.centroOrbita.set(COLUMNAS / 2, 0, FILAS / 2);
            this.angleX = 0;
            this.angleY = Math.PI / 4;
            this.radio = 25;
            this._updateCameraFromAngles();
        }
    }

    setModoPrimeraPersona(activo) {
        this.modoPrimeraPersona = activo;
        this.modoSeguimiento = false;
        if (!activo) {
            this.setModoSeguimiento(false);
        }
    }

    update() {
        if (this.modoSeguimiento && this.vehiculoObj) {
            // Posición objetivo detrás y arriba del vehículo
            const posVehiculo = this.vehiculoObj.position;
            
            // Suavizar el lookAt hacia el vehículo
            this.currentLookAt.lerp(posVehiculo, 0.1);
            this.camera.lookAt(this.currentLookAt);

            // Intentar ponernos detrás del vehículo (asumiendo que su rotación es Y)
            const rot = this.vehiculoObj.rotation.y;
            const offsetDist = 8;
            const offsetHeight = 5;
            
            const targetCamPos = new THREE.Vector3(
                posVehiculo.x - Math.sin(rot) * offsetDist,
                posVehiculo.y + offsetHeight,
                posVehiculo.z - Math.cos(rot) * offsetDist
            );
            
            this.camera.position.lerp(targetCamPos, 0.05);
        } else if (this.modoPrimeraPersona && this.vehiculoObj) {
            const posVehiculo = this.vehiculoObj.position;
            const rot = this.vehiculoObj.rotation.y;

            // La cámara va ligeramente arriba y adelante del centro del coche (parabrisas)
            const offsetX = Math.sin(rot) * 0.1;
            const offsetZ = Math.cos(rot) * 0.1;
            
            const targetCamPos = new THREE.Vector3(
                posVehiculo.x + offsetX,
                posVehiculo.y + 0.35,
                posVehiculo.z + offsetZ
            );

            // Hacia dónde mira: un poco más adelante
            const lookTarget = new THREE.Vector3(
                targetCamPos.x + Math.sin(rot) * 5,
                targetCamPos.y - 0.2,
                targetCamPos.z + Math.cos(rot) * 5
            );

            this.camera.position.lerp(targetCamPos, 0.5); // Fuerte adherencia
            this.currentLookAt.lerp(lookTarget, 0.5);
            this.camera.lookAt(this.currentLookAt);
        }
    }
}
