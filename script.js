// plugins/metadata/tetris_game/script.js

(function () {
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;

    // 7종 테트로미노 형태 및 색상 정의
    const SHAPES = {
        I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
        O: [[1, 1], [1, 1]],
        S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
    };

    const COLORS = {
        I: '#06b6d4', // Cyan
        J: '#3b82f6', // Blue
        L: '#f97316', // Orange
        O: '#eab308', // Yellow
        S: '#22c55e', // Green
        T: '#a855f7', // Purple
        Z: '#ef4444'  // Red
    };

    // DOM 요소 캐싱
    const canvas = document.getElementById('tetris-board');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('tetris-next');
    const nextCtx = nextCanvas.getContext('2d');

    const scoreEl = document.getElementById('tetris-score');
    const levelEl = document.getElementById('tetris-level');
    const linesEl = document.getElementById('tetris-lines');
    const highScoreEl = document.getElementById('tetris-high-score');
    const statusBadge = document.getElementById('tetris-status-badge');

    const overlay = document.getElementById('tetris-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayMsg = document.getElementById('overlay-msg');
    const btnOverlayAction = document.getElementById('btn-overlay-action');

    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');

    // 게임 상태 변수
    let grid = createGrid();
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let level = 1;
    let lines = 0;
    let highScore = parseInt(localStorage.getItem('bookoasis_tetris_high') || '0', 10);
    let dropInterval = 1000;
    let lastDropTime = 0;
    let isPlaying = false;
    let isPaused = false;
    let animationFrameId = null;

    highScoreEl.textContent = highScore;

    function createGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    function getRandomPiece() {
        const keys = Object.keys(SHAPES);
        const type = keys[Math.floor(Math.random() * keys.length)];
        const shape = SHAPES[type];
        return {
            type: type,
            shape: shape,
            color: COLORS[type],
            x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
            y: 0
        };
    }

    // 블록 회전 행렬 연산
    function rotate(matrix) {
        const N = matrix.length;
        const result = matrix.map((row, i) =>
            row.map((val, j) => matrix[N - 1 - j][i])
        );
        return result;
    }

    // 충돌 검사
    function collide(grid, piece, offsetX = 0, offsetY = 0, newShape = null) {
        const shape = newShape || piece.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const targetX = piece.x + x + offsetX;
                    const targetY = piece.y + y + offsetY;

                    if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
                        return true;
                    }
                    if (targetY >= 0 && grid[targetY][targetX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 블록 고정 및 라인 제거
    function merge(grid, piece) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value && piece.y + y >= 0) {
                    grid[piece.y + y][piece.x + x] = piece.color;
                }
            });
        });
    }

    function clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (grid[y].every(cell => cell !== 0)) {
                grid.splice(y, 1);
                grid.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++; // 행이 아래로 밀려나므로 같은 인덱스 재검사
            }
        }

        if (linesCleared > 0) {
            lines += linesCleared;
            // 테트리스 점수 공식
            const lineScores = [0, 100, 300, 500, 800];
            score += (lineScores[linesCleared] || 100) * level;

            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(120, 1000 - (level - 1) * 90);

            updateStats();
        }
    }

    function updateStats() {
        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = lines;

        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('bookoasis_tetris_high', highScore);
        }
    }

    // 렌더링 함수
    function drawBlock(c, x, y, color, size = BLOCK_SIZE) {
        c.fillStyle = color;
        c.fillRect(x * size, y * size, size, size);

        // 입체 효과 테두리
        c.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        c.lineWidth = 2;
        c.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);

        c.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        c.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);
    }

    function draw() {
        // 메인 보드 배경
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 그리드 보조선
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK_SIZE, 0);
            ctx.lineTo(x * BLOCK_SIZE, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK_SIZE);
            ctx.lineTo(canvas.width, y * BLOCK_SIZE);
            ctx.stroke();
        }

        // 고정된 블록 렌더링
        grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(ctx, x, y, value);
                }
            });
        });

        // 고스트 피스(낙하 예상 지점 가이드) 렌더링
        if (currentPiece && isPlaying && !isPaused) {
            let ghostY = 0;
            while (!collide(grid, currentPiece, 0, ghostY + 1)) {
                ghostY++;
            }
            currentPiece.shape.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                        ctx.fillRect((currentPiece.x + x) * BLOCK_SIZE, (currentPiece.y + y + ghostY) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                });
            });
        }

        // 현재 조작 중인 블록 렌더링
        if (currentPiece) {
            currentPiece.shape.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val) {
                        drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, currentPiece.color);
                    }
                });
            });
        }

        // 다음 블록 미리보기 렌더링
        drawNextPiece();
    }

    function drawNextPiece() {
        nextCtx.fillStyle = '#0b0f19';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

        if (!nextPiece) return;

        const shape = nextPiece.shape;
        const size = 24;
        const offsetX = (nextCanvas.width - shape[0].length * size) / 2;
        const offsetY = (nextCanvas.height - shape.length * size) / 2;

        shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val) {
                    nextCtx.fillStyle = nextPiece.color;
                    nextCtx.fillRect(offsetX + x * size, offsetY + y * size, size, size);
                    nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    nextCtx.lineWidth = 1;
                    nextCtx.strokeRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, size - 2);
                }
            });
        });
    }

    // 메인 게임 루프
    function gameLoop(time = 0) {
        if (!isPlaying || isPaused) return;

        const deltaTime = time - lastDropTime;
        if (deltaTime > dropInterval) {
            moveDown();
            lastDropTime = time;
        }

        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function moveDown() {
        if (!collide(grid, currentPiece, 0, 1)) {
            currentPiece.y++;
        } else {
            merge(grid, currentPiece);
            clearLines();
            spawnPiece();
        }
        draw();
    }

    function hardDrop() {
        if (!isPlaying || isPaused || !currentPiece) return;
        while (!collide(grid, currentPiece, 0, 1)) {
            currentPiece.y++;
            score += 2; // 하드 드롭 추가 점수
        }
        merge(grid, currentPiece);
        clearLines();
        spawnPiece();
        updateStats();
        draw();
    }

    function moveLeft() {
        if (!isPlaying || isPaused || !currentPiece) return;
        if (!collide(grid, currentPiece, -1, 0)) currentPiece.x--;
        draw();
    }

    function moveRight() {
        if (!isPlaying || isPaused || !currentPiece) return;
        if (!collide(grid, currentPiece, 1, 0)) currentPiece.x++;
        draw();
    }

    function rotatePiece() {
        if (!isPlaying || isPaused || !currentPiece) return;
        const rotated = rotate(currentPiece.shape);
        // Wall kick 기본 처리 (좌/우 보정)
        if (!collide(grid, currentPiece, 0, 0, rotated)) {
            currentPiece.shape = rotated;
        } else if (!collide(grid, currentPiece, -1, 0, rotated)) {
            currentPiece.x--;
            currentPiece.shape = rotated;
        } else if (!collide(grid, currentPiece, 1, 0, rotated)) {
            currentPiece.x++;
            currentPiece.shape = rotated;
        }
        draw();
    }

    function spawnPiece() {
        currentPiece = nextPiece || getRandomPiece();
        nextPiece = getRandomPiece();

        // 생성 직후 충돌 시 게임 오버
        if (collide(grid, currentPiece, 0, 0)) {
            gameOver();
        }
    }

    function startGame() {
        grid = createGrid();
        score = 0;
        level = 1;
        lines = 0;
        dropInterval = 1000;
        isPlaying = true;
        isPaused = false;

        updateStats();
        nextPiece = getRandomPiece();
        spawnPiece();

        btnStart.textContent = '게임 중...';
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnPause.textContent = '일시 정지';

        statusBadge.textContent = 'PLAYING';
        statusBadge.className = 'tetris-badge playing';

        overlay.classList.add('hidden');
        lastDropTime = performance.now();
        cancelAnimationFrame(animationFrameId);
        gameLoop();
    }

    function togglePause() {
        if (!isPlaying) return;
        isPaused = !isPaused;

        if (isPaused) {
            btnPause.textContent = '계속 하기';
            statusBadge.textContent = 'PAUSED';
            statusBadge.className = 'tetris-badge paused';
            overlayTitle.textContent = 'PAUSED';
            overlayTitle.style.color = '#f59e0b';
            overlayMsg.textContent = '게임이 일시정지되었습니다.';
            btnOverlayAction.textContent = '계속 진행';
            overlay.classList.remove('hidden');
        } else {
            btnPause.textContent = '일시 정지';
            statusBadge.textContent = 'PLAYING';
            statusBadge.className = 'tetris-badge playing';
            overlay.classList.add('hidden');
            lastDropTime = performance.now();
            gameLoop();
        }
    }

    function gameOver() {
        isPlaying = false;
        isPaused = false;
        cancelAnimationFrame(animationFrameId);

        btnStart.textContent = '새 게임';
        btnStart.disabled = false;
        btnPause.disabled = true;

        statusBadge.textContent = 'GAME OVER';
        statusBadge.className = 'tetris-badge';

        overlayTitle.textContent = 'GAME OVER';
        overlayTitle.style.color = '#ef4444';
        overlayMsg.textContent = `최종 점수: ${score}점 (레벨 ${level})`;
        btnOverlayAction.textContent = '다시 시작';
        overlay.classList.remove('hidden');
    }

    function resetGame() {
        isPlaying = false;
        isPaused = false;
        cancelAnimationFrame(animationFrameId);
        grid = createGrid();
        currentPiece = null;
        nextPiece = null;
        score = 0;
        level = 1;
        lines = 0;
        updateStats();

        btnStart.textContent = '게임 시작';
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnPause.textContent = '일시 정지';

        statusBadge.textContent = 'READY';
        statusBadge.className = 'tetris-badge';
        overlay.classList.add('hidden');
        draw();
    }

    // 키보드 이벤트 리스너
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            // 게임 중 스크롤 방지
            if (isPlaying && !isPaused) e.preventDefault();
        }

        switch (e.code) {
            case 'ArrowLeft': moveLeft(); break;
            case 'ArrowRight': moveRight(); break;
            case 'ArrowDown': moveDown(); break;
            case 'ArrowUp': rotatePiece(); break;
            case 'Space': hardDrop(); break;
            case 'KeyP': togglePause(); break;
        }
    });

    // 버튼 이벤트 연결
    btnStart.addEventListener('click', startGame);
    btnPause.addEventListener('click', togglePause);
    btnReset.addEventListener('click', resetGame);
    btnOverlayAction.addEventListener('click', () => {
        if (isPaused) {
            togglePause();
        } else {
            startGame();
        }
    });

    // 모바일 터치 컨트롤러 이벤트 연결
    document.querySelectorAll('.touch-btn').forEach(btn => {
        const action = btn.getAttribute('data-action');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switch (action) {
                case 'left': moveLeft(); break;
                case 'right': moveRight(); break;
                case 'down': moveDown(); break;
                case 'rotate': rotatePiece(); break;
                case 'drop': hardDrop(); break;
            }
        });
    });

    // 초기 화면 그리기
    draw();
})();