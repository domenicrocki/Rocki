/* ============================================
   TETRIS // NEON FUTURE - Game Engine
   ============================================ */

const COLS = 10;
const ROWS = 20;
const HIDDEN_ROWS = 2;
const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

// Tetromino shapes and their neon colors
const PIECES = {
    I: {
        shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        color: '#00f0ff', // Cyan
        glow: 'rgba(0, 240, 255, 0.6)',
    },
    O: {
        shape: [[1,1],[1,1]],
        color: '#ffe600', // Yellow
        glow: 'rgba(255, 230, 0, 0.6)',
    },
    T: {
        shape: [[0,1,0],[1,1,1],[0,0,0]],
        color: '#a855f7', // Purple
        glow: 'rgba(168, 85, 247, 0.6)',
    },
    S: {
        shape: [[0,1,1],[1,1,0],[0,0,0]],
        color: '#39ff14', // Green
        glow: 'rgba(57, 255, 20, 0.6)',
    },
    Z: {
        shape: [[1,1,0],[0,1,1],[0,0,0]],
        color: '#ff073a', // Red
        glow: 'rgba(255, 7, 58, 0.6)',
    },
    J: {
        shape: [[1,0,0],[1,1,1],[0,0,0]],
        color: '#4d4dff', // Blue
        glow: 'rgba(77, 77, 255, 0.6)',
    },
    L: {
        shape: [[0,0,1],[1,1,1],[0,0,0]],
        color: '#ff6600', // Orange
        glow: 'rgba(255, 102, 0, 0.6)',
    },
};

const PIECE_NAMES = Object.keys(PIECES);

