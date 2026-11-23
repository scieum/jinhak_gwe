# 하네스 검증과 리뷰 — U:NAVI 화면 디자인

## 1. 판정 스크립트 단위 테스트
- `tests/fixtures/clean.json`: 위반 0건인 가짜 Figma 응답 → J1~J8 모두 0
- `tests/fixtures/dirty.json`: J1~J8을 항목당 정확히 1건씩 → 각 항목 1
- J9: 해시를 바꾼 규칙 파일로 실패 확인
- gate.py: G1·G2·G3·approval마다 통과/실패 샘플 1쌍
- 실행: `python -m unittest`

## 2. 시험 실행 (드라이런)
- 대상: `수시로` (susiro). S1 → S5 전체 1회.
- 사전 준비: `FIGMA_TOKEN` 환경변수 (읽기 전용 `file_content:read`, 파일·채팅에 넣지 않음)

## 3. 리뷰
- 스크립트 작성 후 `/code-review`
- 드라이런 후 사람이 Figma 노드 5개를 골라 06-judge.json과 직접 대조

## 알려진 한계
- 에이전트 frontmatter는 도구 종류만 제한한다. "자기 파일만 편집"은 지침으로만 지켜진다.
- 훅이 강제로 막는 범위: `docs/`, `rules/`, `scripts/`
- 04-approval.md는 채팅 승인을 오케스트레이터가 기록한다. 하위 에이전트가 쓰지 않는다는 것은 지침으로만 지켜진다.
1