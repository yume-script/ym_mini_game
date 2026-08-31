# -*- coding: utf-8 -*-
from plugins.metadata.base import BaseMetadataProvider


class YmMiniGamePlugin(BaseMetadataProvider):
    id = "ym_mini_game"
    name = "미니게임 아케이드 (Mini Game)"
    is_searchable = False
    config_schema = []

    # 좌측 사이드바 1등 시민 메뉴 등록
    category_tab = {
        "title": "미니게임",
        "icon": "fa-solid fa-gamepad",
        "order": 90,
        "sessions": "all",  # 일반/성인/오디오북/비디오 전 세션 노출
    }

    def search(self, db_type, query):
        return {"success": True, "items": []}

    def apply(self, db_type, book_id, item_data):
        return False, "미니게임 전용 플러그인입니다."