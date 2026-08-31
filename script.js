// plugins/metadata/ym_mini_game/script.js

(function () {
    window.YmMiniGameHub = {
        games: {},
        activeInstance: null,
        activeGameId: null,

        // 하위 game.js에서 호출하여 게임 등록
        register(gameId, meta, handler) {
            this.games[gameId] = {
                id: gameId,
                name: meta.name || gameId,
                icon: meta.icon || 'fa-solid fa-gamepad',
                order: meta.order || 99,
                handler: handler
            };
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
    const bannerIcon = document.getElementById('banner-main-icon');

    function initHub() {
        const gameList = Object.values(window.YmMiniGameHub.games);
        gameList.sort((a, b) => a.order - b.order);

        if (gameList.length === 0) {
            viewportEl.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--app-text-muted);">등록된 게임이 없습니다.</div>';
            return;
        }

        selectorEl.innerHTML = '';
        gameList.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            selectorEl.appendChild(opt);
        });

        selectorEl.addEventListener('change', (e) => {
            mountGame(e.target.value);
        });

        // 기본 첫 번째 게임 마운트
        mountGame(gameList[0].id);
    }

    function mountGame(gameId) {
        const game = window.YmMiniGameHub.games[gameId];
        if (!game) return;

        // 기존 인스턴스 정리
        if (window.YmMiniGameHub.activeInstance && window.YmMiniGameHub.activeInstance.destroy) {
            try {
                window.YmMiniGameHub.activeInstance.destroy();
            } catch (e) {
                console.warn(e);
            }
        }
        window.YmMiniGameHub.activeInstance = null;
        window.YmMiniGameHub.activeGameId = gameId;

        if (bannerIcon) bannerIcon.className = game.icon;

        // 새 게임 마운트
        viewportEl.innerHTML = '';
        window.YmMiniGameHub.activeInstance = game.handler(viewportEl, window.YmMiniGameHub);
        if (window.YmMiniGameHub.activeInstance && window.YmMiniGameHub.activeInstance.init) {
            window.YmMiniGameHub.activeInstance.init();
        }
    }

    // DOM 로드 완료 후 초기화
    setTimeout(initHub, 50);
})();
