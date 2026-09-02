# -*- coding: utf-8 -*-
import os
import json
import logging
from plugins.metadata.base import BaseMetadataProvider

logger = logging.getLogger(__name__)


def build_mini_game_bundle():
    """games/ 하위 폴더들을 스캔하여 index.html, style.css, script.js를 자동 갱신"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    games_dir = os.path.join(base_dir, "games")

    if not os.path.exists(games_dir):
        return

    game_entries = []
    for item in sorted(os.listdir(games_dir)):
        item_path = os.path.join(games_dir, item)
        if not os.path.isdir(item_path):
            continue

        m_file = os.path.join(item_path, "manifest.json")
        t_file = os.path.join(item_path, "template.html")
        s_file = os.path.join(item_path, "style.css")
        g_file = os.path.join(item_path, "game.js")

        if os.path.exists(m_file) and os.path.exists(t_file) and os.path.exists(g_file):
            try:
                with open(m_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                with open(t_file, "r", encoding="utf-8") as f:
                    html_c = f.read()
                with open(g_file, "r", encoding="utf-8") as f:
                    js_c = f.read()
                css_c = ""
                if os.path.exists(s_file):
                    with open(s_file, "r", encoding="utf-8") as f:
                        css_c = f.read()

                game_entries.append({
                    "id": meta.get("id", item),
                    "name": meta.get("name", item),
                    "icon": meta.get("icon", "fa-solid fa-gamepad"),
                    "order": meta.get("order", 99),
                    "html": html_c,
                    "css": css_c,
                    "js": js_c
                })
            except Exception as e:
                logger.error("[ym_mini_game] 게임 읽기 실패 (%s): %s", item, e)

    game_entries.sort(key=lambda x: x["order"])

    # 1. index.html 생성
    index_html_content = """<div class="mini-app-container">
    <div class="mini-top-banner">
        <div class="banner-left">
            <div class="banner-icon-box">
                <i id="banner-main-icon" class="fa-solid fa-gamepad"></i>
            </div>
            <div class="banner-info">
                <div class="banner-title-row">
                    <h2 class="banner-title">미니게임 아케이드</h2>
                    <span class="banner-version">v1.1.0</span>
                    <span id="app-status-badge" class="mini-badge">READY</span>
                </div>
                <p class="banner-desc">북오아시스 미니게임 허브 · 오른쪽 목록에서 게임을 선택하세요.</p>
            </div>
        </div>
    </div>

    <div class="mini-main-layout">
        <div id="game-viewport" class="game-viewport"></div>
        <div class="game-list-sidebar">
            <div class="game-list-header"><i class="fa-solid fa-list-ul"></i> 게임 목록</div>
            <div id="game-list" class="game-list"></div>
        </div>
    </div>
</div>"""
    with open(os.path.join(base_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html_content)

    # 2. style.css 생성
    base_css = """/* 공통 프레임워크 CSS */
