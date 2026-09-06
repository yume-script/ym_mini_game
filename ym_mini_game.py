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

    # VERSION 파일의 "plugin version" 값을 읽어 배너에 표시할 버전 문자열로 사용
    plugin_version = "0.0.0"
    version_file = os.path.join(base_dir, "VERSION")
    if os.path.exists(version_file):
        try:
            with open(version_file, "r", encoding="utf-8") as f:
                version_data = json.load(f)
            plugin_version = version_data.get("plugin version", plugin_version)
        except Exception as e:
            logger.error("[ym_mini_game] VERSION 파일 읽기 실패: %s", e)

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
    index_html_content = f"""<div class="mini-app-container">
    <div class="mini-top-banner">
        <div class="banner-left">
            <div class="banner-icon-box">
                <i id="banner-main-icon" class="fa-solid fa-gamepad"></i>
            </div>
            <div class="banner-info">
                <div class="banner-title-row">
                    <h2 class="banner-title">미니게임 아케이드</h2>
                    <span class="banner-version">v{plugin_version}</span>
                    <span id="app-status-badge" class="mini-badge">READY</span>
                </div>
                <p class="banner-desc">북오아시스 미니게임 허브 · 드롭다운으로 게임을 선택하세요.</p>
            </div>
        </div>
        <div class="banner-actions">
            <div class="game-select-wrapper">
                <i class="fa-solid fa-gamepad select-icon"></i>
                <select id="game-selector" class="game-dropdown"></select>
            </div>
        </div>
    </div>
    <div id="game-viewport" class="game-viewport"></div>
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
.game-select-wrapper { position: relative; display: flex; align-items: center; }
.game-select-wrapper .select-icon { position: absolute; left: 1rem; color: var(--app-accent); font-size: 1.1rem; pointer-events: none; }
.game-dropdown { appearance: none; background: var(--app-input-bg, var(--app-bg-main)); color: var(--app-text-primary); border: 2px solid var(--app-accent); border-radius: 8px; padding: 0.65rem 2.5rem 0.65rem 2.8rem; font-size: 0.95rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>"); background-repeat: no-repeat; background-position: right 0.75rem center; }
.game-viewport { width: 100%; }
.btn-banner { padding: 0.6rem 1.1rem; border-radius: 8px; border: 1px solid transparent; font-size: 0.88rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem; transition: all 0.2s ease; }
.btn-banner:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-banner.primary { background: var(--app-accent); color: #ffffff; }
.btn-banner.secondary { background: var(--app-bg-card-hover); border-color: var(--app-border); color: var(--app-text-primary); }
.btn-banner.secondary.active-flag { background: #ef4444; color: #ffffff; }
.btn-banner.danger { background: #ef4444; color: #ffffff; }
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
    const selectorEl = document.getElementById('game-selector');
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
        selectorEl.innerHTML = '';
        GameData.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            selectorEl.appendChild(opt);
        });

        selectorEl.addEventListener('change', (e) => mount(e.target.value));

        if (GameData.length > 0) {
            mount(GameData[0].id);
        }
    }

    function mount(gameId) {
        const game = GameData.find(g => g.id === gameId);
        if (!game) return;

        if (activeInstance && activeInstance.destroy) {
            try { activeInstance.destroy(); } catch (e) {}
        }
        activeInstance = null;

        if (bannerIcon) bannerIcon.className = game.icon;
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

    # 플러그인 개발 가이드의 표준 update_manifest 계약을 그대로 사용합니다.
    # https://github.com/yume-script/ym_mini_game 저장소 루트에 ym_mini_game.py/
    # __init__.py/VERSION 이 그대로 올라가 있는 구조(브랜치: main)를 기준으로 설정했습니다.
    # 코어가 "현재 버전(VERSION의 plugin version) < GitHub 버전"일 때만 환경설정 화면에
    # 업데이트 버튼을 노출/실행합니다. games/ 하위 개별 게임 파일들은 이 매커니즘이
    # 다루는 대상이 아니므로(코어 파일 3종만 동기화), 게임 추가/수정 후에는 별도로
    # 저장소에 반영해야 합니다.
    update_manifest = {
        "enabled": True,
        "provider": "github-raw",
        "raw_base_url": "https://raw.githubusercontent.com/yume-script/ym_mini_game/main",
        "files": ["ym_mini_game.py", "__init__.py", "VERSION"],
        "version_file": "VERSION",
        "version_key": "plugin version",
        "show_sample_update_button": True,
    }

    def search(self, db_type, query):
        return {"success": True, "items": []}

    def apply(self, db_type, book_id, item_data):
        return False, "미니게임 전용 플러그인입니다."