# -*- coding: utf-8 -*-
import os
import json
import logging
from plugins.metadata.base import BaseMetadataProvider

logger = logging.getLogger(__name__)


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

    def get_dashboard_data(self, db_type, limit=10):
        """games/ 폴더 하위의 모든 게임 모듈을 자동 스캔하여 반환"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        games_dir = os.path.join(base_dir, "games")
        game_list = []

        if not os.path.exists(games_dir):
            return {"success": True, "games": []}

        for item in sorted(os.listdir(games_dir)):
            item_path = os.path.join(games_dir, item)
            if not os.path.isdir(item_path):
                continue

            manifest_path = os.path.join(item_path, "manifest.json")
            template_path = os.path.join(item_path, "template.html")
            style_path = os.path.join(item_path, "style.css")
            game_js_path = os.path.join(item_path, "game.js")

            # manifest.json 및 필수 파일 확인
            if not (os.path.exists(manifest_path) and os.path.exists(template_path) and os.path.exists(game_js_path)):
                continue

            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)

                with open(template_path, "r", encoding="utf-8") as f:
                    html_content = f.read()

                with open(game_js_path, "r", encoding="utf-8") as f:
                    js_content = f.read()

                css_content = ""
                if os.path.exists(style_path):
                    with open(style_path, "r", encoding="utf-8") as f:
                        css_content = f.read()

                game_list.append({
                    "id": meta.get("id", item),
                    "name": meta.get("name", item),
                    "icon": meta.get("icon", "fa-solid fa-gamepad"),
                    "order": meta.get("order", 99),
                    "html": html_content,
                    "css": css_content,
                    "js": js_content,
                })
            except Exception as e:
                logger.error("[ym_mini_game] 게임 모듈 로드 실패 (%s): %s", item, e)

        # 순서 정렬
        game_list.sort(key=lambda x: x["order"])
        return {"success": True, "games": game_list}