/* ============================================
   TETRIS // NEON FUTURE - Main Controller
   ============================================ */

// ---- DOM Elements ----
const screens = {
    start: document.getElementById('start-screen'),
    controls: document.getElementById('controls-screen'),
    highscores: document.getElementById('highscores-screen'),
    game: document.getElementById('game-screen'),
};

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const comboEl = document.getElementById('combo');
const pauseOverlay = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const finalScoreEl = document.getElementById('final-score');
const nameInput = document.getElementById('name-input');
const lineClearFlash = document.getElementById('line-clear-flash');
const comboPopup = document.getElementById('combo-popup');

// ---- Particle System ----
const particles = new ParticleSystem('particles-bg');

// ---- Game Instance ----
const gameCanvas = document.getElementById('game-canvas');
const holdCanvas = document.getElementById('hold-canvas');
const nextCanvas = document.getElementById('next-canvas');
let game = null;
let animFrameId = null;
let gameLoopId = null;

// ---- Highscores ----
function getHighscores() {
    try {
        return JSON.parse(localStorage.getItem('tetris_neon_scores') || '[]');
    } catch {
        return [];
    }
}

function saveHighscore(name, score) {
    const scores = getHighscores();
    scores.push({ name: name || 'ANON', score, date: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('tetris_neon_scores', JSON.stringify(scores.slice(0, 10)));
}

function renderHighscores() {
    const list = document.getElementById('highscore-list');
    const scores = getHighscores();
    if (scores.length === 0) {
        list.innerHTML = '<div class="highscore-entry"><span style="color: rgba(255,255,255,0.3)">No scores yet</span></div>';
        return;
    }
    list.innerHTML = scores.map((s, i) =>
        `<div class="highscore-entry">
            <span class="rank">#${i + 1}</span>
            <span class="name">${s.name}</span>
            <span class="score-val">${s.score.toLocaleString()}</span>
        </div>`
    ).join('');
}

// ---- Screen Management ----
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// ---- Game Callbacks ----
function onScoreUpdate(score, level, lines, combo) {
    scoreEl.textContent = score.toLocaleString();
    levelEl.textContent = level;
    linesEl.textContent = lines;
    comboEl.textContent = combo;

    scoreEl.classList.remove('score-animate');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('score-animate');
}

function onLineClear(count) {
    audio.lineClear(count);

    // Screen flash
    lineClearFlash.classList.remove('active');
    void lineClearFlash.offsetWidth;
    lineClearFlash.classList.add('active');
    setTimeout(() => lineClearFlash.classList.remove('active'), 500);

    // Spawn particles at board position
    const rect = gameCanvas.getBoundingClientRect();
    for (let r = 0; r < 20; r++) {
        // Find cleared rows approximately
        particles.spawnLineClearParticles(rect.left, rect.top, rect.width, r, game.cellSize);
    }
}

function onTetris() {
    audio.tetris();

    lineClearFlash.classList.remove('active');
    void lineClearFlash.offsetWidth;
    lineClearFlash.classList.add('active');
    setTimeout(() => lineClearFlash.classList.remove('active'), 600);

    // Big particle burst
    const rect = gameCanvas.getBoundingClientRect();
    particles.spawnTetrisParticles(rect.left, rect.top, rect.width, rect.height);

    showComboPopup('TETRIS!');
}

function onLevelUp(level) {
    audio.levelUp();
    const container = document.querySelector('.board-container');
    container.classList.add('level-up-flash');
    setTimeout(() => container.classList.remove('level-up-flash'), 1000);

    const rect = gameCanvas.getBoundingClientRect();
    particles.spawnLevelUpRing(rect.left + rect.width / 2, rect.top + rect.height / 2);

    showComboPopup(`LEVEL ${level}`);
}

function onCombo(combo) {
    audio.comboSound(combo);
    if (combo >= 2) {
        showComboPopup(`${combo}x COMBO`);
    }
}

function onGameOver(score) {
    audio.stopMusic();
    audio.gameOver();
    finalScoreEl.textContent = `FINAL SCORE: ${score.toLocaleString()}`;
    nameInput.value = '';
    gameoverOverlay.classList.remove('hidden');
    cancelAnimationFrame(animFrameId);
    clearInterval(gameLoopId);
}

function showComboPopup(text) {
    comboPopup.textContent = text;
    comboPopup.classList.remove('active');
    void comboPopup.offsetWidth;
    comboPopup.classList.add('active');
    setTimeout(() => comboPopup.classList.remove('active'), 900);
}

// ---- Game Loop ----
function startGame() {
    audio.init();
    showScreen('game');
    pauseOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');

    game = new TetrisGame(gameCanvas, holdCanvas, nextCanvas);
    game.onScoreUpdate = onScoreUpdate;
    game.onLineClear = onLineClear;
    game.onTetris = onTetris;
    game.onLevelUp = onLevelUp;
    game.onCombo = onCombo;
    game.onGameOver = onGameOver;

    onScoreUpdate(0, 1, 0, 0);

    audio.startMusic();

    // Fixed timestep game logic (~60fps)
    gameLoopId = setInterval(() => {
        if (!game.paused && !game.gameOver) {
            game.update();
        }
    }, 1000 / 60);

    // Render loop
    function render(time) {
        game.draw(time);
        animFrameId = requestAnimationFrame(render);
    }
    animFrameId = requestAnimationFrame(render);
}

// ---- Input Handling ----
const keysDown = {};
let dasTimer = null;
let dasDirection = null;
const DAS_DELAY = 170;
const DAS_REPEAT = 50;

function startDAS(dir) {
    if (dasDirection === dir) return;
    stopDAS();
    dasDirection = dir;
    dasTimer = setTimeout(() => {
        dasTimer = setInterval(() => {
            if (!game || game.paused || game.gameOver) return;
            if (dir === 'left') { if (game.moveLeft()) audio.move(); }
            else if (dir === 'right') { if (game.moveRight()) audio.move(); }
            else if (dir === 'down') game.moveDown();
        }, DAS_REPEAT);
    }, DAS_DELAY);
}

function stopDAS(dir) {
    if (dir && dasDirection !== dir) return;
    clearTimeout(dasTimer);
    clearInterval(dasTimer);
    dasTimer = null;
    dasDirection = null;
}

document.addEventListener('keydown', (e) => {
    if (e.repeat && ['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key)) return;

    if (!game || game.gameOver) {
        if (e.key === 'Enter' && game && game.gameOver) {
            // Restart
            startGame();
        }
        return;
    }

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (!game.paused && game.moveLeft()) audio.move();
            startDAS('left');
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (!game.paused && game.moveRight()) audio.move();
            startDAS('right');
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (!game.paused) game.moveDown();
            startDAS('down');
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (!game.paused && game.rotate(1)) audio.rotate();
            break;
        case 'z':
        case 'Z':
            if (!game.paused && game.rotate(-1)) audio.rotate();
            break;
        case ' ':
            e.preventDefault();
            if (!game.paused) {
                const dropped = game.hardDrop();
                if (dropped > 0) {
                    audio.hardDrop();
                    const rect = gameCanvas.getBoundingClientRect();
                    particles.spawnDropTrail(
                        rect.left + (game.current ? game.current.x : 5) * game.cellSize + game.cellSize,
                        rect.top + rect.height - 20
                    );
                }
            }
            break;
        case 'c':
        case 'C':
            if (!game.paused && game.holdCurrentPiece()) audio.hold();
            break;
        case 'p':
        case 'P':
        case 'Escape':
            game.paused = !game.paused;
            pauseOverlay.classList.toggle('hidden', !game.paused);
            if (game.paused) {
                audio.stopMusic();
            } else {
                audio.startMusic();
            }
            break;
        case 'm':
        case 'M':
            audio.toggleMute();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowLeft': stopDAS('left'); break;
        case 'ArrowRight': stopDAS('right'); break;
        case 'ArrowDown': stopDAS('down'); break;
    }
});

// ---- Touch Controls ----
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

gameCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
}, { passive: false });

gameCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

gameCanvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!game || game.paused || game.gameOver) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 10 && absDy < 10 && dt < 200) {
        // Tap = rotate
        if (game.rotate(1)) audio.rotate();
    } else if (absDy > absDx && dy > 40) {
        // Swipe down = hard drop
        const dropped = game.hardDrop();
        if (dropped > 0) audio.hardDrop();
    } else if (absDx > absDy) {
        if (dx > 20) { if (game.moveRight()) audio.move(); }
        else if (dx < -20) { if (game.moveLeft()) audio.move(); }
    }
}, { passive: false });

