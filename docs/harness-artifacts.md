# 하네스 산출물 — U:NAVI 화면 디자인

## 단계별 파일

```
work/<화면-slug>/
  01-research.md    S1 레퍼런스 목록 + 반영 포인트
  02-spec.md        S2 화면 설계서
  03-draft.json     S3 Figma 파일 키 + 390·1440 프레임 node id
  04-approval.md    승인/반려 기록 (사람이 채팅으로 승인 → 오케스트레이터가 기록)
  05-build.json     S4 최종 화면 node id
  06-judge.json     S5 위반 리포트 (항목별 건수, 통과 여부)
```
- slug는 영문. 화면 이름 ↔ slug 표는 rules/design-rules.json `screens`에 둔다.

## 규칙 SSOT

- `rules/design-rules.json` 1개. 판정 스크립트는 이 파일만 읽는다.
- design.md에서 셀 수 있는 값(색, 모서리, 글꼴, 굵기, 자간, 프레임, 그림자 허용 대상, 금지어, 예외, 화면 slug)만 뽑아 둔다.
- `source.sha256`에 design.md 해시를 저장한다. design.md 해시가 다르면 판정 스크립트는 실패한다(규칙 파일 갱신 필요).
- 금지어 초기값: "합격 가능", "합격 확률", "합격 보장" (design.md Voice, PRD 13장). 예외: "될각".

## 재개

- `work/<slug>/`에서 처음으로 비어 있는 파일의 단계부터 다시 시작한다.
- `04-approval.md`에 승인이 없으면 S4로 넘어가지 않는다.

## Figma

- 파일 1개("진학 내비 디자인"), 화면마다 페이지 1개.
- 프레임 이름: `<slug>/390`, `<slug>/1440`.
- 첫 실행 때 새로 만들고, 파일 키는 `work/figma.json`에 저장한다 (R6: rules/는 사람만 수정).
