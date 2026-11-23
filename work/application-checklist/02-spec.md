# 02-spec — 원서·서류 체크리스트 (application-checklist, 학생)

작성일 2026-11-23 · 담당 planner (S2)
근거: 01-research.md(0장 앱 상태 S-a~S-i · 팝업 M1~M4 · 0-3 앱에 없는 것, P1~P9, 4장 미결 1~7), docs/design.md(App Shell, Responsive Strategy, Elevation, Components — sub-nav · sidebar-item · page-header · button-* · text-input · segmented-control · data-table · disclaimer-note · empty-state · bottom-sheet · modal · toast · score-bar · filter-chip, Voice, Accessibility), docs/prd.md(6-7 수시 6장 보드, 10장 MVP 2차 "수시 원서 접수 전 최종 점검 배포", 13장), docs/story-service.md NEVER-1/2, 앱 app/src/screens/Preparation.tsx(view="checklist") · app/src/components/PlanEditor.tsx · app/src/domain/planner.ts · app/src/shell/nav.ts.
사용자 요청(채팅 원문): "시안에서 추가적으로 지금 안그린 기능들이나 추가적으로 그 안에서 팝업창 같은 것들도 더 그려봐". → 앱에 있는 화면 상태 · 팝업을 **빠짐없이** 상태 프레임으로 옮기고, 앱에 없는 새 기능도 그려요.
사용자 결정(2026-11-23 채팅, 확정): 앱에 없는 새 기능 제안(한 번 눌러 완료 체크 · 진행 막대 · 날짜 고르기 · 필터 칩)은 전부 넣어요 → 모두 확정, 상태 프레임에 포함. design.md 수정 제안(9장)은 오케스트레이터가 한 번에 패치하고, 디자이너는 대체안 대신 제안된 변형으로 그려요. 시안 날짜 · 연도 같은 열린 질문은 이 설계서 기본안대로 확정.
이 화면은 학생이 직접 등록한 전형 · 체크 항목 기록만 보여요. **계산 · 환산 · 판정이 없어요**(숫자는 항목 개수 세기뿐 → NEVER-1 대상 계산 없음). 판정 이름 · 판정 색 · 판정 아이콘 · 내 위치 표시가 없어요.
프레임: application-checklist/390 (390×844), application-checklist/1440 (1440×900). 상태 프레임 확정 32장(5장: 앱 상태 28 + 새 기능 4).
필수 포함: rules requires_trace_accordion · requires_disclaimer_note 둘 다 이 slug가 없어요. 그래도 접수처 · 입학처 최종 확인 고지를 `disclaimer-note`로 둬요(D12). `trace-accordion`은 산출 근거가 없어 쓰지 않아요.

표기: **확정** = 앱 구현 그대로 옮기거나 design.md 규칙으로 정해지는 것(planner 결정 포함). **확정(새 기능)** = 앱에 없던 기능, 2026-11-23 사용자 결정으로 확정 — 그리고 앱에도 넣어요(앱 후속). 메인 프레임 2장은 앱 구현 상태로 그리고, 새 기능은 5-2 상태 프레임에서 보여요.

## 0. 결정

