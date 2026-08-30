# -*- coding: utf-8 -*-
from plugins.metadata.base import BaseMetadataProvider


class TetrisGamePlugin(BaseMetadataProvider):
    id = "tetris_game"
    name = "테트리스 (Tetris)"
    is_searchable = False
    config_schema = []

    # 좌측 사이드바 1등 시민 메뉴 등록
    category_tab = {
        "title": "테트리스",
        "icon": "fa-solid fa-gamepad",
        "order": 90,
        "sessions": "all"  # 일반, 성인, 오디오북, 영상 전 세션 노출
    }

    def search(self, db_type, query):
        """메타데이터 검색 미지원 (게임 전용 플러그인)"""
        return {'success': True, 'items': []}

    def apply(self, db_type, book_id, item_data):
        """메타데이터 적용 미지원"""
        return False, "게임 전용 플러그인입니다."