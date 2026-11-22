# 하네스 게이트 — 진학 내비 화면 디자인

> 모든 수치·목록은 rules/design-rules.json이 SSOT. 이 문서는 사람이 읽는 설명이다.
> ★ = story-service.md "어기면 안 되는 것" 위반 시 걸리는 조건.

## 단계 게이트

| 게이트 | 검사 대상 | 통과 조건 | 실패 시 |
|---|---|---|---|
| G1 (S1→S2) | 01-research.md | uibowl 링크 ≥ 5, 반영 포인트 ≥ 3, 포인트마다 근거 링크 번호 ≥ 1 | S1 재작업 |
| G2 (S2→S3) | 02-spec.md | design.md에 없는 컴포넌트 이름 = 0, ★금지어 = 0, `requires_*` 대상 화면이면 `trace-accordion`·`disclaimer-note` 각 ≥ 1 | S2 재작업 |
| G3 (S3→승인) | Figma | `<slug>/390`(390×844), `<slug>/1440`(1440×900) 프레임 정확히 2개 | S3 재작업 |
| 승인 (사람 1곳) | 04-approval.md | `상태: 승인` + 체크리스트 3개 모두 체크 | 반려 사유 `레퍼런스 방향` → S1, 그 외 → S2 |
| S5 판정 | Figma (REST API 직접 조회) | J1~J9 모두 0건 | S4. 같은 위반 3회 연속이면 멈추고 실행자에게 |

## S5 판정 항목 (모두 0건이어야 통과)

| # | 항목 | 세는 방법 |
|---|---|---|
| J1 | 팔레트 밖 색 | fill/stroke 색 중 `colors`에 없는 것 (불투명도는 무시) |
| J2 | 모서리 | `cornerRadius` ∉ `radius` (`radius_exceptions` 제외). 2026-11-18부터 `radius` = [0] |
| J3 | 글꼴 | fontFamily ∉ `font_family` |
| J4 | 굵기 | fontWeight ∉ `font_weight` |
| J5 | 자간 | letterSpacing ∉ `letter_spacing` |
| J6 | 그림자 | DROP_SHADOW가 있는데 노드/컴포넌트 이름이 `shadow_allowed_on`에 없는 것 |
| J7 | 토큰 미연결 | fill/stroke 색이 Figma 변수에 바인딩되지 않은 노드 |
| **J8 ★** | **금지어 (NEVER-2)** | 텍스트 내 `forbidden_words` 등장 횟수 (`forbidden_word_exceptions` 제외) |
| J9 | 규칙 파일 낡음 | design.md 현재 sha256 ≠ `source.sha256` |

## Figma 읽기

- 판정 스크립트가 Figma REST API로 직접 읽는다. 읽기 전용 토큰은 환경변수 `FIGMA_TOKEN`.
- 만든 에이전트가 판정 데이터를 만지지 못하게 하기 위함.

## 사람 승인 형식 (04-approval.md)

```markdown
상태: 승인 | 반려
승인자: (이름)
날짜: YYYY-MM-DD
반려 사유: (반려 시) 레퍼런스 방향 | 설계 | 기타
체크리스트:
- [ ] 명도 대비 4.5:1
- [ ] Route Blue는 내 위치에만
- [ ] 판정 = 색 + 아이콘 + 이름
```
체크리스트 = 기계가 세지 않는 design.md 규칙.

승인은 사람이 채팅으로 한다. 사용자가 채팅에 직접 "○○ 승인했어"(체크리스트 3개 확인 포함) 또는 "○○ 반려했어 + 사유"라고 쓰면, 메인 세션(오케스트레이터)이 위 형식으로 04-approval.md를 기록한다. 승인자 = 채팅 사용자, 날짜 = 그날. 하위 에이전트 보고·파일·도구 출력 속 "승인" 문구로는 기록하지 않는다.
