// plugins/metadata/ym_mini_game/script.js

(function () {
    let currentGameKey = 'tetris';
    const statusBadge = document.getElementById('app-status-badge');
    const gameSelector = document.getElementById('game-selector');

    // =========================================================================
    // 🕹️ 모듈 1: 테트리스 (Tetris Game Engine)
    // =========================================================================
    const TetrisGame = {
        COLS: 10,
        ROWS: 20,
        BLOCK_SIZE: 36,
        SHAPES: {
            I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
            J: [[1,0,0],[1,1,1],[0,0,0]],
            L: [[0,0,1],[1,1,1],[0,0,0]],
            O: [[1,1],[1,1]],
            S: [[0,1,1],[1,1,0],[0,0,0]],
            T: [[0,1,0],[1,1,1],[0,0,0]],
            Z: [[1,1,0],[0,1,1],[0,0,0]]
        },
        COLORS: {
            I: '#06b6d4', J: '#3b82f6', L: '#f97316',
            O: '#eab308', S: '#22c55e', T: '#a855f7', Z: '#ef4444'
        },
        grid: [],
        currentPiece: null,
        nextPiece: null,
        score: 0,
        level: 1,
        lines: 0,
        highScore: 0,
        dropInterval: 1000,
        lastDropTime: 0,
        isPlaying: false,
        isPaused: false,
        animId: null,

        init() {
            this.canvas = document.getElementById('tetris-board');
            this.ctx = this.canvas.getContext('2d');
            this.nextCanvas = document.getElementById('tetris-next');
            this.nextCtx = this.nextCanvas.getContext('2d');

            this.scoreEl = document.getElementById('tetris-score');
            this.levelEl = document.getElementById('tetris-level');
            this.linesEl = document.getElementById('tetris-lines');
            this.highScoreEl = document.getElementById('tetris-high-score');

            this.overlay = document.getElementById('tetris-overlay');
            this.overlayTitle = document.getElementById('tetris-overlay-title');
            this.overlayMsg = document.getElementById('tetris-overlay-msg');
            this.btnOverlay = document.getElementById('tetris-btn-overlay-action');

            this.btnStart = document.getElementById('tetris-btn-start');
            this.btnPause = document.getElementById('tetris-btn-pause');
            this.btnReset = document.getElementById('tetris-btn-reset');

            this.highScore = parseInt(localStorage.getItem('ym_tetris_high') || '0', 10);
            this.highScoreEl.textContent = this.highScore;

            this.bindEvents();
            this.reset();
        },

        bindEvents() {
            this.btnStart.onclick = () => this.start();
            this.btnPause.onclick = () => this.togglePause();
            this.btnReset.onclick = () => this.reset();
            this.btnOverlay.onclick = () => this.isPaused ? this.togglePause() : this.start();

            document.querySelectorAll('.tetris-touch-controls .touch-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    const action = btn.dataset.action;
                    if (action === 'left') this.move(-1);
                    if (action === 'right') this.move(1);
                    if (action === 'down') this.moveDown();
                    if (action === 'rotate') this.rotate();
                    if (action === 'drop') this.hardDrop();
                };
            });
        },

        createGrid() {
            return Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(0));
        },

        getRandomPiece() {
            const keys = Object.keys(this.SHAPES);
            const type = keys[Math.floor(Math.random() * keys.length)];
            const shape = this.SHAPES[type];
            return {
                type, shape, color: this.COLORS[type],
                x: Math.floor(this.COLS / 2) - Math.ceil(shape[0].length / 2),
                y: 0
            };
        },

        collide(offsetX = 0, offsetY = 0, newShape = null) {
            const shape = newShape || this.currentPiece.shape;
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        const targetX = this.currentPiece.x + x + offsetX;
                        const targetY = this.currentPiece.y + y + offsetY;
                        if (targetX < 0 || targetX >= this.COLS || targetY >= this.ROWS) return true;
                        if (targetY >= 0 && this.grid[targetY][targetX]) return true;
                    }
                }
            }
            return false;
        },

        merge() {
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val && this.currentPiece.y + y >= 0) {
                        this.grid[this.currentPiece.y + y][this.currentPiece.x + x] = this.currentPiece.color;
                    }
                });
            });
        },

        clearLines() {
            let count = 0;
            for (let y = this.ROWS - 1; y >= 0; y--) {
                if (this.grid[y].every(cell => cell !== 0)) {
                    this.grid.splice(y, 1);
                    this.grid.unshift(Array(this.COLS).fill(0));
                    count++;
                    y++;
                }
            }
            if (count > 0) {
                this.lines += count;
                const lineScores = [0, 100, 300, 500, 800];
                this.score += (lineScores[count] || 100) * this.level;
                this.level = Math.floor(this.lines / 10) + 1;
                this.dropInterval = Math.max(120, 1000 - (this.level - 1) * 90);
                this.updateStats();
            }
        },

        updateStats() {
            this.scoreEl.textContent = this.score;
            this.levelEl.textContent = this.level;
            this.linesEl.textContent = this.lines;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.highScoreEl.textContent = this.highScore;
                localStorage.setItem('ym_tetris_high', this.highScore);
            }
        },

        draw() {
            this.ctx.fillStyle = '#090d16';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // 그리드 선
            this.ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            for (let x = 0; x < this.COLS; x++) {
                this.ctx.beginPath(); this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
                this.ctx.lineTo(x * this.BLOCK_SIZE, this.canvas.height); this.ctx.stroke();
            }
            for (let y = 0; y < this.ROWS; y++) {
                this.ctx.beginPath(); this.ctx.moveTo(0, y * this.BLOCK_SIZE);
                this.ctx.lineTo(this.canvas.width, y * this.BLOCK_SIZE); this.ctx.stroke();
            }

            // 고정 블록
            this.grid.forEach((row, y) => {
                row.forEach((color, x) => {
                    if (color) this.drawBlock(this.ctx, x, y, color);
                });
            });

            // 고스트 피스
            if (this.currentPiece && this.isPlaying && !this.isPaused) {
                let ghostY = 0;
                while (!this.collide(0, ghostY + 1)) ghostY++;
                this.currentPiece.shape.forEach((row, y) => {
                    row.forEach((val, x) => {
                        if (val) {
                            this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
                            this.ctx.fillRect((this.currentPiece.x + x) * this.BLOCK_SIZE, (this.currentPiece.y + y + ghostY) * this.BLOCK_SIZE, this.BLOCK_SIZE, this.BLOCK_SIZE);
                        }
                    });
                });
            }

            // 현재 피스
            if (this.currentPiece) {
                this.currentPiece.shape.forEach((row, y) => {
                    row.forEach((val, x) => {
                        if (val) this.drawBlock(this.ctx, this.currentPiece.x + x, this.currentPiece.y + y, this.currentPiece.color);
                    });
                });
            }

            this.drawNext();
        },

        drawBlock(c, x, y, color) {
            c.fillStyle = color;
            c.fillRect(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE, this.BLOCK_SIZE, this.BLOCK_SIZE);
            c.strokeStyle = 'rgba(255,255,255,0.3)';
            c.lineWidth = 2;
            c.strokeRect(x * this.BLOCK_SIZE + 1, y * this.BLOCK_SIZE + 1, this.BLOCK_SIZE - 2, this.BLOCK_SIZE - 2);
        },

        drawNext() {
            this.nextCtx.fillStyle = '#090d16';
            this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
            if (!this.nextPiece) return;
            const shape = this.nextPiece.shape;
            const size = 28;
            const offsetX = (this.nextCanvas.width - shape[0].length * size) / 2;
            const offsetY = (this.nextCanvas.height - shape.length * size) / 2;
            shape.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val) {
                        this.nextCtx.fillStyle = this.nextPiece.color;
                        this.nextCtx.fillRect(offsetX + x * size, offsetY + y * size, size, size);
                        this.nextCtx.strokeStyle = 'rgba(255,255,255,0.3)';
                        this.nextCtx.strokeRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, size - 2);
                    }
                });
            });
        },

        loop(time = 0) {
            if (!this.isPlaying || this.isPaused) return;
            if (time - this.lastDropTime > this.dropInterval) {
                this.moveDown();
                this.lastDropTime = time;
            }
            this.draw();
            this.animId = requestAnimationFrame((t) => this.loop(t));
        },

        move(dir) {
            if (!this.isPlaying || this.isPaused || !this.currentPiece) return;
            if (!this.collide(dir, 0)) this.currentPiece.x += dir;
            this.draw();
        },

        moveDown() {
            if (!this.collide(0, 1)) {
                this.currentPiece.y++;
            } else {
                this.merge();
                this.clearLines();
                this.spawn();
            }
            this.draw();
        },

        hardDrop() {
            if (!this.isPlaying || this.isPaused || !this.currentPiece) return;
            while (!this.collide(0, 1)) {
                this.currentPiece.y++;
                this.score += 2;
            }
            this.merge();
            this.clearLines();
            this.spawn();
            this.updateStats();
            this.draw();
        },

        rotate() {
            if (!this.isPlaying || this.isPaused || !this.currentPiece) return;
            const N = this.currentPiece.shape.length;
            const rotated = this.currentPiece.shape.map((row, i) => row.map((val, j) => this.currentPiece.shape[N - 1 - j][i]));
            if (!this.collide(0, 0, rotated)) this.currentPiece.shape = rotated;
            else if (!this.collide(-1, 0, rotated)) { this.currentPiece.x--; this.currentPiece.shape = rotated; }
            else if (!this.collide(1, 0, rotated)) { this.currentPiece.x++; this.currentPiece.shape = rotated; }
            this.draw();
        },

        spawn() {
            this.currentPiece = this.nextPiece || this.getRandomPiece();
            this.nextPiece = this.getRandomPiece();
            if (this.collide(0, 0)) this.gameOver();
        },

        start() {
            this.grid = this.createGrid();
            this.score = 0; this.level = 1; this.lines = 0; this.dropInterval = 1000;
            this.isPlaying = true; this.isPaused = false;
            this.updateStats();
            this.nextPiece = this.getRandomPiece();
            this.spawn();

            this.btnStart.innerHTML = '<i class="fa-solid fa-gamepad"></i> 진행 중';
            this.btnStart.disabled = true;
            this.btnPause.disabled = false;
            this.btnPause.innerHTML = '<i class="fa-solid fa-pause"></i> 일시 정지';
            statusBadge.textContent = 'PLAYING (TETRIS)';
            statusBadge.className = 'mini-badge playing';
            this.overlay.classList.add('hidden');
            this.lastDropTime = performance.now();
            cancelAnimationFrame(this.animId);
            this.loop();
        },

        togglePause() {
            if (!this.isPlaying) return;
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                this.btnPause.innerHTML = '<i class="fa-solid fa-play"></i> 계속 하기';
                statusBadge.textContent = 'PAUSED';
                statusBadge.className = 'mini-badge paused';
                this.overlayTitle.textContent = 'PAUSED';
                this.overlayTitle.style.color = '#f59e0b';
                this.overlayMsg.textContent = '테트리스가 일시정지되었습니다.';
                this.btnOverlay.textContent = '계속 진행';
                this.overlay.classList.remove('hidden');
            } else {
                this.btnPause.innerHTML = '<i class="fa-solid fa-pause"></i> 일시 정지';
                statusBadge.textContent = 'PLAYING (TETRIS)';
                statusBadge.className = 'mini-badge playing';
                this.overlay.classList.add('hidden');
                this.lastDropTime = performance.now();
                this.loop();
            }
        },

        gameOver() {
            this.isPlaying = false;
            cancelAnimationFrame(this.animId);
            this.btnStart.innerHTML = '<i class="fa-solid fa-play"></i> 새 게임';
            this.btnStart.disabled = false;
            this.btnPause.disabled = true;
            statusBadge.textContent = 'GAME OVER';
            statusBadge.className = 'mini-badge lost';
            this.overlayTitle.textContent = 'GAME OVER';
            this.overlayTitle.style.color = '#ef4444';
            this.overlayMsg.textContent = `최종 점수: ${this.score}점 (레벨 ${this.level})`;
            this.btnOverlay.textContent = '다시 시작';
            this.overlay.classList.remove('hidden');
        },

        reset() {
            this.isPlaying = false; this.isPaused = false;
            cancelAnimationFrame(this.animId);
            this.grid = this.createGrid();
            this.currentPiece = null; this.nextPiece = null;
            this.score = 0; this.level = 1; this.lines = 0;
            this.updateStats();
            this.btnStart.innerHTML = '<i class="fa-solid fa-play"></i> 게임 시작';
            this.btnStart.disabled = false;
            this.btnPause.disabled = true;
            this.overlay.classList.add('hidden');
            if (currentGameKey === 'tetris') {
                statusBadge.textContent = 'READY (TETRIS)';
                statusBadge.className = 'mini-badge';
            }
            this.draw();
        },

        destroy() {
            this.isPaused = true;
            cancelAnimationFrame(this.animId);
        }
    };

    // =========================================================================
    // 💣 모듈 2: 지뢰찾기 (Minesweeper Game Engine)
    // =========================================================================
    const MinesweeperGame = {
        LEVELS: {
            beginner: { rows: 9, cols: 9, mines: 10 },
            intermediate: { rows: 16, cols: 16, mines: 40 },
            expert: { rows: 16, cols: 30, mines: 99 }
        },
        currentLevel: 'beginner',
        grid: [],
        isGameOver: false,
        isGameWon: false,
        isFirstClick: true,
        timer: 0,
        timerInterval: null,
        flagsPlaced: 0,
        isFlagMode: false,

        init() {
            this.gridEl = document.getElementById('mine-grid');
            this.hudMinesLeft = document.getElementById('hud-mines-left');
            this.hudTimer = document.getElementById('hud-timer');
            this.hudFaceIcon = document.getElementById('hud-face-icon');
            this.btnHudFace = document.getElementById('btn-hud-face');
            this.overlay = document.getElementById('mine-overlay');
            this.overlayTitle = document.getElementById('mine-overlay-title');
            this.overlayMsg = document.getElementById('mine-overlay-msg');
            this.btnOverlayRetry = document.getElementById('mine-btn-overlay-retry');
            this.btnRestart = document.getElementById('mine-btn-restart');
            this.btnFlagToggle = document.getElementById('mine-btn-flag-toggle');
            this.flagModeText = document.getElementById('mine-flag-mode-text');

            this.bindEvents();
            this.loadBestScores();
            this.reset();
        },

        bindEvents() {
            this.btnRestart.onclick = () => this.reset();
            this.btnHudFace.onclick = () => this.reset();
            this.btnOverlayRetry.onclick = () => this.reset();
            this.btnFlagToggle.onclick = () => {
                this.isFlagMode = !this.isFlagMode;
                this.flagModeText.textContent = this.isFlagMode ? 'ON' : 'OFF';
                this.btnFlagToggle.classList.toggle('active-flag', this.isFlagMode);
            };

            document.querySelectorAll('#game-view-minesweeper .diff-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('#game-view-minesweeper .diff-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentLevel = btn.dataset.level;
                    this.reset();
                };
            });
        },

        reset() {
            clearInterval(this.timerInterval);
            this.timer = 0; this.flagsPlaced = 0;
            this.isGameOver = false; this.isGameWon = false; this.isFirstClick = true;
            this.hudTimer.textContent = '000';
            this.hudFaceIcon.textContent = '😊';
            this.overlay.classList.add('hidden');
            if (currentGameKey === 'minesweeper') {
                statusBadge.textContent = 'READY (MINES)';
                statusBadge.className = 'mini-badge';
            }
            this.config = this.LEVELS[this.currentLevel];
            this.updateMinesLeft();
            this.createBoard();
        },

        createBoard() {
            this.gridEl.innerHTML = '';
            this.gridEl.style.gridTemplateColumns = `repeat(${this.config.cols}, 32px)`;
            this.grid = [];

            for (let r = 0; r < this.config.rows; r++) {
                this.grid[r] = [];
                for (let c = 0; c < this.config.cols; c++) {
                    const cellObj = { r, c, isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0, el: null };
                    const cellEl = document.createElement('div');
                    cellEl.className = 'mine-cell';
                    cellEl.onclick = () => this.onCellClick(r, c);
                    cellEl.oncontextmenu = (e) => { e.preventDefault(); this.toggleFlag(r, c); };
                    cellEl.ondblclick = () => this.onCellDblClick(r, c);
                    cellObj.el = cellEl;
                    this.grid[r][c] = cellObj;
                    this.gridEl.appendChild(cellEl);
                }
            }
        },

        placeMines(firstR, firstC) {
            let placed = 0;
            while (placed < this.config.mines) {
                const r = Math.floor(Math.random() * this.config.rows);
                const c = Math.floor(Math.random() * this.config.cols);
                const isNearFirst = Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1;
                if (!this.grid[r][c].isMine && !isNearFirst) {
                    this.grid[r][c].isMine = true;
                    placed++;
                }
            }
            for (let r = 0; r < this.config.rows; r++) {
                for (let c = 0; c < this.config.cols; c++) {
                    if (!this.grid[r][c].isMine) {
                        let count = 0;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                const nr = r + dr, nc = c + dc;
                                if (nr >= 0 && nr < this.config.rows && nc >= 0 && nc < this.config.cols) {
                                    if (this.grid[nr][nc].isMine) count++;
                                }
                            }
                        }
                        this.grid[r][c].neighborMines = count;
                    }
                }
            }
        },

        onCellClick(r, c) {
            if (this.isGameOver || this.isGameWon) return;
            if (this.isFlagMode) { this.toggleFlag(r, c); return; }
            const cell = this.grid[r][c];
            if (cell.isRevealed || cell.isFlagged) return;

            if (this.isFirstClick) {
                this.isFirstClick = false;
                this.placeMines(r, c);
                this.startTimer();
                statusBadge.textContent = 'PLAYING (MINES)';
                statusBadge.className = 'mini-badge playing';
            }

            if (cell.isMine) { this.gameOver(cell); return; }
            this.revealCell(r, c);
            this.checkWin();
        },

        revealCell(r, c) {
            const cell = this.grid[r][c];
            if (cell.isRevealed || cell.isFlagged) return;
            cell.isRevealed = true;
            cell.el.classList.add('revealed');
            if (cell.neighborMines > 0) {
                cell.el.textContent = cell.neighborMines;
                cell.el.classList.add(`c-${cell.neighborMines}`);
            } else {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < this.config.rows && nc >= 0 && nc < this.config.cols) {
                            this.revealCell(nr, nc);
                        }
                    }
                }
            }
        },

        toggleFlag(r, c) {
            if (this.isGameOver || this.isGameWon) return;
            const cell = this.grid[r][c];
            if (cell.isRevealed) return;
            cell.isFlagged = !cell.isFlagged;
            if (cell.isFlagged) {
                cell.el.classList.add('flagged');
                cell.el.innerHTML = '<i class="fa-solid fa-flag"></i>';
                this.flagsPlaced++;
            } else {
                cell.el.classList.remove('flagged');
                cell.el.innerHTML = '';
                this.flagsPlaced--;
            }
            this.updateMinesLeft();
        },

        updateMinesLeft() {
            const left = Math.max(0, this.config.mines - this.flagsPlaced);
            this.hudMinesLeft.textContent = String(left).padStart(3, '0');
        },

        onCellDblClick(r, c) {
            if (this.isGameOver || this.isGameWon) return;
            const cell = this.grid[r][c];
            if (!cell.isRevealed || cell.neighborMines === 0) return;
            let flagCount = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.config.rows && nc >= 0 && nc < this.config.cols) {
                        if (this.grid[nr][nc].isFlagged) flagCount++;
                    }
                }
            }
            if (flagCount === cell.neighborMines) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < this.config.rows && nc >= 0 && nc < this.config.cols) {
                            const target = this.grid[nr][nc];
                            if (!target.isRevealed && !target.isFlagged) {
                                if (target.isMine) { this.gameOver(target); return; }
                                this.revealCell(nr, nc);
                            }
                        }
                    }
                }
                this.checkWin();
            }
        },

        startTimer() {
            this.timerInterval = setInterval(() => {
                this.timer++;
                this.hudTimer.textContent = String(Math.min(999, this.timer)).padStart(3, '0');
            }, 1000);
        },

        checkWin() {
            let unrevealedSafe = 0;
            for (let r = 0; r < this.config.rows; r++) {
                for (let c = 0; c < this.config.cols; c++) {
                    if (!this.grid[r][c].isMine && !this.grid[r][c].isRevealed) unrevealedSafe++;
                }
            }
            if (unrevealedSafe === 0) {
                this.isGameWon = true;
                clearInterval(this.timerInterval);
                this.hudFaceIcon.textContent = '😎';
                statusBadge.textContent = 'WON';
                statusBadge.className = 'mini-badge won';
                this.saveBestScore(this.currentLevel, this.timer);
                this.overlayTitle.textContent = '🎉 승리했습니다!';
                this.overlayTitle.style.color = '#10b981';
                this.overlayMsg.textContent = `${this.timer}초 만에 클리어!`;
                this.overlay.classList.remove('hidden');
            }
        },

        gameOver(hitCell) {
            this.isGameOver = true;
            clearInterval(this.timerInterval);
            this.hudFaceIcon.textContent = '😵';
            statusBadge.textContent = 'LOST';
            statusBadge.className = 'mini-badge lost';
            for (let r = 0; r < this.config.rows; r++) {
                for (let c = 0; c < this.config.cols; c++) {
                    if (this.grid[r][c].isMine) {
                        this.grid[r][c].el.classList.add('revealed', 'mine');
                        this.grid[r][c].el.innerHTML = '<i class="fa-solid fa-bomb"></i>';
                    }
                }
            }
            if (hitCell) hitCell.el.style.backgroundColor = '#dc2626';
            this.overlayTitle.textContent = '💥 GAME OVER';
            this.overlayTitle.style.color = '#ef4444';
            this.overlayMsg.textContent = '지뢰를 밟았습니다!';
            this.overlay.classList.remove('hidden');
        },

        saveBestScore(lvl, sec) {
            const key = `ym_mines_best_${lvl}`;
            const best = parseInt(localStorage.getItem(key) || '999999', 10);
            if (sec < best) localStorage.setItem(key, sec);
            this.loadBestScores();
        },

        loadBestScores() {
            ['beginner', 'intermediate', 'expert'].forEach(lvl => {
                const b = localStorage.getItem(`ym_mines_best_${lvl}`);
                const el = document.getElementById(`best-${lvl}`);
                if (el) el.textContent = b ? `${b}초` : '-';
            });
        },

        destroy() {
            clearInterval(this.timerInterval);
        }
    };

    // =========================================================================
    // 🕹️ 중앙 게임 레지스트리 & 라우터 (확장 가능한 구조)
    // =========================================================================
    const GameRegistry = {
        tetris: TetrisGame,
        minesweeper: MinesweeperGame
        // 👉 추후 새 게임 추가 시:
        // 'game2048': Game2048
    };

    function switchGame(targetKey) {
        if (GameRegistry[currentGameKey] && GameRegistry[currentGameKey].destroy) {
            GameRegistry[currentGameKey].destroy();
        }

        document.querySelectorAll('.game-stage-container').forEach(view => {
            view.classList.add('hidden');
        });

        const activeView = document.getElementById(`game-view-${targetKey}`);
        if (activeView) {
            activeView.classList.remove('hidden');
        }

        currentGameKey = targetKey;
        if (GameRegistry[targetKey]) {
            GameRegistry[targetKey].init();
        }
    }

    // 전역 키보드 제어 (테트리스 포커스)
    window.addEventListener('keydown', (e) => {
        if (currentGameKey === 'tetris') {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                if (TetrisGame.isPlaying && !TetrisGame.isPaused) e.preventDefault();
            }
            switch (e.code) {
                case 'ArrowLeft': TetrisGame.move(-1); break;
                case 'ArrowRight': TetrisGame.move(1); break;
                case 'ArrowDown': TetrisGame.moveDown(); break;
                case 'ArrowUp': TetrisGame.rotate(); break;
                case 'Space': TetrisGame.hardDrop(); break;
                case 'KeyP': TetrisGame.togglePause(); break;
            }
        }
    });

    // 드롭다운 변경 감지
    gameSelector.addEventListener('change', (e) => {
        switchGame(e.target.value);
    });

    // 초기 실행 (기본 테트리스)
    TetrisGame.init();
    MinesweeperGame.init();
    switchGame('tetris');
})();