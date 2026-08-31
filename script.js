// plugins/metadata/ym_mini_game/script.js

(function () {
    window.YmMiniGameHub = {
        registeredGames: {},
        activeInstance: null,
        activeGameId: null,

        // 하위 game.js에서 호출하는 등록 함수
        register(gameId, factoryFn) {
            this.registeredGames[gameId] = factoryFn;
        },

        setStatusBadge(text, className) {
            const badge = document.getElementById('app-status-badge');
            if (badge) {
                badge.textContent = text;
                badge.className = `mini-badge ${className || ''}`;
            }
        }
    };

    const selectorEl = document.getElementById('game-selector');
    const viewportEl = document.getElementById('game-viewport');
    let gamesData = [];

    // 1. 서버에서 games/ 모듈 로드
    async function loadGameModules() {
        try {
            // 현재 활성 스코프 확인
            const clientScope = document.documentElement.getAttribute('data-library-type') || 'general';
            const res = await fetch(`/api/media/plugins/data?plugin_id=ym_mini_game&client_scope=${clientScope}`);
            const data = await res.json();

            if (data && data.success && Array.isArray(data.games) && data.games.length > 0) {
                gamesData = data.games;
                renderSelector();
                mountGame(gamesData[0].id);
            } else {
                viewportEl.innerHTML = '<div class="loading-state">등록된 게임 모듈이 없습니다.</div>';
            }
        } catch (e) {
            console.error('[YmMiniGame] 로드 실패:', e);
            viewportEl.innerHTML = '<div class="loading-state">게임 모듈을 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    function renderSelector() {
        selectorEl.innerHTML = '';
        gamesData.forEach((g) => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            selectorEl.appendChild(opt);
        });

        selectorEl.addEventListener('change', (e) => {
            mountGame(e.target.value);
        });
    }

    // 2. 선택된 게임 모듈 동적 마운트
    function mountGame(gameId) {
        const game = gamesData.find(g => g.id === gameId);
        if (!game) return;

        // 기존 게임 인스턴스 클린업
        if (window.YmMiniGameHub.activeInstance && window.YmMiniGameHub.activeInstance.destroy) {
            try {
                window.YmMiniGameHub.activeInstance.destroy();
            } catch (err) {
                console.warn('[YmMiniGame] destroy 에러:', err);
            }
        }
        window.YmMiniGameHub.activeInstance = null;
        window.YmMiniGameHub.activeGameId = gameId;

        // 아이콘 변경
        const bannerIcon = document.getElementById('banner-main-icon');
        if (bannerIcon) bannerIcon.className = game.icon || 'fa-solid fa-gamepad';

        // 이전 동적 CSS 제거 후 새 게임 CSS 주입
        let styleTag = document.getElementById('ym-game-dynamic-css');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'ym-game-dynamic-css';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = game.css || '';

        // HTML 템플릿 마운트
        viewportEl.innerHTML = game.html;

        // JS 엔진 실행
        try {
            const runner = new Function(game.js);
            runner();

            const factory = window.YmMiniGameHub.registeredGames[gameId];
            if (typeof factory === 'function') {
                window.YmMiniGameHub.activeInstance = factory(viewportEl, window.YmMiniGameHub);
                if (window.YmMiniGameHub.activeInstance && window.YmMiniGameHub.activeInstance.init) {
                    window.YmMiniGameHub.activeInstance.init();
                }
            }
        } catch (e) {
            console.error(`[YmMiniGame] 게임(${gameId}) 실행 오류:`, e);
        }
    }

    loadGameModules();
})();