// ---- Button Handlers ----
document.getElementById('btn-start').addEventListener('click', () => {
    audio.init();
    startGame();
});

document.getElementById('btn-controls').addEventListener('click', () => showScreen('controls'));
document.getElementById('btn-back-controls').addEventListener('click', () => showScreen('start'));

document.getElementById('btn-highscores').addEventListener('click', () => {
    renderHighscores();
    showScreen('highscores');
});
document.getElementById('btn-back-scores').addEventListener('click', () => showScreen('start'));

document.getElementById('btn-resume').addEventListener('click', () => {
    if (game) {
        game.paused = false;
        pauseOverlay.classList.add('hidden');
        audio.startMusic();
    }
});

document.getElementById('btn-save-score').addEventListener('click', () => {
    if (game) {
        saveHighscore(nameInput.value.trim().toUpperCase() || 'ANON', game.score);
        document.getElementById('btn-save-score').disabled = true;
        document.getElementById('btn-save-score').textContent = 'SAVED!';
    }
});

document.getElementById('btn-restart').addEventListener('click', () => startGame());

document.getElementById('btn-menu').addEventListener('click', () => {
    audio.stopMusic();
    cancelAnimationFrame(animFrameId);
    clearInterval(gameLoopId);
    showScreen('start');
});

// ---- Prevent scroll on arrow keys ----
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});