| # | 항목 | 결정 | 이유 |
|---|---|---|---|
| D1 | 이름 · 메뉴 위치 — 확정(앱 nav.ts) | 화면 제목 · 메뉴 이름 = **"원서·서류 체크리스트"**. 학생 대분류 **수시 전략** 아래 소분류 둘째 칸, **5칸: 수시로 · 원서·서류 체크리스트 · 입시 일정 · 상담 질문·할 일 · 생기부 AI**(nav.ts 순서 그대로). 모바일 `sub-nav`, PC `sidebar-item`. design.md App Shell은 아직 "수시 전략(수시로 · 생기부 AI)"라서 9장 제안 1로 바꿔요 | 앱 메뉴와 design.md 목록을 맞춰요 |
| D2 | 소분류 아이콘 — 확정(planner) | **icon/list-checks**. nav.ts는 지금 'check'인데 모의고사 · 지원 자격 확인표와 겹쳐요(design.md sidebar-item "겹치지 않게"). 아이콘 세트에 없으면 디자이너가 겹치지 않는 "체크 목록" 뜻 아이콘을 고르고 보고해요. 앱 nav.ts 아이콘도 같이 바꿔야 해요(앱 후속) | 같은 사이드바 안 아이콘 중복 금지 |
| D3 | 주인공 | **체크 항목 목록** 하나(모바일 흰 카드 세로 목록, PC `data-table`). `stat-tile` hero · `stat-tile` 4개 줄은 쓰지 않아요. 개수 4칸(완료 / 확인·진행 중 / 기한 지남 / 해당 없음)은 전형 카드 안 라벨/값 한 줄 글자로 둬요 | design.md "한 화면 주인공 1개", "stat-tile 4개 습관 금지" |
| D4 | 화면 순서 — 확정(앱 S-d) | 화면 머리 → 준비할 전형 고르기 → 전형 카드(전형 정보 · 수정 · 삭제 · 자료 링크 · 개수 줄 · 바로가기 5개) → 체크 항목 목록 → "+ 체크 항목 추가" → `disclaimer-note`(앱 고지 ⑥) → 저장 위치 캡션(앱 ⑨). 앱은 고지가 목록 위에 있지만 P9대로 목록 아래로 내려요(문구는 그대로) | 앱 구성 그대로, 고지 위치만 레퍼런스(L6 · L7) 따라 이동 |
| D5 | 진행 상태 · 마감 라벨 표시 — 확정(planner) | 진행 상태 4개(확인 전 / 진행 중 / 완료 / 해당 없음)는 **아이콘 + 글자**, 모두 {colors.ink} {typography.label}: 확인 전 icon/circle-dashed · 진행 중 icon/clock · 완료 icon/check · 해당 없음 icon/minus. 마감 라벨 5개는 항목 이름 아래 한 줄 "라벨 · YYYY-MM-DD HH:MM (한국 시간)": **기한 지남** icon/calendar-x + SemiBold {colors.ink} · **오늘 마감** icon/calendar-clock + SemiBold {colors.ink} · 예정 icon/calendar {colors.ink} · 마감 미정 {colors.ink-soft} · 처리 완료 {colors.ink-soft}. **판정 색(위험 #b8232a 포함) · Route Blue · 판정 아이콘(● ◐ ▲ ■)을 쓰지 않아요.** 앱은 지금 기한 지남에 error-note 색을 쓰니 앱도 무채색으로 바꿔야 해요(앱 후속) | 기한은 내 기록이지 판정이 아니에요(01-research 미결 4). 색에 기대지 않고 아이콘 + 글자 + 굵기로 구분 |
| D6 | 체크 표시 색 | 완료 체크 아이콘은 {colors.ink}. Route Blue는 `sub-nav` · `sidebar-item` 선택, `tab-bar-pill` 선택 아이콘, `segmented-control-active`, 링크("등록한 자료 열기 ↗", "자료 열기 ↗")에만 써요 | 01-research 미결 5, 승인 체크리스트 "Route Blue는 내 위치에만" |
| D7 | 팝업 모양 — 확정 | 앱 팝업 M1~M4는 **모바일 `bottom-sheet`, PC `modal`**(최대 폭 560). 확인 팝업(M3 · M4)도 모바일은 `bottom-sheet`. 그림자는 시트 · 모달 · 토스트 · 드롭다운 목록에만 | design.md "모바일에서는 모달을 바텀시트로" |
| D8 | 삭제 흐름 — 확정 | 화면의 "전형 삭제" · "{항목 이름} 삭제"는 `button-danger-text`(design.md: 누르면 반드시 확인 모달). 확인 팝업 버튼은 같은 폭 2개: 왼쪽 `button-outline` "취소" · 오른쪽 `button-primary` "삭제"(잉크 채움). 팝업 안에 빨간 버튼 · 빨간 글자를 두지 않아요. 질문 한 줄 + 무엇이 지워지고 무엇이 남는지 한 문단(앱 문구 그대로) | 01-research P6, L8 · L9 · L10 |
| D9 | 고르기 칸(앱 select) — 확정, 9장 제안 3 | 앱의 드롭다운 3곳(준비할 전형 · M1 "등록된 전형에서 선택" · M2 진행 상태)은 이렇게 그려요. ① 준비할 전형: `button-pill-soft`(Page 위는 on=page) 꽉 찬 폭 "2028 · 경희대학교 · 학생부종합 · 행정학과 ▾" → 모바일 `bottom-sheet` 목록, PC 같은 폭 드롭다운 목록(Overlay 그림자, 레이어 이름 dropdown). ② M1 "등록된 전형에서 선택": `text-input` 변형 select(9장 제안 3, 오른쪽 ▾, 눌러 목록)로 그려요. ③ M2 진행 상태: `segmented-control` 4칸(확인 전 · 진행 중 · 완료 · 해당 없음) | 새 컴포넌트를 만들지 않아요. 선택지가 4개 이하면 세그먼트가 한 번에 보여요 |
| D10 | 마감 일시 입력 — 확정 | `text-input` 하나 "YYYY-MM-DD HH:MM" 형식(앱 datetime-local 그대로, 입력칸 안 오른쪽 icon/calendar) + 아래 caption {colors.text-muted} "한국 시간 기준이에요 · 모르면 비워 두세요". 칸을 누르면 날짜 · 시간 고르기 시트(D21) | 앱 동작 그대로 |
| D11 | 저장 결과 · 오류 — 확정 | 성공(S-g)은 `toast`(앱은 지금 화면 안 문단 → 앱 후속): "기기에 저장했어요." / "항목을 삭제했어요." / "전형을 삭제했어요. 연결된 상담 기록은 남겨 두었어요." 모바일 탭바 위, PC 오른쪽 아래, 약 4초. 실패(S-h)는 팝업 안 버튼 바로 위 오류 줄: icon/alert-circle + {typography.body-sm} {colors.judge-risk} "저장하지 못했어요. 다시 시도해 주세요."(design.md text-input-error와 같은 오류 색 쓰임, 색 + 아이콘 + 글자). 읽기 오류(S-b)도 같은 오류 줄 | design.md toast 정의, Accessibility "오류는 색 + 아이콘 + 텍스트" |
| D12 | 고지 — 확정 | `disclaimer-note`: "ⓘ 결제·접수·서류 제출은 각각 확인해 주세요. 날짜와 완료 상태는 내가 등록한 기록이며, 접수처·대학 입학처에서 최종 확인해요. 마감 시각은 한국 시간 기준이에요."(앱 문구 그대로). 목록 아래 흰 카드 안. rules requires_disclaimer_note에 이 slug를 **추가하길 권해요**(사람이 rules 수정) | PRD 13장 "대학 공식 자료가 최종 기준" |
| D13 | M1 경고 두 갈래 — 확정, 모양은 9장 제안 4 | ① 수정 중 학년도 · 대학 · 전형 · 모집단위를 바꾸면 초기화 경고 ② 추가 중 같은 전형이 있으면 중복 안내 + 주요 버튼 "기존 준비 기록 열기". 둘 다 입력칸 아래 안내 블록(ⓘ + 글자). 모양은 9장 제안 4 `warning-callout` 변형 tone=neutral(ⓘ + 글자, 판정 색 없음)로 입력칸 바로 아래에 둬요. 판정 색 경고(`warning-callout` 기본)는 쓰지 않아요 | 01-research P8. 조합 경고 색(소신 주황)을 판정 밖에 쓰지 않으려고요 |
| D14 | 바로가기 5개 — 확정(planner) | 지원 자격 확인하기 · 상담 질문·할 일 · 수시로에서 카드 담기 · 이 전형 일정 보기 · 관심 전형 모아보기. 모바일 = 전형 카드 안 **2열** `button-pill-soft`(높이 44, 3줄, 마지막 줄은 왼쪽 1개), PC = 전형 카드 안 한 줄 5개 `button-pill-soft`. 글자 뒤 "›" | 01-research 미결 6. 가로 스크롤은 뒤쪽 바로가기가 숨어요 |
| D15 | 주요 버튼 | 메인 프레임에는 `button-primary`가 없어요. "+ 지원 전형 추가" = 모바일 `button-pill-soft` on=page, PC page-header 오른쪽 `button-outline`. "+ 체크 항목 추가" = 목록 끝 `button-outline` 꽉 찬 폭. `button-primary`는 빈 상태(1개)와 팝업 안 저장 · 삭제 · 기존 기록 열기에만 | design.md "한 화면에 주요 버튼 하나" |
| D16 | 빈 상태 — 확정 | `empty-state`: 흑백 선 아이콘(icon/list-checks) → "준비할 전형을 먼저 추가해 주세요" → 앱 설명 문구 → `button-primary` "지원 전형 추가"(앱은 머리 버튼뿐이지만 design.md empty-state는 주요 버튼 하나를 둬요 · PC는 page-header 버튼도 그대로) | design.md empty-state 정의 |
| D17 | 기본 항목 · 한도 — 확정(앱) | 새 전형을 추가하면 기본 항목 5개(원서 작성 → 전형료 결제 → 접수 완료 확인 → 제출서류 준비·제출 → 서류 도착 확인)가 "확인 전 · 마감 미정"으로 생겨요. 항목 50개면 "+ 체크 항목 추가" 비활성 + caption "체크 항목은 50개까지 추가할 수 있어요"(앱은 비활성만 → 문구 추가는 앱 후속) | 앱 planner.ts 한도 50 |
| D18 | 이름 바꾸면 상태 초기화 — 확정(앱 동작) | M2에서 항목 이름을 바꾸면 진행 상태가 "확인 전"으로 돌아가요. 이름 칸 아래 caption {colors.text-muted} "이름을 바꾸면 진행 상태가 ‘확인 전’으로 돌아가요"(앱에 문구 없음 → 앱 후속) | 바뀌는 걸 미리 알려요 |
| D19 | 확정(새 기능, 2026-11-23 사용자 결정) 한 번 눌러 완료 (P1) | 항목 카드 왼쪽에 `checkbox`(9장 제안 6, 20×20 · 누르는 영역 44×44), 누르면 "완료" + 확인 기록 시각 저장 + `toast` "기기에 저장했어요.", 다시 누르면 "확인 전". 완료 행도 글자 대비 그대로(취소선 · 회색 처리 안 함), 상태 글자만 바뀜. 접근 이름 "{항목 이름} 완료로 표시" | 앱은 M2를 열어야 상태가 바뀌어요 |
| D20 | 확정(새 기능, 2026-11-23 사용자 결정) 진행 막대 (P2) | 전형 카드 개수 줄 위 "완료 1 / 6" {typography.title} + `score-bar` 진행 표시 용도(9장 제안 5, 높이 6, 트랙 {colors.canvas-soft}, 채움 **{colors.ink}**). 분모 = 전체 항목 − 해당 없음, caption "해당 없음 2개는 빼고 셌어요" | 개수 세기뿐이라 NEVER-1과 무관. Route Blue 아님(D6) |
| D21 | 확정(새 기능, 2026-11-23 사용자 결정) 날짜 · 시간 고르기 시트 (P7) | M2 마감 칸을 누르면 `bottom-sheet` 변형 date(9장 제안 7, PC는 M2 `modal` 안 마감 칸 아래 펼침): 제목 "마감 일시" + 오른쪽 위 `button-pill-soft` "마감 없음" → 달력 → 시간 `text-input`(HH:MM) → caption "한국 시간 기준이에요" → `button-outline` "취소" · `button-primary` "적용" | 레퍼런스 L11 · L12 · L14 |
| D22 | 확정(새 기능, 2026-11-23 사용자 결정) 먼저 확인할 항목 · 걸러 보기 (P3 · P4) | 목록 위 `filter-chip` 한 줄 "전체 8 · 남은 항목 5 · 기한 지남 1 · 완료 1"(단일 선택, 기본 전체) + "전체"일 때 오늘 마감 · 기한 지남 항목을 목록 맨 위 소제목 "먼저 확인할 항목 2개" 아래로 올려요. 기존 컴포넌트만 써서 design.md 수정은 없어요 | 앱은 등록 순서 목록만 있어요 |
| D23 | 채택 안 함 | 메모 접기(P5): 앱은 메모를 항상 보여요 → 그대로 펼쳐 둬요(3줄 넘으면 말줄임 없이 다 보여요). 완료 행 회색 · 취소선(L1): 대비 부족이라 쓰지 않아요 | 앱과 다르게 그리지 않아요 |

## 1. 시안 데이터 (가상 · 학생이 등록한 기록 예시)

demo-dataset.md에 원서 체크리스트 값이 없어서 아래 값을 새로 써요(9장 제안 8 — 오케스트레이터가 demo-dataset.md에 추가). "나" = 7번 하늘, 시안 "오늘" = 2026-11-20(금) 13:00(한국 시간). 대학 · 모집단위는 하늘의 관심 대학 6곳에서 골라요. 전형 이름은 "학생부종합"으로만 적고(세부 전형명 지어내지 않음), 마감 일시는 **학생이 직접 등록한 예시**이지 대학 공식 일정이 아니에요.

### 1-1. 등록한 전형 3개 (준비할 전형 목록 순서)

| # | 학년도 | 대학 | 전형 | 모집단위 | 모집요강 링크 |
|---|---|---|---|---|---|
| A | 2028 | 경희대학교 | 학생부종합 | 행정학과 | 있음(https://… 예시) — 메인 프레임에서 고른 전형 |
| B | 2028 | 성균관대학교 | 학생부종합 | 행정학과 | 없음 → "자료 링크 미등록" |
| C | 2028 | 한양대학교 | 학생부종합 | (빈칸) → "모집단위 미입력" | 없음 |

### 1-2. 전형 A의 체크 항목 8개 (등록 순서 = 목록 순서)

| # | 항목 이름 | 진행 상태 | 마감 일시(한국 시간) | 마감 라벨 | 메모 | 자료 링크 | 확인 기록 |
|---|---|---|---|---|---|---|---|
| 1 | 모집요강 읽기 | 완료 | 2026-11-15 18:00 | 처리 완료 | — | 있음 | 2026-11-14 21:10 |
| 2 | 학교생활기록부 사본 확인 | 진행 중 | 2026-11-18 18:00 | 기한 지남 | 담임 선생님께 봉사 시간 정정 문의 | 없음 | 2026-11-17 19:40 |
| 3 | 담임 선생님 상담 신청 | 확인 전 | 2026-11-20 18:00 | 오늘 마감 | — | 없음 | 아직 확인하지 않음 |
| 4 | 원서 작성 | 확인 전 | (없음) | 마감 미정 | — | 없음 | 아직 확인하지 않음 |
| 5 | 전형료 결제 | 확인 전 | 2027-09-15 18:00 | 예정 | 결제 영수증 캡처해 두기 | 없음 | 아직 확인하지 않음 |
| 6 | 접수 완료 확인 | 확인 전 | (없음) | 마감 미정 | — | 없음 | 아직 확인하지 않음 |
| 7 | 제출서류 준비·제출 | 해당 없음 | (없음) | 처리 완료 | 서류 제출 없는 전형으로 등록 | 없음 | 2026-11-14 21:12 |
| 8 | 서류 도착 확인 | 해당 없음 | (없음) | 처리 완료 | — | 없음 | 2026-11-14 21:12 |

개수 줄(앱 집계 규칙 그대로): **완료 1 · 확인·진행 중 5 · 기한 지남 1 · 해당 없음 2**(확인·진행 중 = 확인 전 + 진행 중, 기한 지남은 그 안에서 따로 센 값). D20 진행 줄 = "완료 1 / 6".
전부 완료 상태(390-all-done): 1~6 완료(확인 기록 2026-11-20 12:50 등), 7 · 8 해당 없음 → 완료 6 · 확인·진행 중 0 · 기한 지남 0 · 해당 없음 2.

## 2. 모바일 390×844 (frame application-checklist/390)

앱 셸: 바탕 Page {colors.canvas-soft}, 내용은 테두리 없는 흰 카드. 화면 제목 → `sub-nav`(수시 전략 소분류) → 본문 → 하단 `tab-bar-pill`(수시 전략 선택). 좌우 여백 20(콘텐츠 350), 카드 패딩 16, 카드 사이 12, 섹션 간격 {spacing.xl}. 마지막 요소 아래 여백은 탭바 높이만큼.
첫 화면에는 M1~M5와 항목 카드 1 · 2가 보이고 나머지는 스크롤이에요.

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| M1 | 화면 제목 | 텍스트 | "원서·서류 체크리스트" {typography.heading-1} → 설명 {typography.body-sm} {colors.ink-soft} "접수부터 서류 도착까지, 빠뜨린 단계가 없는지 확인해요." |
| M2 | 소분류 탭 | `sub-nav` | 5칸: 수시로 · **원서·서류 체크리스트**(선택) · 입시 일정 · 상담 질문·할 일 · 생기부 AI. 넘치면 가로 스크롤, 선택 탭이 보이게 처음 위치를 맞춰요 [D1] |
| M3 | 준비할 전형 | 텍스트, `button-pill-soft` | 라벨 "준비할 전형" {typography.label} {colors.ink-soft} → `button-pill-soft` on=page 꽉 찬 폭 350 · 높이 48 "2028 · 경희대학교 · 학생부종합 · 행정학과 ▾"(길면 단어 사이 두 줄) → 아래 왼쪽 `button-pill-soft` on=page 높이 44 "+ 지원 전형 추가". 고르기 버튼을 누르면 `bottom-sheet`(390-select) [D9, D15] |
| M4 | 전형 카드 | 흰 카드, `button-outline`, `button-danger-text`, `button-pill-soft` | caption {colors.text-muted} "2028학년도 · 내가 등록한 전형" → "경희대학교" {typography.heading-3} → "학생부종합 · 행정학과" {typography.title}(모집단위 없으면 "모집단위 미입력" {colors.ink-soft}) → 링크 "등록한 자료 열기 ↗" {typography.link} {colors.accent}(없으면 caption "자료 링크 미등록" {colors.text-muted}) → 버튼 줄: `button-outline` 높이 44 "전형 정보 수정" + `button-danger-text` "전형 삭제" → 위 1px {colors.hairline-soft} 아래 개수 줄: 라벨/값 4쌍 한 줄 "완료 1 · 확인·진행 중 5 · 기한 지남 1 · 해당 없음 2"(라벨 {typography.caption} {colors.text-muted}, 값 {typography.numeric} {colors.ink} 고정폭, 350 폭에 안 들어가면 2×2) → 소제목 "바로가기" {typography.label} {colors.text-muted} → 2열 `button-pill-soft` 5개(지원 자격 확인하기 › · 상담 질문·할 일 › · 수시로에서 카드 담기 › · 이 전형 일정 보기 › · 관심 전형 모아보기 ›) [D3, D14] |
| M5 | 목록 머리 | 텍스트 | "체크 항목 8개" {typography.heading-3} (Page 위, 카드 밖) |
| M6 | 항목 카드 목록 | 흰 카드(레이어 이름 check-item), `button-outline`, `button-danger-text` | 1-2 표 8장, 카드 사이 12. 카드 하나: 1줄 = 항목 이름 {typography.heading-4}(왼쪽) + 진행 상태 아이콘 + 글자 {typography.label}(오른쪽 위, D5) → 2줄 = 마감 라벨 아이콘 + "기한 지남 · 2026-11-18 18:00 (한국 시간)" {typography.body-sm}(D5 굵기 · 색, 날짜 고정폭) → 메모 {typography.body}(있을 때만, 다 보여요) → 자료 링크 "자료 열기 ↗" {colors.accent}(없으면 caption "자료 링크 미등록" {colors.text-muted}) → caption {colors.text-muted} "확인 기록: 2026-11-17 19:40"(없으면 "확인 기록: 아직 확인하지 않음") → 버튼 줄 `button-outline` 높이 44 "수정"(접근 이름 "학교생활기록부 사본 확인 수정") + `button-danger-text` "삭제"(접근 이름 "… 삭제"). 카드에 판정 색 · 테두리 강조 없음 [D5, D8] |
| M7 | 항목 추가 | `button-outline` | 꽉 찬 폭 · 높이 52 "+ 체크 항목 추가" → `bottom-sheet`(390-item-new) [D15, D17] |
| M8 | 고지 · 저장 위치 | 흰 카드, `disclaimer-note` | 흰 카드 안: `disclaimer-note`(6장 고지) → caption {colors.text-muted} "준비 기록은 이 브라우저에 저장돼요. 암호화 백업·복원에 함께 포함돼요." [D12] |
| M9 | 하단 탭바 | `tab-bar-pill` | 수시 전략 선택 |

모바일 Route Blue: `sub-nav` 선택 막대, `tab-bar-pill` 선택 아이콘, 링크 두 종류. 상태 아이콘 · 마감 라벨 · 개수 · 카드에는 쓰지 않아요. `button-primary` 없음.

## 3. PC 1440×900 (frame application-checklist/1440)

앱 셸: 왼쪽 `sidebar`(흰 바탕) 248, 위 `brand-logo`, `sidebar-group` 홈(접힘) · 성적(접힘) · 대학 찾기(접힘) · **수시 전략(펼침)**. 수시 전략 아래 `sidebar-item` **5칸: 수시로 · 원서·서류 체크리스트(선택, icon/list-checks) · 입시 일정 · 상담 질문·할 일 · 생기부 AI**.
콘텐츠: 1440 − 248 = 1192, 좌우 패딩 32 → 폭 1128, 바탕 Page. 오른쪽 보조 패널 없이 한 열.
첫 화면에는 P1~P3과 표 앞쪽 4행이 보이고 나머지는 스크롤이에요.

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| P1 | 화면 머리 | `page-header`, `button-outline` | 위 caption {colors.ink-soft} "수시 전략 › 원서·서류 체크리스트" → 제목 "원서·서류 체크리스트" {typography.heading-1} → 리드 {typography.body-lg} "접수부터 서류 도착까지, 빠뜨린 단계가 없는지 확인해요." 오른쪽 `button-outline` "+ 지원 전형 추가". 데이터 기준일 배지 없음(공개 데이터가 아니라 내 기록이에요) [D15] |
| P2 | 전형 카드 | 흰 카드, `button-pill-soft`, `button-outline`, `button-danger-text` | 흰 카드 하나(패딩 24, 안쪽 1080), 3단. **1단(왼쪽 520)**: 라벨 "준비할 전형" + `button-pill-soft` 폭 520 · 높이 44 "2028 · 경희대학교 · 학생부종합 · 행정학과 ▾"(누르면 드롭다운 목록, 1440-select). **1단(오른쪽)**: 버튼 `button-outline` "전형 정보 수정" + `button-danger-text` "전형 삭제". **2단**: caption "2028학년도 · 내가 등록한 전형" → "경희대학교" {typography.heading-3} + 같은 줄 "학생부종합 · 행정학과" {typography.title} + 링크 "등록한 자료 열기 ↗" → 오른쪽 끝 개수 줄 라벨/값 4쌍(M4와 같은 글자). **3단**(위 1px {colors.hairline-soft}): 라벨 "바로가기" + `button-pill-soft` 5개 한 줄 [D3, D9, D14] |
| P3 | 목록 머리 | 텍스트, `button-outline` | Page 위: 왼쪽 "체크 항목 8개" {typography.heading-3}, 오른쪽 `button-outline` "+ 체크 항목 추가"(목록 끝에도 하나 더, P5) |
| P4 | 항목 표 | `data-table`, `button-outline`, `button-danger-text` | 흰 카드 안(패딩 24, 안쪽 1080). 열(폭): 항목 300(이름 {typography.title} + 아래 메모 {typography.body-sm} {colors.ink-soft}) · 진행 상태 120(아이콘 + 글자, D5) · 마감 250(라벨 아이콘 + 라벨 + 아래 일시 고정폭 "2026-11-18 18:00 (한국 시간)") · 확인 기록 160(고정폭, 없으면 "아직 확인하지 않음" {colors.ink-soft}) · 자료 120("자료 열기 ↗" 또는 "미등록" {colors.ink-soft}) · 동작 130(`button-outline` 높이 32 "수정" + `button-danger-text` "삭제"). 머리글 {colors.canvas-soft} {typography.table-head}, 행 구분 1px {colors.hairline}, 행 높이 64(메모 있는 행 84). 정렬 화살표 없음(등록 순서). 선택 행 · 판정 칸 · 색 없음 [D3, D5, D8] |
| P5 | 항목 추가 · 고지 | `button-outline`, `disclaimer-note` | 표 카드 안 맨 아래: `button-outline` 꽉 찬 폭 "+ 체크 항목 추가" → 위 1px {colors.hairline-soft} → `disclaimer-note`(6장 고지) → caption "준비 기록은 이 브라우저에 저장돼요. 암호화 백업·복원에 함께 포함돼요." [D12] |

PC Route Blue: `sidebar-item` 선택, 링크. 표 · 상태 · 마감 · 개수에는 쓰지 않아요.

## 4. 규칙 · 데이터

- 데이터 = 이 브라우저에 저장된 학생 기록(전형 · 체크 항목)뿐. 공개 입결 · 전형계획 · 환산 규칙을 쓰지 않아요 → **계산 없음, NEVER-1 해당 없음**. 숫자 = 항목 개수 세기만.
- 개수 줄 = 앱 집계 그대로: 완료 = 상태 완료 / 확인·진행 중 = 확인 전 + 진행 중 / 기한 지남 = 마감 일시가 지금보다 이전이고 완료 · 해당 없음이 아닌 것 / 해당 없음 = 상태 해당 없음.
- 마감 라벨(1분마다 다시 셈, 한국 시간): 완료 · 해당 없음 → 처리 완료 / 일시 없음 → 마감 미정 / 지금보다 이전 → 기한 지남 / 오늘(한국 날짜) → 오늘 마감 / 그 밖 → 예정.
- 같은 전형 판단 = 학년도 · 대학 · 전형 · 모집단위가 모두 같음(M1 중복 안내). 수정 중 이 네 값을 바꾸면 그 전형의 체크 항목 · 자격 조건의 상태 · 기한 · 근거 · 메모를 초기화(M1 경고).
- 전형 삭제: 그 전형의 체크리스트 · 자격 확인 기록을 지우고, 연결된 상담 질문 · 할 일은 전형 연결만 풀고 남겨요.
- 링크 칸은 https 주소만 저장(앱 placeholder "https://"). 아니면 `text-input-error` "https://로 시작하는 주소를 넣어 주세요"(planner 문구 — 앱 문구가 다르면 앱 문구로).
- 체크 항목 · 자격 조건 각각 50개까지.

## 5. 상태 프레임 (03-draft.json states에만 적고 frames에는 넣지 않아요)

### 5-1. 확정 — 앱에 있는 상태 · 팝업 (28장)

| 프레임 | 크기 | 앱 근거 | 무엇을 그리나 |
|---|---|---|---|
| application-checklist/390-loading | 390×844 | S-a | M1 · M2 아래 본문 자리에 한 줄 "준비 기록을 읽고 있어요." {typography.body} {colors.ink-soft}(role=status). 카드 · 버튼 없음 |
| application-checklist/390-read-error | 390×844 | S-b | M1 · M2 아래 오류 줄(D11): icon/alert-circle + {colors.judge-risk} "준비 기록을 읽지 못했어요. 새로고침한 뒤 다시 열어 주세요."(앱 저장소 오류 문구가 들어갈 자리, 예시 문구) |
| application-checklist/390-empty | 390×844 | S-c | M1 · M2 → `empty-state`(D16): "준비할 전형을 먼저 추가해 주세요" {typography.heading-4} → "대학·전형 이름과 모집요강 링크를 직접 등록할 수 있어요. 추가한 전형은 체크리스트와 자격 확인표에서 함께 사용해요." {typography.body-sm} → `button-primary` "지원 전형 추가". M3 · M4 · 목록 · 고지 없음(저장 위치 caption만 아래) |
| application-checklist/390-select | 390×844 | S-d ② | **준비할 전형 고르기.** `bottom-sheet`(손잡이, 그림자, 뒤 scrim) 제목 "준비할 전형" → 행 3개(1-1 A · B · C, "2028 · 성균관대학교 · 학생부종합 · 행정학과" 형식, 행 높이 56). 고른 행 A = Selected 채움 + 왼쪽 3px 막대 + 오른쪽 icon/check {colors.ink}. 누르면 시트가 닫히고 바뀌어요 |
| application-checklist/390-other | 390×844 | S-d ③ 빈칸 | **전형 C를 고른 뒤.** M4 "한양대학교" · "학생부종합 · 모집단위 미입력" · "자료 링크 미등록", 개수 줄 "완료 0 · 확인·진행 중 5 · 기한 지남 0 · 해당 없음 0", 목록 = 기본 항목 5개 모두 "확인 전 · 마감 미정"(D17) |
| application-checklist/390-deadline | 390×844 | S-e · 마감 라벨 5개 | **스크롤: 항목 카드 1~5.** 처리 완료(1) · 기한 지남(2, 메모 있음) · 오늘 마감(3) · 마감 미정(4) · 예정(5, 메모 있음)이 한 화면에 보이게. 라벨 아이콘 · 굵기 차이만, 색 차이 없음(D5) |
| application-checklist/390-bottom | 390×844 | S-d ⑦~⑨ | **스크롤: 아래쪽.** 항목 카드 7 · 8(해당 없음) → `button-outline` "+ 체크 항목 추가" → M8(`disclaimer-note` + 저장 위치 caption) → 탭바 |
| application-checklist/390-all-done | 390×844 | S-d 개수 | **전부 처리.** 1-2 끝 "전부 완료" 데이터. 개수 줄 "완료 6 · 확인·진행 중 0 · 기한 지남 0 · 해당 없음 2", 카드 상태 모두 완료 / 해당 없음, 마감 라벨 모두 "처리 완료". 축하 문구 · 색 · 일러스트 없음 |
| application-checklist/390-limit | 390×844 | S-i | **항목 50개.** 목록 끝(스크롤 아래) `button-outline` "+ 체크 항목 추가" 비활성({colors.text-disabled} 글자) + 바로 아래 caption {colors.text-muted} "체크 항목은 50개까지 추가할 수 있어요"(D17). 목록 머리 "체크 항목 50개" |
| application-checklist/390-app-add | 390×844 | M1 추가 | `bottom-sheet`(높이 약 90%, 안쪽 세로 스크롤): 제목 "지원 전형 추가" {typography.heading-4} → "등록된 전형에서 선택" `text-input` + ▾ "직접 입력"(D9 ②) → 학년도 `text-input` "2028" → 대학명 `text-input`(안내 글자 "예: 경희대학교" {colors.text-disabled}) → 전형명 → 모집단위(선택) → 모집요강 링크(선택, 안내 글자 "https://"). 모바일은 1열, 칸 높이 48, 라벨 {typography.label}. 아래 고정 줄: `button-outline` "취소" + `button-primary` "저장"(같은 폭) |
| application-checklist/390-app-pick | 390×844 | M1 등록 전형 선택 | **"등록된 전형에서 선택"을 누른 뒤.** 390-app-add 위에 두 번째 `bottom-sheet` 목록: "직접 입력"(선택) + 등록된 전형 목록(전형계획에서 내가 고른 전형 예: "2028 · 건국대학교 · 학생부종합 · 행정학과"). 고르면 아래 칸이 채워진 390-app-add로 돌아가요 |
| application-checklist/390-app-duplicate | 390×844 | M1 분기 ② | **같은 전형이 이미 있음.** 390-app-add에 A와 같은 값(2028 · 경희대학교 · 학생부종합 · 행정학과)이 들어간 상태. 링크 칸 아래 안내 블록(D13): "같은 학년도·대학·전형·모집단위의 준비 기록이 있어요…"(앱 문구 전체 그대로). 주요 버튼 글자 "기존 준비 기록 열기" |
| application-checklist/390-app-edit | 390×844 | M1 수정 | 제목 "지원 전형 수정", "등록된 전형에서 선택" 칸 없음, 칸에 A 값이 채워진 상태. 버튼 취소 · 저장 |
| application-checklist/390-app-edit-warn | 390×844 | M1 분기 ① | **수정 중 모집단위를 "정책학과"로 바꿈.** 바뀐 칸은 포커스 링(`text-input-focused`), 링크 칸 아래 안내 블록(D13): "…기존 체크 항목과 자격 조건의 확인 상태·기한·근거·메모를 초기화해요. 다른 전형을 준비하려면 ‘지원 전형 추가’를 이용해 주세요."(앱 문구 전체 그대로). 버튼 취소 · 저장 |
| application-checklist/390-app-saving | 390×844 | M1 분기 ③ · S-f | 390-app-add에 값이 다 찬 상태에서 주요 버튼 "저장 중"(비활성 모양), 취소 · 모든 칸 비활성, scrim을 눌러도 닫히지 않음(메모 caption으로 표시) |
| application-checklist/390-item-edit | 390×844 | M2 편집 | `bottom-sheet` 제목 "체크 항목 편집": 항목 이름 `text-input` "학교생활기록부 사본 확인" + caption "이름을 바꾸면 진행 상태가 ‘확인 전’으로 돌아가요"(D18) → 진행 상태 `segmented-control` 4칸(진행 중 = `segmented-control-active`) → 마감 일시 `text-input` "2026-11-18 18:00" + caption "한국 시간 기준이에요 · 모르면 비워 두세요"(D10) → 확인할 자료 링크 `text-input`(빈칸, "https://") → 메모 `text-input` 여러 줄(높이 96) "담임 선생님께 봉사 시간 정정 문의" → 아래 고정 줄 취소 · 저장 |
| application-checklist/390-item-new | 390×844 | M2 새 항목 | 같은 시트, 제목 "체크 항목 편집"(앱 그대로), 이름 빈칸(안내 글자 "예: 추천서 받기"), 진행 상태 "확인 전", 나머지 빈칸 |
| application-checklist/390-item-error | 390×844 | S-h | 390-item-edit에서 저장을 누른 뒤 실패: 버튼 줄 바로 위 오류 줄(D11) "저장하지 못했어요. 다시 시도해 주세요." 입력값은 그대로 남아요 |
| application-checklist/390-app-delete | 390×844 | M3 | `bottom-sheet`(내용 높이만큼): "지원 전형을 삭제할까요?" {typography.heading-4} → "경희대학교의 체크리스트·자격 확인 기록을 삭제해요. 연결된 상담 질문·할 일은 전형 연결만 해제하고 보관해요." {typography.body} → `button-outline` "취소" + `button-primary` "삭제"(같은 폭, D8) |
| application-checklist/390-item-delete | 390×844 | M4 | 같은 모양: "확인 항목을 삭제할까요?" → "학교생활기록부 사본 확인의 상태와 메모도 함께 지워져요." → 취소 · 삭제 |
| application-checklist/390-toast | 390×844 | S-g | 메인 화면 위 `toast` "기기에 저장했어요."(탭바 위 {spacing.md}, {colors.ink} 채움 + {colors.on-primary} 글자, 그림자) |
| application-checklist/1440-loading | 1440×900 | S-a | 셸 + P1 아래 "준비 기록을 읽고 있어요." 한 줄 |
| application-checklist/1440-empty | 1440×900 | S-c | 셸 + P1(머리 버튼 "+ 지원 전형 추가" 그대로) + 흰 카드 안 `empty-state`(390-empty와 같은 문구, `button-primary` "지원 전형 추가") |
| application-checklist/1440-select | 1440×900 | S-d ② | P2 고르기 버튼 아래 드롭다운 목록(폭 520, Overlay 그림자, 레이어 이름 dropdown): 행 3개, A 선택(Selected 채움 + 왼쪽 3px 막대) |
| application-checklist/1440-app-add | 1440×900 | M1 추가 · 분기 ② | `modal`(최대 폭 560, 뒤 scrim, 닫기 ✕): 제목 "지원 전형 추가" → "등록된 전형에서 선택" 꽉 찬 폭 → **2열**: 학년도 · 대학명 / 전형명 · 모집단위(선택) → 모집요강 링크 꽉 찬 폭 → 버튼 오른쪽 정렬 `button-outline` "취소" + `button-primary` "저장". 중복 분기(390-app-duplicate와 같은 안내 블록 + "기존 준비 기록 열기")를 **같은 프레임 오른쪽에 두 번째 모달 복제본**으로 나란히 그려요 |
| application-checklist/1440-app-edit-warn | 1440×900 | M1 수정 · 분기 ① · 오류 | `modal` "지원 전형 수정", 모집단위 "정책학과"로 바꾼 상태 + 초기화 안내 블록(D13). 같은 프레임 오른쪽에 저장 실패 복제본(버튼 위 오류 줄 D11) |
| application-checklist/1440-item-edit | 1440×900 | M2 | `modal` "체크 항목 편집"(390-item-edit와 같은 칸 · 순서, 진행 상태 `segmented-control` 폭 400). P4의 2행에서 "수정"을 누른 모습(뒤 표가 scrim 아래 보여요). Esc · ✕로 닫고, 닫으면 포커스가 누른 "수정" 버튼으로 돌아가요 |
| application-checklist/1440-delete | 1440×900 | M3 · M4 · S-g | `modal` "지원 전형을 삭제할까요?"(M3 문구) + 같은 프레임 오른쪽에 M4 "확인 항목을 삭제할까요?" 복제본, 오른쪽 아래 `toast` "전형을 삭제했어요. 연결된 상담 기록은 남겨 두었어요."(삭제 뒤 모습 예시) |

### 5-2. 확정(새 기능) — 앱에 없던 기능 (4장, 2026-11-23 사용자 결정으로 확정)

| 프레임 | 크기 | 결정 | 무엇을 그리나 |
|---|---|---|---|
| application-checklist/390-confirm-quickdone | 390×844 | D19 | 항목 카드 왼쪽 `checkbox`(9장 제안 6 모양, 누르는 영역 44×44). 카드 3을 누른 직후: 상태 "완료", 마감 라벨 "처리 완료", 확인 기록 "2026-11-20 13:02", `toast` "기기에 저장했어요." 완료 카드 글자 대비 그대로 |
| application-checklist/390-confirm-progress | 390×844 | D20 | M4 개수 줄 위 "완료 1 / 6" + `score-bar`(채움 {colors.ink} 약 17%) + caption "해당 없음 2개는 빼고 셌어요" |
| application-checklist/390-confirm-filter | 390×844 | D22 | M5 아래 `filter-chip` 한 줄 "전체 8"(on) · "남은 항목 5" · "기한 지남 1" · "완료 1" → 소제목 "먼저 확인할 항목 2개" {typography.label} 아래 카드 2(기한 지남) · 3(오늘 마감) → 소제목 "나머지 항목" 아래 1 · 4~8. 칩 "기한 지남"을 고르면 카드 2만(같은 프레임에 그리지 않아도 돼요) |
| application-checklist/390-confirm-datesheet | 390×844 | D21 | 390-item-edit 위 두 번째 `bottom-sheet` 변형 date "마감 일시" + 오른쪽 위 `button-pill-soft` "마감 없음" → 2026년 11월 달력(18일 선택 = Selected 채움, 오늘 20일 = 1px {colors.ink} 테두리) → 시간 `text-input` "18:00" → caption "한국 시간 기준이에요" → 취소 · 적용(9장 제안 7 모양) |

## 6. 문구

| 자리 | 문구 |
|---|---|
| 화면 제목 · 메뉴 | 원서·서류 체크리스트 |
| 설명 · PC 리드 | 접수부터 서류 도착까지, 빠뜨린 단계가 없는지 확인해요. |
| PC 경로 | 수시 전략 › 원서·서류 체크리스트 |
| 머리 버튼 | + 지원 전형 추가 |
| 고르기 라벨 | 준비할 전형 |
| 전형 카드 | 2028학년도 · 내가 등록한 전형 / 모집단위 미입력 / 등록한 자료 열기 ↗ / 자료 링크 미등록 / 전형 정보 수정 / 전형 삭제 |
| 개수 줄 | 완료 · 확인·진행 중 · 기한 지남 · 해당 없음 |
| 바로가기 | 바로가기 / 지원 자격 확인하기 › · 상담 질문·할 일 › · 수시로에서 카드 담기 › · 이 전형 일정 보기 › · 관심 전형 모아보기 › |
| 목록 머리 | 체크 항목 8개 |
| 진행 상태 | 확인 전 · 진행 중 · 완료 · 해당 없음 |
| 마감 라벨 | 처리 완료 · 마감 미정 · 기한 지남 · 오늘 마감 · 예정 / "기한 지남 · 2026-11-18 18:00 (한국 시간)" |
| 항목 카드 | 자료 열기 ↗ / 자료 링크 미등록 / 확인 기록: 2026-11-17 19:40 / 확인 기록: 아직 확인하지 않음 / 수정 / 삭제 |
| 항목 추가 · 한도 | + 체크 항목 추가 / 체크 항목은 50개까지 추가할 수 있어요 |
| 고지 (`disclaimer-note`) | ⓘ 결제·접수·서류 제출은 각각 확인해 주세요. 날짜와 완료 상태는 내가 등록한 기록이며, 접수처·대학 입학처에서 최종 확인해요. 마감 시각은 한국 시간 기준이에요. |
| 저장 위치 | 준비 기록은 이 브라우저에 저장돼요. 암호화 백업·복원에 함께 포함돼요. |
| 읽는 중 · 읽기 오류 | 준비 기록을 읽고 있어요. / 준비 기록을 읽지 못했어요. 새로고침한 뒤 다시 열어 주세요.(예시 — 앱 저장소 오류 문구 자리) |
| 빈 상태 | 준비할 전형을 먼저 추가해 주세요 / 대학·전형 이름과 모집요강 링크를 직접 등록할 수 있어요. 추가한 전형은 체크리스트와 자격 확인표에서 함께 사용해요. / 지원 전형 추가 |
| M1 | 지원 전형 추가 · 지원 전형 수정 / 등록된 전형에서 선택 · 직접 입력 / 학년도 · 대학명 · 전형명 · 모집단위(선택) · 모집요강 링크(선택) / 저장 · 저장 중 · 취소 · 기존 준비 기록 열기 / 경고 ① · 안내 ②는 앱 문구 전체 그대로 / https://로 시작하는 주소를 넣어 주세요 |
| M2 | 체크 항목 편집 / 항목 이름 · 진행 상태 · 마감 일시 · 확인할 자료 링크 · 메모 / 이름을 바꾸면 진행 상태가 ‘확인 전’으로 돌아가요 / 한국 시간 기준이에요 · 모르면 비워 두세요 |
| M3 | 지원 전형을 삭제할까요? / {대학}의 체크리스트·자격 확인 기록을 삭제해요. 연결된 상담 질문·할 일은 전형 연결만 해제하고 보관해요. / 취소 · 삭제 |
| M4 | 확인 항목을 삭제할까요? / {항목 이름}의 상태와 메모도 함께 지워져요. / 취소 · 삭제 |
| 토스트 | 기기에 저장했어요. / 항목을 삭제했어요. / 전형을 삭제했어요. 연결된 상담 기록은 남겨 두었어요. |
| 저장 실패 | 저장하지 못했어요. 다시 시도해 주세요. |
| 새 기능 문구 | {항목 이름} 완료로 표시(접근 이름) / 완료 1 / 6 · 해당 없음 2개는 빼고 셌어요 / 전체 · 남은 항목 · 기한 지남 · 완료 / 먼저 확인할 항목 2개 · 나머지 항목 / 마감 일시 · 마감 없음 · 적용 |

문구 점검: 모두 해요체. 이 화면은 지원 결과를 다루지 않아서 결과를 예측 · 약속하는 말, 퍼센트, "추천" · "유리" 같은 말이 없어요. rules forbidden_words 3개는 한 번도 나오지 않아요. 마감 일시는 "내가 등록한 기록"임을 고지 · 카드 머리("내가 등록한 전형")로 밝혀요. "완료"는 내 체크 상태라는 뜻만 있고 접수 성공을 보증하지 않는다는 말은 고지 첫 문장("각각 확인해 주세요")이 맡아요.

## 7. 접근성

- 대비: Page {colors.canvas-soft} 위 글자는 {colors.ink} · {colors.ink-soft}만 써요({colors.text-muted} #707070은 #f3f3f3 위 약 4.46:1로 4.5 미만). {colors.text-muted} caption은 흰 카드 · 시트 · 모달 안에서만. 그래서 고지 · 저장 위치 caption도 흰 카드 안에 둬요. {colors.text-disabled}는 비활성 · 안내 글자에만.
- 진행 상태 · 마감 라벨은 아이콘 + 글자(+ 굵기)로 읽혀요. 색에 기대지 않아요. 항목 카드 읽는 순서: "학교생활기록부 사본 확인, 진행 중, 기한 지남, 2026년 11월 18일 18시 한국 시간, 메모 …, 확인 기록 11월 17일 19시 40분".
- 버튼 접근 이름은 앱처럼 항목 이름을 붙여요("학교생활기록부 사본 확인 수정", "… 삭제"). 화면에 보이는 글자는 모바일에서 "수정" · "삭제"로 줄여도 접근 이름은 전체.
- 읽는 중 = role=status, 읽기 오류 · 저장 실패 = role=alert, 토스트 = 조용한 알림(aria-live polite)이고 사라져도 같은 내용이 남지 않으니 4초 이상 보여요(포커스를 옮기지 않음).
- 시트 · 모달은 열면 제목으로 포커스, Tab이 안에서만 돌고, Esc · ✕ · 취소로 닫으면 누른 버튼으로 포커스가 돌아가요. 저장 중(S-f)에는 바깥 · Esc로 닫히지 않아요. 확인 팝업(M3 · M4)의 첫 포커스는 "취소".
- 준비할 전형 고르기 = 목록 상자("준비할 전형, 경희대학교 학생부종합 행정학과 선택됨, 3개 중"). `segmented-control` 진행 상태 = 라디오 묶음.
- 터치 44 이상(모바일 버튼 · 고르기 · 카드 버튼 · 세그먼트 · `checkbox` 누르는 영역 · 달력 칸), PC 표 안 버튼 32. 날짜 · 시각 · 개수는 고정폭. 포커스 2px 잉크 링.
- 시트 · 모달 240ms, 토스트 150ms 페이드, prefers-reduced-motion이면 바로.

## 8. 디자이너 메모

- 03-draft.json frames = 정확히 2개: application-checklist/390, application-checklist/1440. states = 5-1 28장 + 5-2 4장 = **32장**(390-loading … 1440-delete, 390-confirm-quickdone · 390-confirm-progress · 390-confirm-filter · 390-confirm-datesheet). 모두 같은 페이지에 그리고 states에만 적어요(2026-11-23 사용자 결정으로 새 기능 4장도 확정).
- Figma MCP 호출 한도(Education 플랜)를 아끼려고, 시트 · 모달은 메인 프레임 복제 + scrim + 시트 한 장으로 만들고, 같은 팝업의 분기(중복 · 경고 · 저장 중 · 오류)는 첫 팝업을 복제해 바뀐 부분만 고쳐요. PC 분기는 한 프레임 안에 모달 복제본을 나란히 둬요(5-1 표).
- 레이어 이름 = 컴포넌트 이름: `sub-nav`, `tab-bar-pill`, `sidebar`, `sidebar-group`, `sidebar-item`, `brand-logo`, `page-header`, `button-primary`, `button-outline`, `button-pill-soft`, `button-danger-text`, `text-input`, `text-input-focused`, `text-input-error`, `segmented-control`, `segmented-control-active`, `data-table`, `disclaimer-note`, `empty-state`, `bottom-sheet`, `modal`, `toast`, `filter-chip`, `score-bar`, `checkbox`, `warning-callout`. 항목 카드 = 일반 레이어 check-item(흰 카드 + 글자, 새 컴포넌트 아님), 드롭다운 목록 = 레이어 dropdown(그림자 허용 이름). 안내 블록 = `warning-callout` + 설명 "tone=neutral"(제안 4). 고르기 칸 = `text-input` + 설명 "variant=select"(제안 3). 날짜 시트 = `bottom-sheet` + 설명 "variant=date"(제안 7). 진행 막대 = `score-bar` 진행 표시 용도(제안 5).
- 9장 제안 1~7은 오케스트레이터가 design.md에 한 번에 패치해요(2026-11-23 사용자 결정). 대체안은 쓰지 않고 **제안된 변형으로 그려요**: D9 ② select · D13 tone=neutral · D19 checkbox · D20 score-bar 진행 표시 · D21 bottom-sheet date. 패치 전에 S3를 시작하게 되면 멈추고 오케스트레이터에게 보고해요(design.md에 없는 컴포넌트를 먼저 만들지 않아요).
- 모서리 전부 0(체크 칸 · 상태 아이콘도 직각, 원형 표식 없음). 그림자는 `bottom-sheet` · `modal` · `toast` · dropdown에만. 판정 색 · 등급 색 · 증감 색 없음. {colors.judge-risk}는 `button-danger-text` 글자 · `text-input-error` · 오류 줄에만(모두 design.md가 정한 오류 · 위험 동작 쓰임). Route Blue는 컨트롤 선택 표시와 링크에만. 모든 fill · stroke 변수 바인딩.
- Page 위에 바로 놓이는 `button-pill-soft` · `text-input`은 on=page(채움 {colors.canvas}), 흰 카드 · 시트 · 모달 안은 기본({colors.canvas-soft} · {colors.field}).
- 모바일 치수: 좌우 20 · 카드 패딩 16 · 카드 사이 12, 고르기 버튼 높이 48, 카드 안 버튼 44, 바로가기 2열(각 167, 사이 16). 시트 안쪽 폭 350, 입력칸 높이 48, 메모 칸 96, 시트 아래 고정 버튼 줄 높이 52 + 안전 영역. PC 모달 560 = 좌우 패딩 24, 2열 칸 각 244 + 사이 24.
- 대학명 · 전형명 · 항목 이름은 한 줄을 먼저, 넘치면 단어 사이에서만 두 줄(글자 중간 금지).
- 시안 값은 1장 표만 써요. 앱 후속(보고에 적기): 기한 지남 error-note 색 → 무채색(D5), nav.ts 아이콘 'check' → list-checks(D2), 성공 문단 → toast(D11), 50개 caption(D17), 이름 변경 caption(D18).

## 9. design.md 수정 제안 (아래 문장을 그대로 넣어요)

design.md를 고치면 rules/design-rules.json source.sha256도 새 해시로 바꿔야 해요(안 바꾸면 J9 실패). 제안 6 · 7은 새 컴포넌트 이름이 생겨서 rules components 목록에도 추가가 필요해요(사람이 rules 수정). 나머지는 기존 컴포넌트의 변형 · 문서 정리라 components 목록은 그대로예요.

1. **App Shell 학생 대분류(메뉴 위치).** 위치: App Shell › 모바일 › "학생 대분류:" 문장. **바꿀 문장**:
   - 지금: "학생 대분류: 홈 / 성적(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사) / 대학 찾기(전형계획 · 수시 입결 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기) / 수시 전략(수시로 · 생기부 AI). 학과별 구간 소분류 아이콘은 icon/layers(2026-11-23 사용자 결정, 수시 전략 icon/layout-grid와 겹치지 않게), 계열 모아보기 소분류 아이콘은 icon/folder(2026-11-23 사용자 결정, icon/layers · icon/layout-grid와 겹치지 않게)."
   - 바꾼 뒤: "학생 대분류: 홈 / 성적(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사) / 대학 찾기(전형계획 · 수시 입결 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기) / 수시 전략(수시로 · 원서·서류 체크리스트 · 입시 일정 · 상담 질문·할 일 · 생기부 AI). 학과별 구간 소분류 아이콘은 icon/layers(2026-11-23 사용자 결정, 수시 전략 icon/layout-grid와 겹치지 않게), 계열 모아보기 소분류 아이콘은 icon/folder(2026-11-23 사용자 결정, icon/layers · icon/layout-grid와 겹치지 않게), 원서·서류 체크리스트 소분류 아이콘은 icon/list-checks(2026-11-23, 모의고사 · 지원 자격 확인표의 icon/check와 겹치지 않게)."
   - 참고(이 slug 범위 밖, 오케스트레이터 확인): 앱 nav.ts의 대학 찾기 소분류(전형 성향 탐색 · 전형계획 · 수시 입결 · 전국 배치표 · 될각 · 지원 자격 확인표 · 전형 비교)도 design.md 목록과 달라요. 입시 일정 · 상담 질문·할 일 · 지원 자격 확인표 slug의 S2와 같은 문장을 쓰도록 맞춰 주세요(여러 slug가 같은 문장을 각각 바꾸면 충돌해요).
2. **Responsive Strategy 행 추가.** 위치: Responsive Strategy 표, "특수 계열 모아보기(2026-11-23)" 행 바로 다음에 **추가**(탭으로 칸 구분):
   > 원서·서류 체크리스트(2026-11-23)	화면 제목 → 준비할 전형 고르기(누르면 바텀시트 목록) → 전형 카드(전형 정보 · 수정 · 삭제 · 자료 링크 · 개수 한 줄 · 바로가기 2열) → 체크 항목 카드 목록(이름 · 진행 상태 아이콘+글자 · 마감 라벨 · 메모 · 자료 · 확인 기록 · 수정/삭제) → + 체크 항목 추가 → 고지. 편집 · 추가 · 삭제 확인은 모두 바텀시트	page-header(+ 지원 전형 추가) → 전형 카드 한 장(준비할 전형 고르기 + 전형 정보 + 개수 + 바로가기 한 줄) → data-table(항목 · 진행 상태 · 마감 · 확인 기록 · 자료 · 동작) → 고지. 편집 · 추가 · 삭제 확인은 모달(최대 폭 560). 마감 라벨 · 진행 상태는 판정 색 없이 아이콘 + 글자 + 굵기로만 구분
3. **text-input 변형 select(목록 고르기).** 위치: Components › Inputs & Forms › text-input 절, "변형(2026-11-23 학과별 입결 구간표): on=card … text-input-error도 같은 변형을 따릅니다." 문장 바로 다음 줄에 **추가**:
   > 변형 select(2026-11-23 원서·서류 체크리스트): 정해진 목록에서 하나를 고르는 폼 칸입니다. text-input과 같은 채움 · 높이 · on 변형이고, 오른쪽 끝에 ▾(icon/chevron-down {colors.ink})를 둡니다. 직접 타이핑하지 않고, 누르면 모바일은 bottom-sheet 목록, PC는 칸 바로 아래 같은 폭 드롭다운 목록(Overlay, {shadow.overlay})이 열립니다. 목록 행 높이 48(PC 40), 고른 행 = Selected 채움 + 왼쪽 3px {colors.accent} 막대 + 오른쪽 icon/check {colors.ink}. 선택지가 4개 이하이고 짧으면 select 대신 segmented-control을 씁니다. 폼 밖(화면 위 고르기 버튼)은 button-pill-soft + ▾를 씁니다.
4. **warning-callout 변형 tone=neutral(판정 색 없는 안내 블록).** 위치: Components › warning-callout 절, "PC: 오른쪽 보조 패널에 목록" 줄 바로 다음 줄에 **추가**:
   > 변형 tone=neutral(2026-11-23 원서·서류 체크리스트): 수시로 조합 경고가 아닌 화면에서, 저장하면 기록이 바뀌거나 이미 같은 기록이 있다는 걸 알리는 안내 블록입니다. {colors.canvas-soft} 채움(흰 카드 · 모달 안) 또는 {colors.canvas} 채움(Page 위), 모서리 0, 패딩 {spacing.sm} {spacing.md}, 왼쪽 ⓘ 아이콘 {colors.ink} + 글자 {typography.body-sm} {colors.ink}(제목 줄이 있으면 {typography.label} SemiBold). 판정 색 · ▲ 아이콘 · Route Blue를 쓰지 않습니다. 관련 입력칸 바로 아래에 두고, 블록 안에 버튼을 두지 않습니다(바뀐 주요 버튼 글자로 다음 동작을 알립니다).
5. **score-bar 진행 표시 용도 — D20(2026-11-23 확정).** 위치: Components › score-bar 줄 끝("…대학별 환산의 만점 대비 비율 등에 씁니다.") 바로 다음에 **추가**:
   > 진행 표시(2026-11-23 원서·서류 체크리스트): 내가 등록한 항목 중 완료한 비율을 보여 줄 때도 씁니다. 채움은 {colors.ink}이고 Route Blue를 쓰지 않습니다. 막대 위에 "완료 n / m" {typography.title} 고정폭, 분모에서 뺀 항목이 있으면 막대 아래 캡션으로 밝힙니다(예: "해당 없음 2개는 빼고 셌어요"). 목표 대비 성취 · 서열로 읽히는 문구를 붙이지 않습니다.
6. **새 컴포넌트 checkbox — D19(2026-11-23 확정).** 위치: Components › Inputs & Forms, text-input-error 절 바로 다음에 **추가**(rules components에 checkbox 추가 필요):
   > checkbox(2026-11-23 원서·서류 체크리스트) — 내가 등록한 항목을 한 번에 완료로 표시할 때. 20×20 정사각형, 모서리 0, 꺼짐 = {colors.canvas} 채움 + 1.5px {colors.ink-soft} 테두리, 켜짐 = {colors.ink} 채움 + {colors.on-primary} 체크 표시. 누르는 영역 44×44. 판정 색 · Route Blue를 쓰지 않고, 켜져도 옆 글자에 취소선 · 회색 처리를 하지 않습니다(대비 유지). 옆에 상태 글자(예: "완료")를 함께 둡니다. mask-preview의 "가린 내용을 확인했어요" 체크도 이 모양을 씁니다.
7. **bottom-sheet 변형 date — D21(2026-11-23 확정).** 위치: Components › Overlays › bottom-sheet 절, "위쪽 {rounded.sm}, 손잡이 막대, {shadow.overlay}, 뒤 {colors.scrim}" 줄 바로 다음에 **추가**:
   > 변형 date(2026-11-23 원서·서류 체크리스트): 날짜 · 시각을 고르는 시트입니다. 머리 = 제목 {typography.heading-4} + 오른쪽 button-pill-soft "마감 없음"(비워 두기). 본문 = 월 이동(‹ 2026년 11월 ›) + 7열 달력 격자(칸 44×44, 모서리 0, 날짜 {typography.numeric} 고정폭): 고른 날 = Selected 채움 + {colors.ink} 글자, 오늘 = 1px {colors.ink} 테두리, 다른 달 날짜 = {colors.text-disabled}. 아래 시각 text-input(HH:MM) + 캡션 "한국 시간 기준이에요". 아래 고정 줄 button-outline "취소" + button-primary "적용". PC는 같은 내용을 모달 안 마감 칸 아래 펼침 영역으로 둡니다. 판정 색 · 주말 빨강을 쓰지 않습니다.
8. **데이터(디자인 규칙 아님).** work/_data/demo-dataset.md에 1장 1-1 · 1-2 표(등록 전형 3개 · 전형 A 체크 항목 8개, "학생이 등록한 예시")를 "원서·서류 체크리스트" 절로 추가해 주세요. prd에 이 화면 절이 없어서 6-7 아래 "원서·서류 체크리스트(학생 기록, 계산 없음)" 한 줄 추가를 권해요.

rules 메모: requires_trace_accordion — 추가 **안 함**(산출 근거가 없어요). requires_disclaimer_note — **추가 권함**(접수처 · 입학처 최종 확인 고지가 빠지면 안 되는 화면이에요). 이 spec에는 이미 `disclaimer-note`가 있어서 추가해도 G2는 그대로 통과해요.
