/* ============================================
   TETRIS // NEON FUTURE - Particle System
   ============================================ */

class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initBackgroundParticles();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initBackgroundParticles() {
        for (let i = 0; i < 60; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 0.5,
                color: `hsla(${180 + Math.random() * 40}, 100%, 60%, ${Math.random() * 0.4 + 0.1})`,
                type: 'bg',
                life: Infinity,
            });
        }
    }

    spawnLineClearParticles(boardX, boardY, boardWidth, rowY, cellSize) {
        const count = 40;
        for (let i = 0; i < count; i++) {
            const x = boardX + Math.random() * boardWidth;
            const y = boardY + rowY * cellSize + cellSize / 2;
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 6,
                size: Math.random() * 4 + 2,
                color: `hsla(${180 + Math.random() * 60}, 100%, 70%, 1)`,
                type: 'burst',
                life: 60,
                maxLife: 60,
                gravity: 0.1,
            });
        }
    }

    spawnTetrisParticles(boardX, boardY, boardWidth, boardHeight) {
        for (let i = 0; i < 120; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.particles.push({
                x: boardX + boardWidth / 2,
                y: boardY + boardHeight / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 5 + 2,
                color: `hsla(${Math.random() * 360}, 100%, 60%, 1)`,
                type: 'burst',
                life: 90,
                maxLife: 90,
                gravity: 0.05,
            });
        }
    }

    spawnDropTrail(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + Math.random() * 5,
                vx: (Math.random() - 0.5) * 1,
                vy: -Math.random() * 2 - 1,
                size: Math.random() * 3 + 1,
                color: `hsla(${180 + Math.random() * 40}, 100%, 70%, 0.8)`,
                type: 'burst',
                life: 30,
                maxLife: 30,
                gravity: 0,
            });
        }
    }

    spawnLevelUpRing(centerX, centerY) {
        for (let i = 0; i < 80; i++) {
            const angle = (i / 80) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 2,
                color: `hsla(${270 + Math.random() * 40}, 100%, 65%, 1)`,
                type: 'burst',
                life: 60,
                maxLife: 60,
                gravity: 0,
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connecting lines between close bg particles
        const bgParticles = this.particles.filter(p => p.type === 'bg');
        for (let i = 0; i < bgParticles.length; i++) {
            for (let j = i + 1; j < bgParticles.length; j++) {
                const dx = bgParticles[i].x - bgParticles[j].x;
                const dy = bgParticles[i].y - bgParticles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(0, 240, 255, ${0.08 * (1 - dist / 120)})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.moveTo(bgParticles[i].x, bgParticles[i].y);
                    this.ctx.lineTo(bgParticles[j].x, bgParticles[j].y);
                    this.ctx.stroke();
                }
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;

            if (p.gravity) p.vy += p.gravity;

            if (p.type === 'bg') {
                // Wrap around
                if (p.x < 0) p.x = this.canvas.width;
                if (p.x > this.canvas.width) p.x = 0;
                if (p.y < 0) p.y = this.canvas.height;
                if (p.y > this.canvas.height) p.y = 0;
            }

            if (p.life !== Infinity) {
                p.life--;
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
            }

            const alpha = p.life === Infinity ? 1 : p.life / p.maxLife;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
            this.ctx.fill();

            // Glow
            if (p.type === 'burst') {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * alpha * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha * 0.2})`);
                this.ctx.fill();
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}
