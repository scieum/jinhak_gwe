# 하네스 역할 — 진학 내비 화면 디자인

## 역할과 편집 범위

| 역할 | 단계 | 편집 가능 | 도구 |
|---|---|---|---|
| `researcher` | S1 | `work/<slug>/01-research.md`만 | uibowl, Read |
| `planner` | S2 | `work/<slug>/02-spec.md`만 | Read |
| `designer` | S3, S4 | Figma `<slug>` 페이지, `work/<slug>/03-draft.json`, `work/<slug>/05-build.json` | Figma, Read |
| 판정자 | G1~G3, 승인 확인, S5 | 없음. 결과는 `work/<slug>/06-judge.json`으로만 출력 | `scripts/gate.py`, `scripts/judge.py` |
| 사람 | 승인 | 채팅으로 "○○ 승인했어/반려했어" | 오케스트레이터가 `work/<slug>/04-approval.md`에 기록 |

- uibowl 무료 등급은 검색 1회 최대 3건 → researcher는 G1(링크 ≥ 5)을 위해 검색어를 바꿔 2회 이상 검색한다.

## 판정자

- Python 3 표준 라이브러리만 사용. LLM 판정 없음(같은 입력 → 같은 결과).
- `scripts/gate.py <slug> <G1|G2|G3|approval>` — 단계 게이트
- `scripts/judge.py <slug>` — J1~J9. Figma REST API를 `urllib`로 직접 호출, 토큰은 환경변수 `FIGMA_TOKEN`.

## 보호 (판정 우회 방지)

- PreToolUse 훅이 Claude의 쓰기를 막는다: `docs/`, `rules/`, `scripts/`.
- 위 경로는 사람만 고친다. Figma 파일 키는 `work/figma.json`에 둔다.

## 자연어 트리거

| 말 | 동작 |
|---|---|
| "○○ 화면 디자인 시작해줘" | slug 찾기 → 처음 빈 파일의 단계부터 시작/재개 |
| "○○ 승인했어" / "○○ 반려했어" | 04-approval.md 기록 → `gate.py approval` → S4 진행 또는 S1/S2 복귀 |
| "○○ 판정해줘" | `judge.py`만 재실행 |
| "하네스 상태 보여줘" | 화면별 진행 단계 표 |
