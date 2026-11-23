# 02-spec — 관리자 규칙 편집기·검수 (admin-rules, 센터 데이터 관리자)

> 개정 2026-11-24(상세화): 상태 프레임을 6장에 모아 36장으로 늘렸어요(기존 정의 12 + 새로 24). 최신 design.md(U:NAVI, `brand-logo`, `page-header`, `sidebar-group` · `sub-nav`, 확인 창 규칙, `text-input` 변형 multiline · select, `text-input-error` 아이콘, `checkbox`, 화면 오류 줄 · 불러오는 중)에 맞춰 0-1절에서 기본 프레임 설명을 짧게 바로잡았어요. 승인된 레이아웃은 그대로예요.
> 근거: PRD 3-5 센터 데이터 관리자 · 5장 [관리자] · 6-4 엔진 규칙 요소 · 6-11 데이터 파이프라인(편집기 → 테스트 케이스 ≥ 3 → 2인 검수(작성자 ≠ 검수자) → 배포 버전, 변경 로그) · 7-4 관리자 권한 · 8장 ScoringRule(review_status draft / testing / verified, reviewed_by, test_cases) · 앱 app/src/screens/AdminRules.tsx · app/src/domain/ruleEditor.ts
> 판정 기준: NEVER-1(검수 안 된 규칙은 계산·공개하지 않아요) · NEVER-2(입시 결과를 점치거나 약속하는 표현 금지)
> design.md App Shell · Responsive Strategy 공통 원칙(표 → 카드, 모달 → 바텀시트, 보조 패널 → 아코디언) · Elevation(Page 바탕 + 흰 카드) · Components · 확인 창 · 2026-11-18 색 규칙(Route Blue = 선택·여기, 모서리 0)
> 내비: 관리자 대분류 "규칙 관리", 소분류 "규칙 편집기 · 검수 · 계열표 · 위키 요약". PC는 `sidebar-group` + `sidebar-item`, 모바일은 하단 탭바 대분류 + `sub-nav`.
> 01-research.md 반영 포인트 P1~P7. 이 화면은 rules의 trace 필수·고지 필수 화면 목록에 없지만, 테스트 케이스 산출 과정에 `trace-accordion`, NEVER-1 고지에 `disclaimer-note`를 써요.

## 0-1. 최신 design.md 맞춤 (2026-11-24, 기본 프레임 설명 바로잡기)

1. 서비스 이름은 U:NAVI예요. PC `sidebar` 맨 위 워드마크 글자 "진학 내비" 대신 `brand-logo` 폭 124, 모바일 대분류 첫 화면(390 · 390-editor-tab) 머리에 `brand-logo` 폭 92. 원본 색 그대로(팔레트 예외).
2. 바탕은 Page {colors.canvas-soft} 위 테두리 없는 흰 카드(design.md Elevation v2)예요. 기본 프레임에 이미 반영됐으면 그대로 두고, 상태 프레임은 기본 프레임 바탕을 그대로 복제해요.
3. PC 상단 바 64 → `page-header`(경로 캡션 → 제목 {typography.heading-1}, 오른쪽 `data-status-badge` "공개 배포 2028-v2"). 관리자라 `mode-switch` · 잠금 버튼 없음.
4. 사이드바: `sidebar-group` "규칙 관리"(icon/sliders-horizontal, 펼침 ▾) → `sidebar-item` 4개 규칙 편집기(icon/file-text) · 검수(icon/check) · 계열표(icon/layout-grid) · 위키 요약(icon/book-open). 맨 아래 "로그아웃"에 icon/log-out. 모바일 `sub-nav`도 4개 탭 "규칙 편집기 · 검수 · 계열표 · 위키 요약".
5. 확인 창(검수 요청 · 승인 · 반려 · 지우기 · 나가기 · 내보내기)은 design.md 확인 창 규칙: 제목 질문 {typography.heading-4} + 바뀌는 것 한 줄 {typography.body} + `button-outline` "취소" + `button-primary` 실행(잉크, 위험 색 채움 없음). PC `modal` 최대 폭 560 · 버튼 오른쪽 정렬, 모바일 `bottom-sheet`. 끝나면 `toast` 한 줄(모바일 탭바 위, PC 오른쪽 아래).
6. 반려 사유 칸 = `text-input` 변형 multiline(4줄 112, 최대 8줄 208), 글자 수 "n/200"은 칸 오른쪽 아래 바깥 {typography.caption} {colors.text-muted} 고정폭.
7. `text-input-error` = 2px 위험색 링 + 아래 icon/triangle-alert 14 + 간격 4 + 위험색 캡션. 입력칸 밖 오류 줄(검수 요청을 막는 이유 요약)도 같은 아이콘 + 문구 모양.
8. 반려 사유 띠 = `warning-callout` 변형 tone=neutral(ⓘ + 잉크 글자). 앱의 ▲ 소신 색 반려 띠 · ▲ 오류 묶음은 판정 색이라 시안에는 쓰지 않아요(5장 앱 반영 메모).
9. 불러오는 중 = 자리에 "규칙을 읽고 있어요." {typography.body-sm} {colors.text-muted} 한 줄. 자료를 읽거나 합치지 못했을 때 = 화면 오류 줄(icon/triangle-alert 20 {colors.ink} + {typography.body} 문장 + `button-outline` 하나, 판정 색 없음).
10. 편집기 폼 맨 위에 앱과 같은 "기본 정보" 그룹(대학 · 전형 · 학년도 · 원문 주소(https) · 원문 쪽)이 있어요. 기본 프레임 1440은 그 아래로 스크롤한 모습이라 다시 그리지 않아요. 출결 감점표 그룹 머리에 `checkbox` "출결 반영"(켜짐).
11. 편집기 계열 PC 프레임의 E1 오른쪽, "원문 보기" 옆에 `button-outline` "목록으로"(앱과 같음).
12. 검수 완료 배지(`judge-badge` 안정 쌍 ● "검수 완료")는 design.md Semantic "완료·검수 완료는 안정 색 쌍 — 환산 규칙 검수에만"으로 확정됐어요. 그 밖의 상태는 흑백 `data-status-badge`.

## 1. 공통 원칙

