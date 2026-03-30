/* ============================================
   TETRIS // NEON FUTURE - Audio Engine
   Synthesized audio using Web Audio API
   ============================================ */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicPlaying = false;
        this.musicOscillators = [];
        this.musicInterval = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.08;
        this.musicGain.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.15;
        this.sfxGain.connect(this.ctx.destination);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : 0.08;
        if (this.sfxGain) this.sfxGain.gain.value = this.muted ? 0 : 0.15;
        return this.muted;
    }

    // Tetris theme (Korobeiniki) - simplified melody
    startMusic() {
        if (!this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;

        const melody = [
            // Korobeiniki melody notes [freq, duration]
            [659.25, 0.4], [493.88, 0.2], [523.25, 0.2], [587.33, 0.4],
            [523.25, 0.2], [493.88, 0.2], [440, 0.4], [440, 0.2],
            [523.25, 0.2], [659.25, 0.4], [587.33, 0.2], [523.25, 0.2],
            [493.88, 0.6], [523.25, 0.2], [587.33, 0.4], [659.25, 0.4],
            [523.25, 0.4], [440, 0.4], [440, 0.4], [0, 0.2],
            [587.33, 0.4], [698.46, 0.2], [880, 0.4], [783.99, 0.2],
            [698.46, 0.2], [659.25, 0.6], [523.25, 0.2], [659.25, 0.4],
            [587.33, 0.2], [523.25, 0.2], [493.88, 0.4], [493.88, 0.2],
            [523.25, 0.2], [587.33, 0.4], [659.25, 0.4], [523.25, 0.4],
            [440, 0.4], [440, 0.4], [0, 0.4],
        ];

        let noteIndex = 0;
        let nextTime = this.ctx.currentTime;

        const scheduleNotes = () => {
            while (nextTime < this.ctx.currentTime + 0.5) {
                const [freq, dur] = melody[noteIndex % melody.length];
                const actualDur = dur * 0.9;

                if (freq > 0) {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.5, nextTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, nextTime + actualDur);
                    osc.connect(gain);
                    gain.connect(this.musicGain);
                    osc.start(nextTime);
                    osc.stop(nextTime + actualDur + 0.05);

                    // Add subtle bass
                    const bass = this.ctx.createOscillator();
                    const bassGain = this.ctx.createGain();
                    bass.type = 'sine';
                    bass.frequency.value = freq / 2;
                    bassGain.gain.setValueAtTime(0.3, nextTime);
                    bassGain.gain.exponentialRampToValueAtTime(0.01, nextTime + actualDur);
                    bass.connect(bassGain);
                    bassGain.connect(this.musicGain);
                    bass.start(nextTime);
                    bass.stop(nextTime + actualDur + 0.05);
                }

                nextTime += dur * 0.5; // Speed factor
                noteIndex++;
            }
        };

        this.musicInterval = setInterval(scheduleNotes, 200);
        scheduleNotes();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    playTone(freq, duration, type = 'square', volume = 0.5) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration + 0.05);
    }

    move() {
        this.playTone(200, 0.05, 'sine', 0.3);
    }

    rotate() {
        this.playTone(400, 0.08, 'sine', 0.4);
    }

    drop() {
        this.playTone(150, 0.15, 'triangle', 0.5);
    }

    hardDrop() {
        this.playTone(100, 0.2, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(80, 0.15, 'sine', 0.5), 50);
    }

    lineClear(count) {
        const baseFreq = 500 + count * 100;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.playTone(baseFreq + i * 150, 0.2, 'square', 0.4);
            }, i * 80);
        }
    }

    tetris() {
        // Special 4-line clear sound
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.3, 'square', 0.5), i * 100);
        });
    }

    hold() {
        this.playTone(300, 0.08, 'triangle', 0.3);
    }

    levelUp() {
        const freqs = [440, 554.37, 659.25, 880];
        freqs.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.2, 'sine', 0.4), i * 120);
        });
    }

    gameOver() {
        const freqs = [440, 415.3, 392, 349.23, 329.63, 293.66, 261.63];
        freqs.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 0.3, 'sawtooth', 0.3), i * 150);
        });
    }

    comboSound(combo) {
        const freq = 400 + combo * 80;
        this.playTone(freq, 0.15, 'square', 0.4);
        setTimeout(() => this.playTone(freq * 1.25, 0.15, 'square', 0.3), 60);
    }
}

const audio = new AudioEngine();