.mini-app-container { display: flex; flex-direction: column; width: 100%; min-height: 100%; padding: 1.5rem 2rem; box-sizing: border-box; background-color: var(--app-bg-main); gap: 1.5rem; }
.mini-top-banner { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 1.25rem 1.5rem; background: var(--app-bg-card); border: 1px solid var(--app-border); border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08); box-sizing: border-box; flex-wrap: wrap; gap: 1rem; }
.banner-left { display: flex; align-items: center; gap: 1.2rem; }
.banner-icon-box { width: 52px; height: 52px; background: var(--app-accent); color: #ffffff; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 1.6rem; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15); }
.banner-info { display: flex; flex-direction: column; gap: 0.25rem; }
.banner-title-row { display: flex; align-items: center; gap: 0.75rem; }
.banner-title { margin: 0; font-size: 1.35rem; font-weight: 800; color: var(--app-text-primary); }
.banner-version { font-size: 0.85rem; font-weight: 600; color: var(--app-text-muted); }
.mini-badge { background: var(--app-border); color: var(--app-text-muted); font-size: 0.72rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 700; text-transform: uppercase; }
.mini-badge.playing { background: var(--app-accent); color: #ffffff; }
.mini-badge.paused { background: #f59e0b; color: #ffffff; }
.mini-badge.won { background: #10b981; color: #ffffff; }
.mini-badge.lost { background: #ef4444; color: #ffffff; }
.banner-desc { margin: 0; font-size: 0.88rem; color: var(--app-text-muted); }
.game-viewport { width: 100%; min-width: 0; }
.btn-banner { padding: 0.6rem 1.1rem; border-radius: 8px; border: 1px solid transparent; font-size: 0.88rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem; transition: all 0.2s ease; }
.btn-banner:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-banner.primary { background: var(--app-accent); color: #ffffff; }
.btn-banner.secondary { background: var(--app-bg-card-hover); border-color: var(--app-border); color: var(--app-text-primary); }
.btn-banner.secondary.active-flag { background: #ef4444; color: #ffffff; }
.btn-banner.danger { background: #ef4444; color: #ffffff; }

/* 메인 레이아웃: 좌측 게임 뷰포트 + 우측 게임 목록 */
.mini-main-layout { display: flex; align-items: flex-start; gap: 1.5rem; width: 100%; }
.game-list-sidebar {
    flex: 0 0 240px; width: 240px; background: var(--app-bg-card); border: 1px solid var(--app-border);
    border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08); box-sizing: border-box;
    display: flex; flex-direction: column; overflow: hidden; position: sticky; top: 1.5rem;
    max-height: calc(100vh - 3rem);
}
.game-list-header {
    padding: 1rem 1.1rem; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.03em;
    text-transform: uppercase; color: var(--app-text-secondary); border-bottom: 1px solid var(--app-border-light);
    display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;
}
.game-list { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.6rem; overflow-y: auto; }
.game-list-item {
    display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 0.75rem; border-radius: 8px;
    cursor: pointer; color: var(--app-text-primary); background: transparent; border: 1px solid transparent;
    font-size: 0.88rem; font-weight: 600; transition: background-color 0.15s ease;
}
.game-list-item:hover { background: var(--app-bg-card-hover); }
.game-list-item.active { background: var(--app-accent); color: #ffffff; border-color: var(--app-accent); }
.game-list-item .game-list-icon {
    width: 30px; height: 30px; border-radius: 8px; background: var(--app-bg-main);
    display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;
    color: var(--app-accent);
}
.game-list-item.active .game-list-icon { background: rgba(255,255,255,0.2); color: #ffffff; }
.game-list-item .game-list-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 900px) {
    .mini-main-layout { flex-direction: column; }
    .game-list-sidebar { width: 100%; flex: 1 1 auto; position: static; max-height: none; order: -1; }
    .game-list { flex-direction: row; flex-wrap: wrap; max-height: 160px; overflow-y: auto; }
    .game-list-item { flex: 0 0 auto; }
}
"""
    # 각 하위 게임 CSS 병합
    for g in game_entries:
        base_css += f"\n\n/* === [Game: {g['id']}] === */\n{g['css']}"

    with open(os.path.join(base_dir, "style.css"), "w", encoding="utf-8") as f:
        f.write(base_css)

    # 3. script.js 생성
    js_bundle = """// Auto-generated MiniGame Hub
(function () {
    const GameData = """ + json.dumps(game_entries, ensure_ascii=False) + """;
    const GameRegistry = {};
    window.YmMiniGameHub = {
        register(gameId, meta, handler) {
            // meta(name/icon/order)는 manifest.json에서 이미 GameData로 로드되어 있으므로
            // 여기서는 실제 실행 함수(handler)만 저장한다.
            GameRegistry[gameId] = handler;
        }
    };
"""
    for g in game_entries:
        js_bundle += f"\n// --- Game Script: {g['id']} ---\n{g['js']}\n"

    js_bundle += """
    const listEl = document.getElementById('game-list');
    const viewportEl = document.getElementById('game-viewport');
    const bannerIcon = document.getElementById('banner-main-icon');
    const statusBadge = document.getElementById('app-status-badge');
    let activeInstance = null;

    function setStatusBadge(text, className) {
        if (statusBadge) {
            statusBadge.textContent = text;
            statusBadge.className = 'mini-badge ' + (className || '');
        }
    }

    function init() {
        listEl.innerHTML = '';
        GameData.forEach(g => {
            const item = document.createElement('div');
            item.className = 'game-list-item';
            item.dataset.gameId = g.id;
            item.innerHTML =
                '<span class="game-list-icon"><i class="' + g.icon + '"></i></span>' +
                '<span class="game-list-name">' + g.name + '</span>';
            item.addEventListener('click', () => mount(g.id));
            listEl.appendChild(item);
        });

        if (GameData.length > 0) {
            mount(GameData[0].id);
        }
    }

    function setActiveListItem(gameId) {
        listEl.querySelectorAll('.game-list-item').forEach(el => {
            el.classList.toggle('active', el.dataset.gameId === gameId);
        });
    }

    function mount(gameId) {
        const game = GameData.find(g => g.id === gameId);
        if (!game) return;

        if (activeInstance && activeInstance.destroy) {
            try { activeInstance.destroy(); } catch (e) {}
        }
        activeInstance = null;

        if (bannerIcon) bannerIcon.className = game.icon;
        setActiveListItem(gameId);
        viewportEl.innerHTML = game.html;

        const handler = GameRegistry[gameId];
        if (typeof handler === 'function') {
            activeInstance = handler(viewportEl, { setStatusBadge });
            if (activeInstance && activeInstance.init) activeInstance.init();
        }
    }

    init();
})();
"""
    with open(os.path.join(base_dir, "script.js"), "w", encoding="utf-8") as f:
        f.write(js_bundle)


# 서버 로드시 games/ 폴더 자동 빌드 실행
try:
    build_mini_game_bundle()
except Exception as err:
    logger.error("[ym_mini_game] 자동 빌드 실패: %s", err)


class YmMiniGamePlugin(BaseMetadataProvider):
    id = "ym_mini_game"
    name = "미니게임 아케이드 (Mini Game)"
    is_searchable = False
    config_schema = []

    category_tab = {
        "title": "미니게임",
        "icon": "fa-solid fa-gamepad",
        "order": 90,
        "sessions": "all",
    }

    def search(self, db_type, query):
        return {"success": True, "items": []}

    def apply(self, db_type, book_id, item_data):
        return False, "미니게임 전용 플러그인입니다."