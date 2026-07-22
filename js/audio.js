/**
 * GestorAudio - Efectos de sonido con Web Audio API
 * Reemplazo de GestorAudio.java
 */

let audioCtx = null;
let audioActivado = true;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function beep(freq = 520, duration = 0.12, volume = 0.15) {
    if (!audioActivado) return;
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) { /* ignorar si no se puede reproducir */ }
}

export const GestorAudio = {
    setActivado(activado) { audioActivado = activado; },

    reproducirInicio() { beep(660, 0.15, 0.12); },

    reproducirLlegada() {
        beep(660, 0.12, 0.12);
        setTimeout(() => beep(880, 0.18, 0.15), 160);
    },

    reproducirAlerta() { beep(440, 0.2, 0.1); }
};