// Wall kick data (SRS)
const WALL_KICKS = {
    '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};

const I_WALL_KICKS = {
    '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

class TetrisGame {
    constructor(canvas, holdCanvas, nextCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.holdCanvas = holdCanvas;
        this.holdCtx = holdCanvas.getContext('2d');
        this.nextCanvas = nextCanvas;
        this.nextCtx = nextCanvas.getContext('2d');

        this.cellSize = 30;
        this.canvas.width = COLS * this.cellSize;
        this.canvas.height = ROWS * this.cellSize;

        this.onScoreUpdate = null;
        this.onLineClear = null;
        this.onTetris = null;
        this.onGameOver = null;
        this.onLevelUp = null;
        this.onCombo = null;

        this.reset();
    }

    reset() {
        this.board = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = -1;
        this.bag = [];
        this.nextPieces = [];
        this.holdPiece = null;
        this.canHold = true;
        this.current = null;
        this.gameOver = false;
        this.paused = false;
        this.lockDelay = 0;
        this.lockDelayMax = 30;
        this.dropCounter = 0;
        this.animatingRows = [];
        this.animationFrame = 0;
        this.ghostY = 0;

        // Fill next pieces queue
        for (let i = 0; i < 3; i++) {
            this.nextPieces.push(this.getNextFromBag());
        }
        this.spawnPiece();
    }

    getNextFromBag() {
        if (this.bag.length === 0) {
            this.bag = [...PIECE_NAMES];
            // Fisher-Yates shuffle
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        return this.bag.pop();
    }

    spawnPiece() {
        const name = this.nextPieces.shift();
        this.nextPieces.push(this.getNextFromBag());

        const piece = PIECES[name];
        const shape = piece.shape.map(r => [...r]);
        const x = Math.floor((COLS - shape[0].length) / 2);
        const y = 0;

        this.current = { name, shape, color: piece.color, glow: piece.glow, x, y, rotation: 0 };
        this.canHold = true;
        this.lockDelay = 0;
        this.updateGhost();

        if (this.collides(this.current.shape, this.current.x, this.current.y)) {
            this.gameOver = true;
            if (this.onGameOver) this.onGameOver(this.score);
        }
    }

    collides(shape, px, py) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = px + c;
                const ny = py + r;
                if (nx < 0 || nx >= COLS || ny >= TOTAL_ROWS) return true;
                if (ny >= 0 && this.board[ny][nx]) return true;
            }
        }
        return false;
    }

    rotate(dir = 1) {
        if (!this.current || this.current.name === 'O') return false;

        const oldRotation = this.current.rotation;
        const newRotation = (oldRotation + dir + 4) % 4;
        const rotated = this.rotateMatrix(this.current.shape, dir);

        const kickKey = `${oldRotation}>${newRotation}`;
        const kicks = this.current.name === 'I' ? I_WALL_KICKS[kickKey] : WALL_KICKS[kickKey];

        if (kicks) {
            for (const [dx, dy] of kicks) {
                if (!this.collides(rotated, this.current.x + dx, this.current.y - dy)) {
                    this.current.shape = rotated;
                    this.current.x += dx;
                    this.current.y -= dy;
                    this.current.rotation = newRotation;
                    this.lockDelay = 0;
                    this.updateGhost();
                    return true;
                }
            }
        }
        return false;
    }

    rotateMatrix(matrix, dir) {
        const n = matrix.length;
        const result = Array.from({ length: n }, () => Array(n).fill(0));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (dir === 1) {
                    result[c][n - 1 - r] = matrix[r][c];
                } else {
                    result[n - 1 - c][r] = matrix[r][c];
                }
            }
        }
        return result;
    }

    moveLeft() {
        if (!this.current) return false;
        if (!this.collides(this.current.shape, this.current.x - 1, this.current.y)) {
            this.current.x--;
            this.lockDelay = 0;
            this.updateGhost();
            return true;
        }
        return false;
    }

    moveRight() {
        if (!this.current) return false;
        if (!this.collides(this.current.shape, this.current.x + 1, this.current.y)) {
            this.current.x++;
            this.lockDelay = 0;
            this.updateGhost();
            return true;
        }
        return false;
    }

    moveDown() {
        if (!this.current) return false;
        if (!this.collides(this.current.shape, this.current.x, this.current.y + 1)) {
            this.current.y++;
            this.dropCounter = 0;
            return true;
        }
        return false;
    }

    hardDrop() {
        if (!this.current) return 0;
        let dropped = 0;
        while (!this.collides(this.current.shape, this.current.x, this.current.y + 1)) {
            this.current.y++;
            dropped++;
        }
        this.score += dropped * 2;
        this.lockPiece();
        return dropped;
    }

    holdCurrentPiece() {
        if (!this.current || !this.canHold) return false;
        const name = this.current.name;
        if (this.holdPiece) {
            const held = this.holdPiece;
            this.holdPiece = name;
            const piece = PIECES[held];
            this.current = {
                name: held,
                shape: piece.shape.map(r => [...r]),
                color: piece.color,
                glow: piece.glow,
                x: Math.floor((COLS - piece.shape[0].length) / 2),
                y: 0,
                rotation: 0,
            };
        } else {
            this.holdPiece = name;
            this.spawnPiece();
        }
        this.canHold = false;
        this.updateGhost();
        return true;
    }

    updateGhost() {
        if (!this.current) return;
        let gy = this.current.y;
        while (!this.collides(this.current.shape, this.current.x, gy + 1)) {
            gy++;
        }
        this.ghostY = gy;
    }

    lockPiece() {
        const { shape, x, y, color, glow } = this.current;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const ny = y + r;
                const nx = x + c;
                if (ny >= 0 && ny < TOTAL_ROWS && nx >= 0 && nx < COLS) {
                    this.board[ny][nx] = { color, glow };
                }
            }
        }

        const cleared = this.clearLines();

        if (cleared > 0) {
            this.combo++;
            const comboBonus = this.combo > 0 ? 50 * this.combo * this.level : 0;
            const linePoints = [0, 100, 300, 500, 800];
            this.score += (linePoints[cleared] || 0) * this.level + comboBonus;
            this.lines += cleared;

            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                if (this.onLevelUp) this.onLevelUp(this.level);
            }

            if (cleared === 4) {
                if (this.onTetris) this.onTetris();
            } else {
                if (this.onLineClear) this.onLineClear(cleared);
            }

            if (this.combo > 0 && this.onCombo) {
                this.onCombo(this.combo);
            }
        } else {
            this.combo = -1;
        }

        if (this.onScoreUpdate) this.onScoreUpdate(this.score, this.level, this.lines, Math.max(0, this.combo));
        this.spawnPiece();
    }

    clearLines() {
        let cleared = 0;
        const rowsToClear = [];

        for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== null)) {
                rowsToClear.push(r);
                cleared++;
            }
        }

        // Remove rows and add empty ones at top
        for (const row of rowsToClear) {
            this.board.splice(row, 1);
            this.board.unshift(Array(COLS).fill(null));
        }

        return cleared;
    }

    getDropInterval() {
        // Speed increases with level (frames between drops)
        const speeds = [48, 43, 38, 33, 28, 23, 18, 13, 8, 6, 5, 4, 3, 2, 1];
        return (speeds[Math.min(this.level - 1, speeds.length - 1)] || 1);
    }

    update() {
        if (this.gameOver || this.paused || !this.current) return;

        this.dropCounter++;
        if (this.dropCounter >= this.getDropInterval()) {
            this.dropCounter = 0;
            if (!this.moveDown()) {
                this.lockDelay++;
                if (this.lockDelay >= this.lockDelayMax) {
                    this.lockPiece();
                }
            }
        }
    }

    // ---- RENDERING ----

    draw(time) {
        const ctx = this.ctx;
        const cs = this.cellSize;

        // Clear
        ctx.fillStyle = 'rgba(5, 5, 15, 0.95)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * cs);
            ctx.lineTo(COLS * cs, r * cs);
            ctx.stroke();
        }
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cs, 0);
            ctx.lineTo(c * cs, ROWS * cs);
            ctx.stroke();
        }

        // Placed blocks
        for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = this.board[r][c];
                if (cell) {
                    this.drawBlock(ctx, c, r - HIDDEN_ROWS, cell.color, cell.glow, time);
                }
            }
        }

        // Ghost piece
        if (this.current && !this.gameOver) {
            const { shape, x } = this.current;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (!shape[r][c]) continue;
                    const drawY = this.ghostY + r - HIDDEN_ROWS;
                    if (drawY >= 0) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                        ctx.fillRect((x + c) * cs + 1, drawY * cs + 1, cs - 2, cs - 2);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect((x + c) * cs + 1, drawY * cs + 1, cs - 2, cs - 2);
                    }
                }
            }
        }

        // Current piece
        if (this.current && !this.gameOver) {
            const { shape, x, y, color, glow } = this.current;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (!shape[r][c]) continue;
                    const drawY = y + r - HIDDEN_ROWS;
                    if (drawY >= 0) {
                        this.drawBlock(ctx, x + c, drawY, color, glow, time, true);
                    }
                }
            }
        }

        // Draw hold and next
        this.drawHold();
        this.drawNext();
    }

    drawBlock(ctx, col, row, color, glow, time, isCurrent = false) {
        const cs = this.cellSize;
        const x = col * cs;
        const y = row * cs;
        const pulse = isCurrent ? 0.15 * Math.sin(time * 0.005) : 0;

        // Main block
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85 + pulse;
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

        // Inner highlight
        const grad = ctx.createLinearGradient(x, y, x + cs, y + cs);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);

        // Outer glow
        ctx.globalAlpha = 0.4 + pulse;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
        ctx.shadowBlur = 0;

        // Circuit-like inner lines
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x + cs * 0.3, y + 2);
        ctx.lineTo(x + cs * 0.3, y + cs * 0.4);
        ctx.lineTo(x + cs * 0.7, y + cs * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + cs * 0.7, y + cs - 2);
        ctx.lineTo(x + cs * 0.7, y + cs * 0.6);
        ctx.lineTo(x + cs * 0.3, y + cs * 0.6);
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    drawMiniPiece(ctx, name, offsetX, offsetY, size = 20) {
        if (!name) return;
        const piece = PIECES[name];
        const shape = piece.shape;
        const rows = shape.length;
        const cols = shape[0].length;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!shape[r][c]) continue;
                const x = offsetX + c * size;
                const y = offsetY + r * size;

                ctx.fillStyle = piece.color;
                ctx.globalAlpha = 0.9;
                ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

                ctx.shadowColor = piece.glow;
                ctx.shadowBlur = 6;
                ctx.strokeStyle = piece.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
        }
    }

    drawHold() {
        const ctx = this.holdCtx;
        const w = this.holdCanvas.width;
        const h = this.holdCanvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(5, 5, 15, 0.5)';
        ctx.fillRect(0, 0, w, h);

        if (this.holdPiece) {
            const piece = PIECES[this.holdPiece];
            const cols = piece.shape[0].length;
            const rows = piece.shape.length;
            const size = 22;
            const ox = (w - cols * size) / 2;
            const oy = (h - rows * size) / 2;
            this.drawMiniPiece(ctx, this.holdPiece, ox, oy, size);
        }
    }

    drawNext() {
        const ctx = this.nextCtx;
        const w = this.nextCanvas.width;
        const h = this.nextCanvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(5, 5, 15, 0.5)';
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < this.nextPieces.length; i++) {
            const name = this.nextPieces[i];
            const piece = PIECES[name];
            const cols = piece.shape[0].length;
            const rows = piece.shape.length;
            const size = 22;
            const ox = (w - cols * size) / 2;
            const oy = i * 120 + (120 - rows * size) / 2;
            this.drawMiniPiece(ctx, name, ox, oy, size);
        }
    }
}
