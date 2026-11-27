# 2028 수시 교과전형 환산 규칙 AI 초안

2026-11-27 작성. 2028 대입전형 시행계획 원문(어디가·대학 공식, `work/_data/admission-plans`)에서 수시 교과전형 896개(대학·캠퍼스 168곳)의 학생부 반영 방법을 에이전트가 읽어 만든 **검수 전 초안**이에요.

- `rule-drafts.json`: 규칙 관리 화면 **'규칙 기록 합치기'**로 불러오는 파일. 원문 인용이 확인되고 앱 엔진으로 표현되는 완전한 초안만 들어 있어요. 모두 `작성 중` · `AI 초안` · review_status `draft`.
- `report.md`: 896개 전형 전체 검수 목록(상태 · 빠진 값 · 엔진과 다른 점).
- 상태: complete(필수 값 모두 원문 확인) · partial(일부만, 예: 5등급 점수표가 2028 시행계획에 없음 — 2027년 5월 모집요강에서 채움) · 엔진 밖(원문 방식이 엔진 모델로 표현되지 않음) · not_applicable.

**계산에 쓰려면(NEVER-1)**: 규칙 관리에서 원문과 대조 → 테스트 케이스 3개 → 작성자가 아닌 관리자가 승인 → '배포 파일 내보내기'로 `app/public/data/scoring-rules.json` 교체.

다시 만들기: `python work/_data/scoring-rules/prepare.py`(원문 텍스트 추출, 로컬 전용) → 에이전트가 `AGENT_SPEC.md`대로 drafts 작성 → `python work/_data/scoring-rules/build.py`. 검사: `app/tests/scoring-rule-drafts.test.ts`.