- 관리자 화면은 PC 중심이에요. 모바일은 조회와 승인·반려만 해요(편집 없음).
- 바탕은 Page {colors.canvas-soft} + 흰 카드, 구조는 옅은 회색 단계와 1px 선. 모든 모서리 0. 그림자는 `modal`·`bottom-sheet`·`toast`(·dropdown)에만.
- 검수 상태 배지(결정 사항):
  - 작성 중 · 검수 대기 · 반려 = 흑백 `data-status-badge`({colors.canvas-soft} + {colors.text-muted}, {typography.label}).
  - 검수 완료 = 안정 색 쌍(#137a3f 글자 / #e7f5ec 채움) + ● + 이름 "검수 완료". 모양은 `judge-badge`의 안정 쌍을 그대로 써요(design.md "완료·검수 완료는 안정 색 쌍", 환산 규칙 검수 전용).
  - 상태 이름과 PRD 값 연결: 작성 중 = draft, 검수 대기 = testing(테스트 통과 후 요청됨), 검수 완료 = verified, 반려 = draft로 돌아가면서 반려 사유가 붙은 상태.
- 테스트 결과 배지: 통과 = 흑백 `data-status-badge` "통과", 불통과 = 위험 쌍(#b8232a / #fce9ea) ■ + "불통과"(입력 오류 = 위험 쌍 규칙). 색만으로 전하지 않아요.
- 변경 전·후 비교 = `data-table` 3열(항목 / 현재 공개 버전 / 이번 수정안). 바뀐 값만 Bold 700. 증감 색(빨강·파랑)은 쓰지 않아요(전년 대비 숫자 전용이라서).
- 버전 기록 = `counsel-timeline` 재사용(마디 = 버전, 회색 시스템 줄 = 변경 로그).
- NEVER-1을 화면 문구로 드러내요: 편집기·검수 화면 머리에 Level 1 띠 "검수 완료 전 수정안은 학생 화면에서 계산·공개하지 않아요", 목록·패널 맨 아래 `disclaimer-note`.
- 2인 검수 강제: 작성자 본인 계정에서는 승인·반려 버튼을 아예 그리지 않아요(비활성 아님, 숨김). 대신 "내가 작성한 규칙이에요. 다른 관리자가 검수해요." 한 줄.
- Route Blue는 선택 상태에만 써요: 선택된 `sidebar-item`, `sub-nav` 선택 탭 막대, `segmented-control-active`, 켜진 `filter-chip`, 선택된 표 행·타임라인 마디, `tab-bar-pill` 선택 아이콘, 링크, 떠 있는 목록의 고른 행. 이 화면에는 Route Blue 핵심 숫자를 두지 않아요. 배지·버튼 채움에는 쓰지 않아요.
- 주요 버튼(`button-primary`)은 화면마다 하나. 모달·시트가 떠 있으면 그 안의 버튼 하나만 주요 버튼이에요.
- 숫자(점수, 버전, 날짜, 테스트 수)는 모두 고정폭 숫자. 이름·셀은 한 줄 우선(폭을 다시 나눠서 맞추고, 그래도 넘치면 단어 사이에서만 줄바꿈).
- 사람 이름 대신 "관리자 A · 관리자 B · 관리자 C"로 써요. 대학은 가상 대학이라 로고 대신 `univ-monogram`.
- 문구는 해요체. 입시 결과를 점치거나 약속하는 표현은 쓰지 않아요.

### 가상 데이터

규칙: 가나대학교 · 학생부교과(지역균형). 현재 공개 버전 2028-v2(작성 관리자 C · 검수 관리자 A), 이번 수정안 2028-v3(작성 관리자 A, 모집요강 p.42 반영). 로그인: 편집기 프레임 = 관리자 A(작성자), 검수 프레임 = 관리자 B(검수자).

| 규칙 요소 | 현재 공개 버전 2028-v2 | 이번 수정안 2028-v3 |
|---|---|---|
| 반영 학기 | 1-1 · 1-2 · 2-1 · 2-2 · 3-1 | 같음 |
| 학년 가중 | 1학년 0.2 · 2학년 0.4 · 3학년 0.4 | 같음 |
| 반영 교과 | 국어 · 수학 · 영어 · 사회 · 과학 · 한국사 | 같음 |
| 과목 선택 | 전 과목 | 같음 |
| 학점 가중 | 예 | 같음 |
| 석차등급 점수 | 100 · 96 · 90 · 80 · 60 | 100 · **97** · 90 · 80 · 60 |
| 성취도 점수 | A 100 · B 95 · C 90 · D 80 · E 60 | 같음 |
| 성취도 병행 반영 | 비율 반영 등급 80 : 성취도 20 | 비율 반영 등급 **70** : 성취도 **30** |
| 미산출 과목 | 성취도 환산 | 같음 |
| 공동교육과정 | 일반 과목과 같이 | 같음 |
| 출결 환산 | 미인정 지각·조퇴·결과 3회 = 결석 1일 | 같음 |
| 출결 감점(결석 0 · 1~2 · 3~5 · 6일 이상) | 0 · −1 · −3 · −5 | 0 · −1 · **−2** · −5 |
| 만점 | 교과 80 + 출결 20 = 100 | 같음 |
| 소수점 | 둘째 자리 반올림 | 같음 |

테스트 케이스(2028-v3 기준, 기대값은 모집요강 예시로 확인한 값이라고 가정):

| 테스트 | 가상 학생 | 계산 과정 | 기대값 | 계산값 |
|---|---|---|---|---|
| 1 | 학생 A — 전 과목 2등급 · 성취도 A · 결석 0일 | 97×0.7 + 100×0.3 = 97.90 → ×0.8 = 78.32 → 출결 20 | 98.32 | 98.32 |
| 2 | 학생 B — 전 과목 3등급 · 성취도 B · 미인정 결석 4일 | 90×0.7 + 95×0.3 = 91.50 → ×0.8 = 73.20 → 출결 20 − 2 = 18 | 91.20 | 91.20 |
| 3 | 학생 C — 1학년 1등급 A, 2·3학년 2등급 B · 결석 0일 | 100×0.2 + 96.40×0.8 = 97.12 → ×0.8 = 77.696 → 77.70 → 출결 20 | 97.70 | 97.70 |
| 4(상태 프레임 전용) | 학생 D — 전 과목 1등급 · 성취도 A · 결석 0일 | 100×0.7 + 100×0.3 = 100 → ×0.8 = 80.00 → 출결 20 | (빈칸) | 100.00 |

규칙 목록(1440-list, 390 목록에 쓰는 값):

| 대학 | 전형 | 버전 | 상태 | 테스트 | 작성자 | 검수자 | 수정일 |
|---|---|---|---|---|---|---|---|
| 가나대학교 | 학생부교과(지역균형) | 2028-v3 | 작성 중 | 3/3 통과 | 관리자 A | – | 11-18 |
| 다라대학교 | 학생부교과(학교장추천) | 2028-v2 | 검수 대기 | 4/4 통과 | 관리자 C | – | 11-17 |
| 마바대학교 | 학생부교과(일반) | 2028-v1 | 반려 | 3/3 통과 | 관리자 B | 관리자 A | 11-16 |
| 카타대학교 | 학생부교과(지역인재) | 2028-v1 | 작성 중 | 1/3 · 2개 더 필요 | 관리자 C | – | 11-15 |
| 자차대학교 | 학생부교과(교과우수) | 2028-v2 | 검수 완료 | 5/5 통과 | 관리자 A | 관리자 C | 11-12 |

정렬: 상태(검수 대기 → 반려 → 작성 중 → 검수 완료) → 같으면 수정일 최근 순.
마바대학교 · 자차대학교 규칙 내용 표가 필요한 프레임(390-rule-detail, 1440-verified)은 값이 새로 생기지 않게 위 "현재 공개 버전 2028-v2" 열 값을 그대로 써요.

---

## 2. 프레임 목록

기본 두 개(admin-rules/390, admin-rules/1440)가 G3 대상이에요. 상태 프레임 36장은 6장에 모았어요(03-draft.json states에만 적고 frames에는 넣지 않아요).

| 프레임 | 크기 | 상태 | 로그인 |
|---|---|---|---|
| admin-rules/390 | 390×844 | 모바일 기본: 검수 목록(조회) | 관리자 B |
| admin-rules/1440 | 1440×900 | PC 기본: 규칙 편집기(작성 중) | 관리자 A |

---

## 3. 모바일 390 × 844 — 조회 · 승인만

좌우 여백 20({spacing.card}), 섹션 간격 32. 카드 안 패딩 16, 카드 사이 8.

### admin-rules/390 — 검수 목록 (기본)

위에서 아래 순서.

- M1. 머리 56: 대분류 첫 화면이라 뒤로가기 없음. 왼쪽 `brand-logo` 폭 92, 가운데 제목 "규칙 관리"({typography.heading-4}). 오른쪽 비움.
- M2. `sub-nav` 44(머리 바로 아래): 탭 "규칙 편집기 · 검수 · 계열표 · 위키 요약". "검수" 선택 = {colors.ink} SemiBold + 아래 2px Route Blue 막대, 나머지 {colors.text-muted}. "규칙 편집기"를 누르면 전체 규칙 카드 목록(보기 전용, 390-editor-tab).
- M3. 안내 띠(Level 1, 높이 40, 위 20): icon/info + {typography.body-sm} "모바일에서는 조회와 승인·반려만 해요. 편집은 PC에서 해요."
- M4. 섹션 "검수 대기 2"({typography.heading-2}, 숫자 잉크) → `univ-card` 2장(관리자 변형):
  - 왼쪽 `univ-monogram` 40 "가", 대학명 {typography.heading-3} "가나대학교"(한 줄), 아래 {typography.body-sm} {colors.text-muted} "학생부교과(지역균형) · 2028-v3"
  - 오른쪽 위 `data-status-badge` "검수 대기"
  - 아래 줄 {typography.caption} {colors.text-muted} 고정폭 "테스트 3/3 통과 · 작성 관리자 A · 11-18"
  - 하트·"수시로에 담기"는 그리지 않아요. 카드를 누르면 390-review.
  - 두 번째 카드: "다라대학교 · 학생부교과(학교장추천) · 2028-v2 · 테스트 4/4 통과 · 작성 관리자 C · 11-17".
- M5. 섹션 "최근 처리" → `univ-card` 2장: 마바대학교 2028-v1 `data-status-badge` "반려" · "반려 관리자 A · 11-16" / 자차대학교 2028-v2 `judge-badge` 안정 쌍 ● "검수 완료" · "검수 관리자 C · 11-12". 프레임에서 두 번째 카드가 잘리면 1장만 보이게 해요.
- M6. `disclaimer-note`: "ⓘ 검수 완료 규칙만 배포 버전에 들어가요 · 검수 전 규칙은 학생 화면에서 계산하지 않아요"
- M7. `tab-bar-pill`: 관리자 대분류 "규칙 관리 · 더보기"(규칙 관리 선택 = Route Blue 아이콘 + 잉크 SemiBold 글자). 아래 여백 = 탭바 64 + 띄움 16 + 안전 영역.

빈 상태는 390-empty(6-1).

### admin-rules/390-review — 검수 상세

상세 화면이라 `sub-nav` 없음.

- `app-bar`: 왼쪽 icon/chevron-left, 제목 "검수", 오른쪽 `button-pill-soft` "원문 ↗"(모집요강 p.42, 터치 44×44).
- 머리(위 20): `univ-monogram` 40 "가" + "가나대학교"({typography.heading-3}) / 아래 "학생부교과(지역균형) · 2028-v3 수정안"({typography.body-sm} text-muted) / 오른쪽 `data-status-badge` "검수 대기". 아래 캡션 "작성 관리자 A · 11-18 14:20 요청".
- NEVER-1 띠(Level 1, 위 16): icon/info + "검수 완료 전 수정안은 학생 화면에서 계산·공개하지 않아요"(한 줄, {typography.body-sm}).
- 섹션 "바뀐 항목 3"({typography.heading-2}, 위 32) → `data-table` 3열 축약(폭 350 = 항목 134 / 현재 공개 108 / 이번 수정안 108, 행 높이 40, 셀 패딩 8·12, 숫자 오른쪽 정렬). 머리글 "항목 / 현재 공개 / 이번 수정안". 행 3개: 2등급 점수 96 / **97** · 성취도 비율 80:20 / **70:30** · 결석 3~5일 감점 −3 / **−2**. 셀은 한 줄. 표 아래 `button-pill-soft` "전체 14개 항목 보기"(전체 폭, 높이 44) → 같은 표 14행.
- 섹션 "테스트 3/3 통과"(위 32): 행 3개(행 높이 44, 행 구분 1px hairline). 행 = "테스트 1 · 학생 A"({typography.title}) + 오른쪽 "98.32 = 98.32"(고정폭) + `data-status-badge` "통과". 행을 누르면 그 아래 `trace-accordion`이 펼쳐져요(390-review-trace). 이 프레임에서는 모두 접힘.
- 아래 고정 행(탭바 위 12): `button-outline` "반려"(반 폭) + `button-primary` "승인"(반 폭), 높이 52, 사이 8. 승인을 누르면 390-approve.
- `tab-bar-pill` 그대로(규칙 관리 선택).
- 넘치면 "전체 14개 항목 보기" 버튼을 표 머리 오른쪽 링크로 옮겨 높이를 줄여요.

### admin-rules/390-reject — 반려 사유 시트

- 390-review 위에 {colors.scrim} + `bottom-sheet`(손잡이, 그림자 허용).
- 제목 {typography.heading-4} "반려할까요?" → 설명 {typography.body-sm} "사유는 작성자(관리자 A)에게 그대로 전달돼요. 무엇을 어떻게 고치면 되는지 적어 주세요."
- 라벨 "반려 사유(필수)" + `text-input-focused` 변형 multiline(4줄 112) 입력값 "2등급 점수 97이 모집요강 p.42 표와 같은지 다시 봐 주세요."
- 칸 오른쪽 아래 바깥 캡션 text-muted "34/200" 고정폭.
- 버튼 줄: `button-outline` "취소" + `button-primary` "반려하기"(높이 52).
- 사유 없이 누른 모습은 390-reject-error.

---

## 4. PC 1440 × 900 — 전체 기능

앱 셸: 왼쪽 `sidebar` 248 + `page-header`. 본문 1192.
편집기·검수·버전 프레임은 본문 832(좌우 패딩 32 → 콘텐츠 768) + 오른쪽 보조 패널 360(흰 바탕, 왼쪽 1px {colors.hairline-soft}, 패딩 24). 목록 프레임은 보조 패널 없이 콘텐츠 1128.
데이터 화면이라 촘촘하게(블록 사이 24, 그룹 사이 32).

### 공통 — 사이드바

- `sidebar`: {colors.canvas} + 오른쪽 1px {colors.hairline-soft}, 맨 위 `brand-logo` 폭 124.
- `sidebar-group` "규칙 관리"(icon/sliders-horizontal, 펼침 ▾, {colors.ink} SemiBold, 높이 44) → 들여쓰기 16의 `sidebar-item` 4개 "규칙 편집기"(icon/file-text) · "검수"(icon/check) · "계열표"(icon/layout-grid) · "위키 요약"(icon/book-open). 편집기·목록·버전 프레임은 "규칙 편집기" 선택, 검수 프레임은 "검수" 선택(accent-soft 채움 + 왼쪽 3px Route Blue 막대 + 잉크 글자).
- 맨 아래: 캡션 text-muted "공개 배포 2028-v2 · 데이터 기준일 2026-11-18" + 캡션 "관리자 A로 로그인" + `button-pill-soft` "로그아웃"(icon/log-out).

### 공통 — page-header

- 왼쪽: 경로 캡션 text-muted "규칙 관리 › 규칙 편집기"(검수 프레임은 "규칙 관리 › 검수") + 제목 {typography.heading-1} "환산 규칙 편집"(목록 "규칙 편집기", 검수 "규칙 검수").
- 오른쪽: `data-status-badge` "공개 배포 2028-v2". 관리자는 학생·교사 모드가 없어서 `mode-switch`·잠금 버튼은 두지 않아요. 목록 프레임만 오른쪽에 파일 버튼 3개(6-2 1440-list).

### admin-rules/1440 — 규칙 편집기 (기본, 작성 중)

세로 예산(본문): page-header → 24 → 규칙 머리 80 → 16 → NEVER-1 띠 40 → 24 → 폼 머리 28 → 16 → 폼(스크롤, 보이는 높이 약 536) → 아래 고정 줄 72.

E1. 규칙 머리 [P2]
- 1행: `univ-monogram` 40 "가" + {typography.heading-2} "가나대학교 · 학생부교과(지역균형)"(한 줄).
- 2행: `data-status-badge` "작성 중" + 캡션 고정폭 "2028-v3 수정안 · 현재 공개 2028-v2 · 작성 관리자 A" + 오른쪽 `button-pill-soft` "원문 보기 ↗ 모집요강 p.42" + `button-outline` "목록으로".

E2. NEVER-1 띠 [P6]
- Level 1 띠({colors.canvas-soft}, 높이 40, 선 없음): icon/info + {typography.body-sm} "검수 완료 전 수정안은 학생 화면에서 계산·공개하지 않아요 · 지금 학생 화면에는 2028-v2가 보여요"

E3. 폼 머리
- {typography.heading-3} "규칙 요소" + `ai-label` "AI 초안 · 참고용" + 캡션 text-muted "모집요강에서 뽑은 초안이에요. 원문과 대조해 고쳐 주세요."

E4. 설정 폼 [P2, P3] — 그룹 제목({typography.heading-4}) 아래 행. 행 = 왼쪽 라벨 200({typography.body}) + 오른쪽 컨트롤 568, 행 높이 48, 행 사이 8.

| 그룹 | 행 | 컨트롤 |
|---|---|---|
| 기본 정보(폼 맨 위, 기본 프레임에서는 스크롤 위) | 대학 · 전형 · 학년도 · 원문 주소(https) · 원문 쪽 | `text-input` 5칸(1440-new에서 그려요) |
| 반영 학년·학기 | 반영 학기 | `filter-chip` 5개 "1-1 · 1-2 · 2-1 · 2-2 · 3-1"(모두 켜짐) |
|  | 학년 가중 | `text-input` 3칸(폭 96, 고정폭, 오른쪽 정렬) "0.2" "0.4" "0.4" + 캡션 "합 1.0" |
| 반영 교과·과목 선택 | 반영 교과 | `filter-chip` 6개 "국어 · 수학 · 영어 · 사회 · 과학 · 한국사"(모두 켜짐) |
|  | 과목 선택 | `segmented-control` "전 과목 · 교과군별 상위 N · 전체 상위 N"(전 과목 = `segmented-control-active`) + `text-input` N(비활성, {colors.text-faint} "–") |
|  | 학점 가중 | `segmented-control` "예 · 아니오"(예 선택) |
|  | 공동교육과정 | `segmented-control` "일반 과목과 같이 · 제외"(일반 과목과 같이 선택) |
| 등급·성취도 점수표 | 석차등급 점수 | 작은 `data-table`(머리 "1 · 2 · 3 · 4 · 5", 셀 = `text-input` 높이 32) "100 · 97 · 90 · 80 · 60" |
|  | 성취도 점수 | 작은 `data-table`(머리 "A · B · C · D · E") "100 · 95 · 90 · 80 · 60" |
|  | 성취도 병행 반영 | `segmented-control` "안 함 · 비율 반영 · 높은 쪽"(비율 반영 선택) + `text-input` "등급 70" "성취도 30" + 캡션 "합 100" |
|  | 미산출 과목 | `segmented-control` "제외 · 성취도 환산 · 가산"(성취도 환산 선택) |
| 출결 감점표(머리 오른쪽 `checkbox` "출결 반영" 켜짐) | 출결 환산 | "미인정 지각·조퇴·결과" `text-input` "3" "회 = 결석 1일" |
|  | 감점 구간 | 작은 `data-table`(머리 "결석 0일 · 1~2일 · 3~5일 · 6일 이상") "0 · −1 · −2 · −5" |
| 만점·반올림 | 만점 | `text-input` "교과 80" + "출결 20" + 캡션 "= 100" |
|  | 소수점 | `text-input` "2"(자리) + `segmented-control` "반올림 · 버림 · 올림"(반올림 선택) |

- 프레임에는 "반영 학년·학기"부터 "등급·성취도 점수표"까지 보이고, 나머지는 스크롤 아래예요.
- 편집 중인 칸 하나를 `text-input-focused`(2px 잉크 링)로 보여요: 석차등급 2등급 칸 "97".

E5. 아래 고정 줄(본문 폭, 높이 72, 위 1px {colors.hairline}, 흰 바탕)
- 왼쪽 캡션 text-muted 고정폭 "마지막 저장 11-18 14:20 · 관리자 A"
- 오른쪽 `button-outline` "임시 저장" + `button-primary` "검수 요청"(높이 44, 화면의 유일한 주요 버튼).

R. 오른쪽 보조 패널(360) — 테스트 케이스 [P5]
- `segmented-control` "테스트 케이스 3 · 버전 기록"(테스트 케이스 = `segmented-control-active`).
- 요약 줄: {typography.title} "3/3 통과" + 캡션 text-muted "최소 3개 · 모두 통과해야 검수 요청할 수 있어요" + 오른쪽 `button-outline` "테스트 실행".
- 테스트 행 3개(행 구분 1px hairline, 행 패딩 12): 1행 "테스트 1 · 학생 A"({typography.title}) + 오른쪽 `data-status-badge` "통과" / 2행 캡션 "전 과목 2등급 · 성취도 A · 결석 0일" / 3행 고정폭 {typography.table} "기대 98.32 · 계산 98.32".
- 테스트 1 아래 `trace-accordion` 펼침("어떻게 계산했나요?"): 단계 줄 "석차등급·성취도 반영 → 97×0.7 + 100×0.3 = 97.90" · "교과 환산 → 97.90 × 0.8 = 78.32" · "출결 → 20 − 0 = 20.00" · 마지막 줄 굵게 "합계 98.32"(위 1px hairline). 테스트 2·3은 접힘.
- `button-pill-soft` "+ 테스트 케이스 추가".
- 패널 맨 아래 `disclaimer-note`: "ⓘ 기대값은 대학 공식 계산기·모집요강 예시로 확인한 값이에요 · 대학 공식 자료가 최종 기준이에요"

반려된 규칙을 다시 연 모습은 1440-returned(6-2).

### admin-rules/1440-list — 규칙 목록 [P1]

보조 패널 없음, 콘텐츠 1128.

- `page-header` 오른쪽(배지 옆): `button-outline` "규칙 기록 합치기" · "규칙 기록 내보내기" · "배포 파일 내보내기"(높이 40, 앱과 같음). 검수 완료 규칙이 0개면 "배포 파일 내보내기"는 비활성({colors.text-faint} 글자 · {colors.hairline-soft} 테두리) + 툴팁 대신 표 아래 캡션 "검수 완료 규칙이 생기면 배포 파일을 내보낼 수 있어요."
- 도구 줄(높이 44): `text-input` size sm 320 "대학·전형 이름으로 찾기" + `filter-chip` 5개 "전체 5 · 검수 대기 1 · 반려 1 · 작성 중 2 · 검수 완료 1"("전체 5" 켜짐) + 오른쪽 `button-primary` "새 규칙 만들기".
- `data-table`(행 높이 44, 머리글 고정, 첫 열 고정). 열 폭: 대학 240(`univ-monogram` 20 + 이름) · 전형 200 · 버전 112 · 상태 136 · 테스트 136 · 작성자 112 · 검수자 112 · 수정일 80. 내용은 가상 데이터 "규칙 목록" 5행, 정렬 규칙대로.
  - 상태 열: 작성 중·검수 대기·반려 = `data-status-badge`, 검수 완료 = `judge-badge` 안정 쌍 ● "검수 완료".
  - 테스트 열: "3/3 통과" 고정폭. 3개 미만은 "1/3 · 2개 더 필요"(잉크 글자, 배지 없음).
  - 정렬 화살표: 상태 · 수정일.
  - 행을 누르면 그 규칙의 편집기(admin-rules/1440). 선택 행 = accent-soft 채움 + 왼쪽 3px Route Blue 막대. 프레임에서는 선택 없음.
- 표 아래 캡션 text-muted "배포 파일(scoring-rules.json)을 배포하면 학생 '대학별 환산'에 더해져요. 학생 앱은 파일을 다시 검사해서 검수 완료 규칙만 써요."
- 그 아래 `disclaimer-note`: "ⓘ 검수 완료 규칙만 배포 파일에 들어가요 · 작성 중 · 검수 대기 · 반려 규칙은 학생 화면에서 계산하지 않아요 · 규칙 기록은 이 기기에만 저장되고, 다른 관리자와는 파일로 주고받아요"
- 결과 없음(검색 · 칩으로 0건, 별도 프레임 없음): 표 본문 가운데 회색 한 줄 "조건에 맞는 규칙이 없어요" + 링크 {colors.accent} "필터 모두 끄기".
- 규칙 0개는 1440-list-empty.

### admin-rules/1440-saved — 임시 저장 토스트

- admin-rules/1440과 같고, 오른쪽 아래(아래 고정 줄 위 16, 오른쪽 32) `toast` "임시 저장했어요 · 2028-v3 수정안"(잉크 바탕 + 흰 글자, 그림자 허용).
- 아래 고정 줄 캡션이 "마지막 저장 11-18 14:32 · 관리자 A"로 바뀌어요.

### admin-rules/1440-error — 검증 오류 + 검수 요청 꺼짐 [P3]

admin-rules/1440과 같은 구성에서 바뀌는 곳만:
- 성취도 병행 반영 행: "성취도" 칸이 `text-input-error`(2px 위험색 링) "20", 칸 아래 icon/triangle-alert 14 + 위험색 캡션 "등급 70 + 성취도 20 = 90이에요. 합이 100이 되도록 고쳐 주세요."
- 소수점 행: "버림"이 선택된 상태.
- 오른쪽 패널: 요약 "2/3 통과". 테스트 3 행의 배지 = 위험 쌍 ■ "불통과", 3행 "기대 97.70 · 계산 97.69", 아래 위험색 캡션 "차이 0.01이에요. 소수점 처리 방식(반올림·버림)을 확인해 주세요." 테스트 3의 `trace-accordion`을 펼쳐 "교과 환산 → 77.696 → 버림 77.69" 줄을 보여요.
- 아래 고정 줄: `button-primary` "검수 요청" 비활성({colors.canvas-soft} 채움 + {colors.text-faint} 글자) + 버튼 왼쪽 캡션 text-muted "오류 1개, 불통과 테스트 1개를 고치면 검수를 요청할 수 있어요."
- 테스트 케이스가 3개 미만일 때도 같은 방식으로 꺼지고 캡션은 "테스트 케이스가 2개 더 필요해요."(앱 문구). 꺼지는 이유가 여럿이면 앱처럼 첫 이유 한 줄만 보여요.

### admin-rules/1440-request — 검수 요청 확인 모달 [P5]

- admin-rules/1440 위에 {colors.scrim} + `modal`(폭 560, 그림자 허용, 패딩 24).
- 제목 {typography.heading-4} "검수를 요청할까요?"
- 본문 {typography.body}: "요청하면 검수가 끝날 때까지 편집이 잠겨요. 그동안 학생 화면에는 지금 공개 버전 2028-v2가 그대로 보여요."
- 요약 3줄({typography.body-sm}, 고정폭): "바뀐 항목 3개 · 2등급 점수, 성취도 비율, 결석 3~5일 감점" / "테스트 3/3 통과" / "검수자: 작성자(관리자 A)를 뺀 관리자"
- 버튼 줄(오른쪽 정렬): `button-outline` "취소" + `button-primary` "검수 요청 보내기".
- 보낸 뒤: admin-rules/1440-waiting + `toast` "검수를 요청했어요".

### admin-rules/1440-waiting — 검수 대기 (편집 잠금) [P6]

- 오른쪽 아래 `toast` "검수를 요청했어요"(요청 직후 모습).
- 머리 배지 `data-status-badge` "검수 대기".
- E2 자리 Level 1 띠: icon/lock + "검수 대기 중이에요 · 검수 전에는 학생 화면에서 계산하지 않아요" + 캡션 "11-18 14:35 요청 · 관리자 A".
- 폼 칸은 모두 읽기 전용: `text-input` 채움은 그대로, 포커스 링 없음, 컨트롤 누름 없음. `ai-label`은 그대로.
- 아래 고정 줄: 캡션 "검수자가 승인하거나 반려하면 알려 드려요" + `button-outline` "검수 요청 취소"(→ 1440-cancel-request). 주요 버튼 없음.
- 오른쪽 패널: 테스트 3/3 통과(admin-rules/1440과 같음, "테스트 실행"·"+ 테스트 케이스 추가" 버튼 없음).
- 이 상태의 규칙은 배포 파일에 들어가지 않아요(이 프레임에는 그리지 않음).

### admin-rules/1440-review — 검수자 화면 [P4, P5]

로그인 관리자 B, `sidebar-item` "검수" 선택, 경로 "규칙 관리 › 검수".

- V1. 규칙 머리: E1과 같고 배지 `data-status-badge` "검수 대기", 캡션 "2028-v3 수정안 · 작성 관리자 A · 11-18 14:35 요청" + `button-pill-soft` "원문 보기 ↗ 모집요강 p.42".
- V2. NEVER-1 띠: "승인 전 수정안은 학생 화면에서 계산·공개하지 않아요 · 승인해도 배포 버전에 넣기 전까지 학생 화면은 2028-v2예요"
- V3. 비교 표 도구 줄: {typography.heading-3} "변경 전·후 비교" + `filter-chip` "전체 14"(켜짐) · "바뀐 항목만 3" + 캡션 text-muted "바뀐 값은 굵게 보여요".
- V4. `data-table` 3열(항목 200 / 현재 공개 버전 2028-v2 284 / 이번 수정안 2028-v3 284), 행 높이 40, 머리글 고정. 가상 데이터 14행, 바뀐 값(97, 70, 30, −2)만 Bold. 셀 한 줄. 표 안 세로 스크롤.
- V5. 아래 고정 줄: 캡션 text-muted "비교 표와 테스트 결과를 확인한 뒤 결정해 주세요" + `button-outline` "반려" + `button-primary` "승인".
- 오른쪽 패널: `segmented-control` "테스트 결과 3 · 버전 기록". 요약 "3/3 통과 · 검수자가 다시 실행함 11-18 15:02". 테스트 행 3개 + 테스트 2의 `trace-accordion` 펼침(단계 줄 "90×0.7 + 95×0.3 = 91.50" · "× 0.8 = 73.20" · "출결 20 − 2 = 18.00(미인정 결석 4일 → 3~5일 구간)" · 굵게 "합계 91.20"). 맨 아래 `disclaimer-note`(1440과 같음).

### admin-rules/1440-approve — 승인 확인 모달

- 1440-review 위 `modal`(폭 560).
- 제목 {typography.heading-4} "승인할까요?" → 본문 "승인하면 이 규칙이 검수 완료가 되고, 다음 배포 파일에 넣을 수 있어요. 학생 화면에는 배포한 뒤에 반영돼요."
- 요약: "작성 관리자 A · 검수 관리자 B" / "바뀐 항목 3개 · 테스트 3/3 통과"
- 버튼: `button-outline` "취소" + `button-primary` "승인하기".
- 승인 뒤: 1440-approved.

### admin-rules/1440-reject — 반려 사유 모달

- 1440-review 위 `modal`(폭 560).
- 제목 {typography.heading-4} "반려할까요?" → 설명 {typography.body-sm} "사유는 작성자(관리자 A)에게 그대로 전달돼요. 무엇을 어떻게 고치면 되는지 적어 주세요."
- 라벨 "반려 사유(필수)" + `text-input-focused` 변형 multiline(4줄 112) "2등급 점수 97이 모집요강 p.42 표와 같은지 다시 봐 주세요." + 칸 오른쪽 아래 바깥 캡션 "34/200" 고정폭.
- 버튼: `button-outline` "취소" + `button-primary` "반려하기".
- 사유 없이 누르면 `text-input-error` + icon/triangle-alert + 위험색 캡션 "반려 사유를 적어야 반려할 수 있어요."(PC는 별도 프레임 없음, 모양은 390-reject-error와 같음).
- 반려 뒤: `toast` "반려했어요 · 관리자 A에게 사유를 보냈어요", 규칙 상태는 "반려"(PC 별도 프레임 없음, 모바일 390-rejected와 같은 문구).

### admin-rules/1440-self — 작성자 본인 검수 화면 (2인 검수 강제) [P5]

- 1440-review와 같은데 로그인 관리자 A(작성자).
- V5 아래 고정 줄에서 `button-outline` "반려"·`button-primary` "승인"을 그리지 않아요. 대신 icon/info + {typography.body-sm} "내가 작성한 규칙이에요. 다른 관리자가 검수해요(작성자와 검수자는 달라야 해요)." 주요 버튼 없음.
- 패널의 "테스트 실행"은 그대로 둬요(확인은 누구나).

### admin-rules/1440-version — 버전 기록 · 버전 비교 [P7]

- 본문은 1440과 같은 머리(E1·E2) 아래, 폼 대신 비교 표: {typography.heading-3} "2028-v1과 현재 공개 버전 비교" + `button-pill-soft` "편집으로 돌아가기". `data-table` 3열 "항목 / 2028-v1 / 현재 공개 버전 2028-v2", 바뀐 값만 Bold(예: 석차등급 점수 "100 · 95 · 88 · 80 · 60" → "100 · **96** · **90** · 80 · 60"). 버전을 고르지 않았을 때 기본은 "현재 공개 버전 / 이번 수정안"이에요.
- 오른쪽 패널: `segmented-control` "테스트 케이스 3 · 버전 기록"(버전 기록 = `segmented-control-active`) → `counsel-timeline`:
  - 마디 "2028-v3 수정안" · 11-18 · 작성 관리자 A · `data-status-badge` "작성 중"
    - 회색 시스템 줄(변경 로그, {typography.caption} text-muted): "11-18 14:20 관리자 A · 성취도 비율 80:20 → 70:30" / "11-18 14:05 관리자 A · 2등급 점수 96 → 97" / "11-18 13:50 관리자 A · 결석 3~5일 감점 −3 → −2"
  - 마디 "2028-v2 · 현재 공개" · 2026-09-02 · 작성 관리자 C · 검수 관리자 A · `judge-badge` 안정 쌍 ● "검수 완료"
  - 마디 "2028-v1 · 시행계획 기준" · 2026-05-20 · 작성 관리자 B · 검수 관리자 C · `judge-badge` 안정 쌍 ● "검수 완료" — 이 마디가 선택됨(accent-soft 채움 + 왼쪽 3px Route Blue 막대). 마디 점은 ELLIPSE.
- 날짜·버전은 고정폭. 마디를 누르면 본문 비교 표가 그 버전으로 바뀌어요.

---

## 5. 앱 상태 목록 (app/src/screens/AdminRules.tsx 기준 → 프레임)

| 앱에 있는 것 | 앱 문구·동작 | 시안 프레임 |
|---|---|---|
| 불러오는 중 | "규칙을 읽고 있어요." | 390-loading(PC는 같은 한 줄, 별도 프레임 없음) |
| 규칙 0개 | empty-state "아직 만든 규칙이 없어요" | 1440-list-empty |
| 관리자 이름 칸(로그인 대신, 비면 "먼저 관리자 이름을 적어 주세요.") | 임시 이름 입력 | 그리지 않아요 — 시안은 PRD 7-4 로그인(사이드바 "관리자 A로 로그인")으로 대신해요 |
| 새 규칙 만들기 | 빈 규칙 열림, 기본 정보 칸 | 1440-new |
| 규칙 기록 내보내기 (.json) | 바로 내려받기 | 1440-export-confirm(확인 창 추가) |
| 규칙 기록 합치기 (.json) | 합친 개수 · 뺀 개수 알림 / 형식 오류 | 1440-import-result · 1440-import-error |
| 배포 파일 내보내기 (검수 완료 0개면 비활성) | 바로 내려받기 | 1440-release-confirm(확인 창 추가) · 1440-list 비활성 설명 |
| 편집 폼 + 검증 오류 묶음 | ▲ "확인할 곳이 n개 있어요" | 1440-error(칸마다 `text-input-error` + 꺼진 이유 한 줄) |
| 임시 저장 | "임시 저장했어요" | 1440-saved |
| 저장 안 하고 "목록으로" | 바로 나감 | 1440-leave(확인 창 추가) |
| 검수 요청 비활성 + 첫 이유 | blockers 첫 줄 | 1440-error · 1440-new |
| 검수 요청 확인 modal | "검수를 요청할까요?" | 1440-request → 1440-waiting(toast) |
| 검수 대기 편집 잠금 | "검수 대기 중이라 편집을 잠갔어요." | 1440-waiting |
| 검수 요청 취소 | 앱에 없음 | 1440-cancel-request(새 기능 + 확인 창) |
| 승인 확인 modal | "승인할까요?" | 1440-approve · 390-approve |
| 승인 뒤 | "승인했어요" | 1440-approved · 390-approved |
| 반려 modal + 사유 필수 오류 | "반려 사유를 적어야 반려할 수 있어요." | 1440-reject · 390-reject · 390-reject-error |
| 반려 뒤 | "반려했어요" | 390-rejected(PC 같은 문구) |
| 반려된 규칙 다시 열기 | ▲ 반려 사유 띠 | 1440-returned(tone=neutral 띠) |
| 작성자 본인 검수 | "내가 작성한 규칙이에요. 다른 관리자가 검수해요." | 1440-self · 390-self |
| 남의 작성 중 규칙 열기 | "작성자(관리자 A)만 고칠 수 있어요." | 1440-readonly · 390-rule-detail |
| 검수 완료 규칙 + 새 수정안 만들기 | 새 버전 열림 | 1440-verified |
| 테스트 카드 편집(학년별 등급 · 성취도 select, 결석 · 지각 · 기대값) | 편집 칸 | 1440-test-edit |
| 테스트 더하기 / 이 테스트 빼기 | 바로 빠짐 | 1440-test-edit · 1440-test-delete(확인 창 추가) |
| 계산 과정 펼치기 | trace | 1440(테스트 1) · 1440-review(테스트 2) · 390-review-trace |
| 버전 기록 펼치기 | history | 1440-version |
| 처리 실패 | "처리하지 못했어요." | 화면 오류 줄(1440-import-error와 같은 모양, 별도 프레임 없음) |

앱 반영 메모(시안 기준으로 앱을 맞출 곳): ① 반려 사유 띠 · 검증 오류 묶음의 ▲ 소신 색 `warning-callout` → tone=neutral 띠 · 칸별 `text-input-error` ② 테스트 빼기 · 저장 안 하고 나가기 · 두 내보내기 · 검수 요청 취소에 확인 창 ③ 메시지 줄 → `toast` ④ 관리자 이름 칸 → 로그인.

---

## 6. 상태 프레임 (03-draft.json states에만 적고 frames에는 넣지 않아요)

이름 = admin-rules/<폭>-<상태>. 모바일 12장 + PC 24장 = 36장(3·4장에 이미 정의된 12장 + 새로 24장). 3·4장에 자세히 적은 프레임은 표에서 "3장"·"4장"으로만 가리켜요.
떠 있는 레이어 노드 이름은 정확히 bottom-sheet · modal · toast · dropdown(J6). 모든 프레임은 기본 프레임(390 또는 1440)을 복제해서 바뀌는 곳만 고쳐요.

### 6-1. 모바일 390×844 (12)

| 프레임 | 무엇을 그리나 |
|---|---|
| admin-rules/390-loading | M1 · M2 · M3까지 그대로, 아래 흰 카드 하나에 "규칙을 읽고 있어요." {typography.body-sm} {colors.text-muted}(불러오는 중 규칙). 카드 목록 · 고지 없음, `tab-bar-pill` 그대로 |
| admin-rules/390-empty | 검수 대기 0개. M4 자리에 `empty-state`: 선 아이콘 icon/check 48 → "지금 검수할 규칙이 없어요" {typography.heading-4} → "다른 관리자가 검수를 요청하면 여기에 보여요." {typography.body-sm}. 모바일은 할 일이 없어서 버튼 없음(9장 제안 5). M5 "최근 처리" · M6 그대로 |
| admin-rules/390-editor-tab | `sub-nav` "규칙 편집기" 선택. M3 띠 그대로 → `text-input` size md "대학·전형 이름으로 찾기" → `filter-chip` 가로 스크롤 한 줄 "전체 5 · 검수 대기 1 · 반려 1 · 작성 중 2 · 검수 완료 1"("전체 5" 켜짐, 잘린 칩이 보이게) → `univ-card` 관리자 변형 5장(정렬 규칙 순서: 다라 검수 대기 → 마바 반려 → 가나 작성 중 → 카타 작성 중 "테스트 1/3 · 2개 더 필요" → 자차 검수 완료). "새 규칙 만들기" 없음(PC 전용). 결과 0건이면 목록 자리 한 줄 "조건에 맞는 규칙이 없어요" + 링크 "필터 모두 끄기"(별도 프레임 없음) |
| admin-rules/390-rule-detail | 390-editor-tab에서 마바대학교 카드를 누름(로그인 관리자 B = 작성자지만 모바일은 편집 없음). `app-bar` ‹ "규칙 보기" + 오른쪽 `button-pill-soft` "원문 ↗" → 머리 `univ-monogram` "마" + "마바대학교" / "학생부교과(일반) · 2028-v1" + `data-status-badge` "반려" → `warning-callout` tone=neutral "반려 사유 · 관리자 A · 11-16" / "2등급 점수가 모집요강 p.42와 같은지 다시 봐 주세요." → NEVER-1 띠 → 섹션 "규칙 내용 14" `data-table` 2열(항목 134 / 값 216, 1장 가상 데이터 2028-v2 열 값) 처음 6행 + `button-pill-soft` "전체 14개 항목 보기" → 섹션 "테스트 3/3 통과" 접힌 행 3개 → 아래 Level 1 한 줄 icon/info "고치려면 PC에서 열어 주세요." 버튼 없음 |
| admin-rules/390-review | 3장 |
| admin-rules/390-review-trace | 390-review를 아래로 스크롤해 "테스트 3/3 통과" 섹션이 보이는 모습. 테스트 2 행 펼침: 행 아래 `trace-accordion` "어떻게 계산했나요?" 단계 줄 "90×0.7 + 95×0.3 = 91.50" · "× 0.8 = 73.20" · "출결 20 − 2 = 18.00(미인정 결석 4일 → 3~5일 구간)" · 굵게 "합계 91.20"(위 1px hairline) + 맨 아래 `disclaimer-note` "ⓘ 기대값은 대학 공식 계산기·모집요강 예시로 확인한 값이에요". 아래 고정 행 "반려" · "승인" 그대로 |
| admin-rules/390-approve | 390-review 위 scrim + `bottom-sheet`: 제목 "승인할까요?" {typography.heading-4} → 1440-approve와 같은 본문 {typography.body} → 요약 2줄 {typography.body-sm} 고정폭 "작성 관리자 A · 검수 관리자 B" / "바뀐 항목 3개 · 테스트 3/3 통과" → `button-outline` "취소" + `button-primary` "승인하기"(각 반 폭, 높이 52) |
| admin-rules/390-approved | 승인 뒤 목록(390). 섹션 "검수 대기 1"(다라대학교만), "최근 처리" 첫 카드 = 가나대학교 2028-v3 `judge-badge` 안정 쌍 ● "검수 완료" · "검수 관리자 B · 11-18". `toast`(탭바 위 16): "승인했어요 · 검수 완료" / 2줄 {typography.body-sm} "배포 파일에 넣으면 학생 화면에 반영돼요" |
| admin-rules/390-reject | 3장 |
| admin-rules/390-reject-error | 390-reject 시트에서 사유를 비우고 "반려하기"를 누름. 칸 = `text-input-error` 변형 multiline(빈 값, 안내 "무엇을 고치면 되는지 적어 주세요" {colors.text-faint}) → 아래 icon/triangle-alert 14 + 위험색 캡션 "반려 사유를 적어야 반려할 수 있어요." → 오른쪽 "0/200". 버튼 줄 그대로(비활성으로 바꾸지 않아요, 앱과 같음) |
| admin-rules/390-rejected | 반려 뒤 목록(390). "검수 대기 1"(다라만), "최근 처리" 첫 카드 = 가나대학교 `data-status-badge` "반려" · "반려 관리자 B · 11-18". `toast` "반려했어요 · 관리자 A에게 사유를 보냈어요" |
| admin-rules/390-self | 로그인 관리자 A로 가나대학교 검수 상세를 연 모습(390-review와 같은 내용). 아래 고정 행 대신 Level 1 띠 icon/info + {typography.body-sm} "내가 작성한 규칙이에요. 다른 관리자가 검수해요." 주요 버튼 없음 |

### 6-2. PC 1440×900 (24)

| 프레임 | 무엇을 그리나 |
|---|---|
| admin-rules/1440-list | 4장(파일 버튼 3개 · 표 아래 캡션 포함) |
| admin-rules/1440-list-empty | 규칙 0개. page-header 파일 버튼 중 "규칙 기록 합치기"만 켜짐("규칙 기록 내보내기" · "배포 파일 내보내기" 비활성). 도구 줄 · 표 자리에 `empty-state`: 선 아이콘 icon/file-text 48 → "아직 만든 규칙이 없어요" {typography.heading-4} → "모집요강을 보고 대학·전형 환산 규칙을 만들어 보세요. 다른 기기의 기록은 '규칙 기록 합치기'로 가져와요." {typography.body-sm} → `button-primary` "새 규칙 만들기". 아래 `disclaimer-note`(1440-list와 같음) |
| admin-rules/1440-import-result | 1440-list에서 "규칙 기록 합치기"로 파일을 고른 뒤(파일 창은 OS 기본이라 그리지 않아요). 표는 합친 결과로 6행(맨 아래 "하나대학교 · 학생부교과(일반) · 2028-v1 · 작성 중 · 0/0 통과 · 3개 더 필요 · 관리자 C"). 오른쪽 아래 `toast` "규칙 4개를 합쳤어요" / 2줄 "1개는 형식이 맞지 않아 뺐어요 · 같은 규칙은 더 최근 기록으로 바꿨어요" |
| admin-rules/1440-import-error | 도구 줄 위 화면 오류 줄(흰 카드): icon/triangle-alert 20 {colors.ink} + "규칙 기록 파일(.json)인지 확인해 주세요. U:NAVI에서 내보낸 rule-drafts.json만 합칠 수 있어요." {typography.body} + `button-outline` "다른 파일 고르기". 표는 그대로 5행. 판정 색 없음. 승인 · 요청 같은 처리 실패("처리하지 못했어요. 화면을 다시 열어 주세요." + `button-outline` "다시 열기")도 같은 모양이라 따로 그리지 않아요 |
| admin-rules/1440-export-confirm | "규칙 기록 내보내기"를 누른 뒤 scrim + `modal`(560): 제목 "규칙 기록을 내보낼까요?" → "규칙 5개의 수정안 · 테스트 케이스 · 버전 기록이 rule-drafts.json 파일 하나로 저장돼요. 다른 관리자와 주고받는 파일이라 학생에게는 보내지 마세요." → 버튼 오른쪽 정렬 `button-outline` "취소" · `button-primary` "내보내기". 내보낸 뒤 `toast` "rule-drafts.json을 저장했어요"(별도 프레임 없음) |
| admin-rules/1440-release-confirm | "배포 파일 내보내기"를 누른 뒤 `modal`(560): 제목 "배포 파일을 내보낼까요?" → "검수 완료 규칙 1개(자차대학교 학생부교과(교과우수) 2028-v2)만 scoring-rules.json에 들어가요. 작성 중 2개 · 검수 대기 1개 · 반려 1개는 빠져요." → 캡션 text-muted "학생 앱은 이 파일을 다시 검사해서 검수 완료 규칙만 써요." → "취소" · "내보내기". 내보낸 뒤 `toast` "배포 파일을 저장했어요 · 규칙 1개" |
| admin-rules/1440-new | "새 규칙 만들기" 직후(관리자 A). E1 = `univ-monogram` "–" + "이름 없는 규칙 · 전형" {typography.heading-2} + `data-status-badge` "작성 중" + 캡션 "2028-v1 수정안 · 현재 공개 없음 · 작성 관리자 A". E2 띠 "검수 완료 전 규칙은 학생 화면에서 계산·공개하지 않아요". `ai-label` 없음. 폼 맨 위 "기본 정보" 그룹: 대학 `text-input-focused` 빈 값 안내 "예: 가나대학교" · 전형 "예: 학생부교과(지역균형)" · 학년도 "2028" · 원문 주소(https) "https://… 모집요강 PDF" · 원문 쪽 "예: p.42"(안내는 {colors.text-faint}), 아래 "반영 학년·학기" 그룹 머리까지 보임. 오른쪽 패널 요약 "0/0 통과" + 흰 바탕 한 줄 "테스트 케이스가 없어요. 가상 학생 3명 이상을 넣고 기대값을 적어 주세요." + `button-pill-soft` "+ 테스트 케이스 추가". 아래 고정 줄 "마지막 저장 –" + `button-outline` "임시 저장" + `button-primary` "검수 요청" 비활성 + 캡션 "대학과 전형 이름을 적어 주세요."(앱 첫 이유) |
| admin-rules/1440-saved | 4장 |
| admin-rules/1440-error | 4장 |
| admin-rules/1440-test-edit | 1440에서 "+ 테스트 케이스 추가"를 누른 뒤. 패널 요약 "3/4 통과", 테스트 1~3 접힘, 새 "테스트 4 · 학생 D" 카드 펼침: 학년 3줄(라벨 "1학년" · "2학년" · "3학년" + `text-input` 변형 select size sm 40 등급 "1등급" 폭 96 + select 성취도 "A" 폭 72) → 한 줄 `text-input` sm 3칸(폭 96) "미인정 결석 0" · "지각·조퇴·결과 0" · "기대값"(빈 값, `text-input-focused`) → 결과 줄 위험 쌍 ■ "불통과" + 고정폭 "계산 100.00 · 기대값을 넣어 주세요" → `button-danger-text` "이 테스트 빼기". 아래 고정 줄 "검수 요청" 비활성 + 캡션 "불통과 테스트가 1개 있어요." |
| admin-rules/1440-test-delete | 1440-test-edit에서 "이 테스트 빼기"를 누른 뒤 `modal`(560): "테스트 4를 뺄까요?" → "학생 D의 입력값과 기대값이 함께 지워져요. 남은 테스트는 3개예요." → "취소" · `button-primary` "빼기"(잉크). 뺀 뒤 `toast` "테스트 4를 뺐어요" |
| admin-rules/1440-leave | 2등급 칸을 고친 뒤 저장하지 않고 E1 "목록으로"(또는 `sidebar-item`)를 누름. `modal`(560): "저장하지 않고 나갈까요?" → "2등급 점수 등 바꾼 내용이 저장되지 않아요. 마지막 저장은 11-18 14:20이에요." → `button-outline` "계속 고치기" · `button-primary` "나가기" |
| admin-rules/1440-request | 4장 |
| admin-rules/1440-waiting | 4장(요청 직후 `toast` 포함) |
| admin-rules/1440-cancel-request | 1440-waiting에서 "검수 요청 취소"를 누른 뒤 `modal`(560): "검수 요청을 취소할까요?" → "취소하면 다시 작성 중이 되고 편집할 수 있어요. 학생 화면은 그대로 2028-v2예요." → `button-outline` "닫기" · `button-primary` "요청 취소". 취소 뒤 `toast` "검수 요청을 취소했어요" |
| admin-rules/1440-review | 4장 |
| admin-rules/1440-approve | 4장 |
| admin-rules/1440-approved | 승인 뒤 검수자 화면(관리자 B). V1 배지 `judge-badge` 안정 쌍 ● "검수 완료", 캡션 "2028-v3 · 작성 관리자 A · 검수 관리자 B · 11-18 15:20 승인". V2 띠 "검수 완료됐어요 · 배포 파일에 넣기 전까지 학생 화면은 2028-v2예요". 비교 표 그대로. V5 아래 고정 줄은 캡션 "다음 배포 파일에 들어가요"만(주요 버튼 없음). 오른쪽 아래 `toast` "승인했어요 · 검수 완료" |
| admin-rules/1440-reject | 4장 |
| admin-rules/1440-returned | 반려 뒤 작성자(관리자 A)가 다시 연 편집기. 1440과 같고 머리 배지 `data-status-badge` "반려", E2 띠 아래 `warning-callout` tone=neutral: 제목 줄 "반려 사유 · 관리자 B · 11-18 15:10" + "2등급 점수 97이 모집요강 p.42 표와 같은지 다시 봐 주세요." 폼은 고칠 수 있어요(2등급 칸 `text-input-focused`). 아래 고정 줄 캡션 "고친 뒤 다시 검수를 요청해요" + "임시 저장" · `button-primary` "검수 요청"(켜짐) |
| admin-rules/1440-self | 4장 |
| admin-rules/1440-readonly | 관리자 B가 목록에서 가나대학교 2028-v3(작성 중, 작성 관리자 A)를 연 모습. E1 · E2 그대로, 폼 대신 "바뀐 항목 3" {typography.heading-3} + V4와 같은 비교 표 14행(바뀐 값 Bold). 아래 고정 줄 icon/info + "작성자(관리자 A)만 고칠 수 있어요. 검수 요청이 오면 검수에서 확인해요." 버튼 없음. 패널 테스트 3/3(편집 버튼 없음, "테스트 실행"만) |
| admin-rules/1440-verified | 자차대학교 학생부교과(교과우수) 2028-v2 열기(관리자 A). 머리 `judge-badge` 안정 쌍 ● "검수 완료" + 캡션 "2028-v2 · 작성 관리자 A · 검수 관리자 C · 11-12 승인". 띠 "검수 완료 규칙이에요 · 배포 파일에 넣으면 학생 화면 '대학별 환산'에 더해져요". 본문 "규칙 내용" `data-table` 2열(항목 200 / 값 568) 14행(1장 2028-v2 열 값). 아래 고정 줄 캡션 "고치려면 새 수정안을 만들어요. 이 버전은 그대로 남아요." + `button-outline` "새 수정안 만들기"(주요 버튼 없음). 누르면 2028-v3 편집기로 가고 `toast` "2028-v3 수정안을 만들었어요" |
| admin-rules/1440-version | 4장 |

---

## 7. 사용 컴포넌트

`sidebar`, `sidebar-group`, `sidebar-item`, `brand-logo`, `page-header`, `app-bar`, `sub-nav`, `tab-bar-pill`, `univ-card`, `univ-monogram`, `data-status-badge`, `judge-badge`, `data-table`, `text-input`, `text-input-focused`, `text-input-error`, `checkbox`, `segmented-control`, `segmented-control-active`, `filter-chip`, `button-primary`, `button-outline`, `button-pill-soft`, `button-danger-text`, `ai-label`, `trace-accordion`, `disclaimer-note`, `counsel-timeline`, `warning-callout`, `modal`, `bottom-sheet`, `toast`, `empty-state`

- 컴포넌트가 없는 요소의 연결: NEVER-1·잠금·안내 띠 → Level 1 회색 띠 + icon/info(또는 icon/lock), 설정 폼 → 그룹 제목 + `text-input`·`segmented-control`·`filter-chip` 행, 점수표 셀 편집 → `data-table` 안 `text-input`(높이 32), 아래 고정 줄 → 흰 바탕 + 위 1px hairline + 버튼, 관리자 규칙 카드(모바일) → `univ-card` 관리자 변형(하트·담기 버튼 없음, 배지 자리에 상태 배지), 화면 오류 줄 · 불러오는 중 → design.md `empty-state` 절의 규칙 그대로(일반 레이어).

## 8. 디자이너 메모

- 기본 프레임 admin-rules/390(390×844), admin-rules/1440(1440×900) + 6장 상태 프레임 36장.
- 레이어 이름 = 컴포넌트 이름(modal, bottom-sheet, toast, dropdown은 J6 그림자 검사가 이름을 봐요). 그림자는 이 넷에만. select 칸은 `text-input` 이름 + 설명 "variant=select", 반려 사유 칸은 `text-input` 이름 + 설명 "variant=multiline".
- 모서리 전부 0. 원형은 ● 배지 아이콘, `counsel-timeline` 마디 점만 ELLIPSE.
- 색은 rules colors 안에서만, Figma 변수 연결(`brand-logo`만 원본 색). 파란색 위치 체크: 선택된 사이드바 행 · sub-nav 선택 막대 · 세그먼트 선택 칸 · 켜진 필터 칩 · 탭바 선택 아이콘 · 선택된 타임라인 마디 · 링크("필터 모두 끄기"). 그 밖의 파란색은 없어야 해요.
- 초록(#137a3f/#e7f5ec)은 "검수 완료" 배지에만, 빨강(#b8232a/#fce9ea)은 오류 칸·불통과·오류 캡션 · `button-danger-text` 글자에만. 반려 사유 띠는 흑백(tone=neutral), 확인 창 실행 버튼은 잉크.
- 글꼴 Pretendard(없으면 IBM Plex Sans KR), 굵기 300/400/600/700, 자간 0. 숫자 고정폭.
- 이번 상세화 그리는 순서(Figma 호출 한도가 있어서 기본 프레임을 복제해 바뀌는 곳만 고쳐요, 한 번에 3~4장씩):
  1. 기본 2장 점검: 0-1절 1·3·4·11(`brand-logo` 124/92, `page-header`, 사이드바 4개 · 아이콘 · 로그아웃 아이콘, `sub-nav` 4탭, "목록으로" 버튼)만 고치고 레이아웃은 그대로.
  2. PC 목록 계열: 1440-list → 1440-list-empty → 1440-import-result → 1440-import-error → 1440-export-confirm → 1440-release-confirm.
  3. PC 편집 계열(1440 복제): 1440-new → 1440-saved → 1440-error → 1440-test-edit → 1440-test-delete → 1440-leave.
  4. PC 요청 · 대기: 1440-request → 1440-waiting → 1440-cancel-request.
  5. PC 검수 계열(1440-review 먼저 만들고 복제): 1440-review → 1440-approve → 1440-approved → 1440-reject → 1440-self → 1440-readonly → 1440-returned → 1440-verified → 1440-version.
  6. 모바일(390 복제): 390-loading → 390-empty → 390-editor-tab → 390-rule-detail → 390-review → 390-review-trace → 390-approve → 390-approved → 390-reject → 390-reject-error → 390-rejected → 390-self.
  7. 다 그린 뒤 05-build.json "states"에 36장 노드 id를 적어요.

## 9. design.md 수정 제안 (새 컴포넌트는 만들지 않았어요)

이전 제안 중 반영된 것: 1(검수 완료 = 안정 쌍, Semantic 줄) · 3(비활성 `button-primary`) · 4 앞부분(multiline) · 6(관리자 탭바 · `mode-switch` 없음) · 7(모바일 좌우 20 = {spacing.card}). 남은 제안:

1. 테스트 불통과 배지: 위험 쌍 ■ "불통과"를 썼어요(입력 오류 = 위험 쌍 규칙의 확장, 앱도 같음). Semantic "입력 오류" 줄에 "환산 규칙 테스트 불통과 배지 포함"을 한 줄 넣어 주세요.
2. 표 안 편집 셀(`data-table` 셀 안 `text-input` 높이 32)이 정의돼 있지 않아요. data-table 변형으로 적어 주세요(상태 프레임은 `text-input` size sm 모양을 높이 32로 줄여 그려요).
3. `univ-card` 관리자 변형(하트·"수시로에 담기" 없음, 배지 자리에 상태 배지)을 허용한다고 적어 주세요.
4. Level 1 안내 띠(아이콘 + 한 줄, 선 없음)가 관리자 화면마다 쓰이는데 이름이 없어요. `warning-callout` 변형 tone=neutral에 "버튼 없는 화면 머리 띠"로 포함한다고 적어 주세요(상태 프레임은 지금처럼 일반 레이어로 그려요).
5. `empty-state`는 "button-primary 하나"인데, 모바일 관리자 화면처럼 할 일이 없는 보기 전용 빈 상태(390-empty)는 버튼을 빼도 된다고 적어 주세요(대체안: 버튼 없이 그려요).
