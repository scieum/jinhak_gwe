# 02-spec — 성적 추이 (score-trend)

대상: 학생(모바일 중심 + PC). 내신 학기별 평균 등급 추이 + 모의고사 회차별 영역 등급 추이 + 목표 대학 수능 최저 충족 현황.
위치: 학생 대분류 "성적" › 소분류 "성적 추이"(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사). 소분류 화면이라 뒤로가기 없음.
기준: 01-research.md(P1~P7), docs/prd.md 6-12 "내 성적 추이", work/_ref/schs_lms-homeroom.md 2-12·3(c)·3(d), docs/design.md(최신: U:NAVI, `brand-logo`, `sub-nav` · `sidebar-group` · `page-header`, 수능 최저 판정 배지 ▲·✕, 확인 창 규칙, `toast`, 화면 오류 줄 · 불러오는 중 · `empty-state`).
수치는 모두 가상이에요. 대학 기준도 시안용 예시 값이라 대학마다 `data-status-badge`로 출처를 밝혀요.

> 개정 2026-11-24(상세화): 서비스 이름 U:NAVI와 최신 design.md에 맞춰 기본 프레임을 바로잡고(0-1), 상태 프레임 33장을 더했어요(3장). 앱 구현(app/src/screens/Results.tsx StudentDataScreen · components/ScoreTrendContent.tsx · MockTrend.tsx · Modal)의 불러오는 중 · 저장소 오류 · 빈 상태 · 등급 범위 · 순서 미확인 · 최저 현황 모달을 모두 옮기고, 앱에 없는 안전장치(저장하지 않고 닫기 확인 창 · 저장 완료 `toast`)를 더했어요.

사용 컴포넌트: `app-bar` `sub-nav` `segmented-control` `segmented-control-active` `grade-trend-chart` `data-table` `judge-badge` `univ-logo` `univ-monogram` `data-status-badge` `trace-accordion` `disclaimer-note` `tab-bar-pill` `sidebar` `sidebar-group` `sidebar-item` `brand-logo` `page-header` `mode-switch` `stat-tile` `button-pill-soft` `button-outline` `button-primary` `empty-state` `bottom-sheet` `modal` `toast` `text-input`

---

## 0-1. 최신 design.md 맞춤 (2026-11-24, 승인 레이아웃은 그대로)

| # | 바로잡을 곳 | 이전 | 지금 |
|---|---|---|---|
| U1 | 서비스 이름 · 로고 | 워드마크 글자 "진학 내비" | U:NAVI. PC `sidebar` 맨 위 `brand-logo` 폭 124(원본 비율 1273:297, 팔레트 예외). 글자 워드마크를 따로 만들지 않아요. 모바일은 소분류 화면이라 `brand-logo` 없이 `app-bar` 제목만 |
| U2 | 모바일 머리 | `app-bar` "내 성적 추이" + 왼쪽 뒤로 | `app-bar` 제목 "성적 추이"(앱 메뉴 이름과 같게), 왼쪽 뒤로 없음, 오른쪽 "목표 대학" 링크 그대로. 바로 아래 `sub-nav`(y 56~100): 성적 입력 · **성적 추이** · 5 to 9 · 대학별 환산 · 모의고사. 그 아래 요소는 모두 44 내려가요(1장 좌표는 새 값) |
| U3 | 하단 탭바 | 홈 · 성적 · 될각 · 수시로 · 메뉴 | `tab-bar-pill` 홈 · 성적 · 대학 찾기 · 수시 전략 · 더보기, 성적 선택 |
| U4 | PC 사이드바 메뉴 | 그룹 "학생" + 9개 행 | `sidebar-group` 홈 / 성적(펼침) / 대학 찾기 / 수시 전략. 성적 아래 `sidebar-item` 5개: 성적 입력 · **성적 추이**(icon/trending-up, 선택) · 5 to 9 · 대학별 환산(icon/arrow-up-down) · 모의고사(icon/check). 나머지 아이콘은 지금 Figma 그대로 |
| U5 | PC 머리 | 상단 바 64 + heading-4 | `page-header`: 위 여백 32 → 경로 "성적 › 성적 추이" {typography.caption} {colors.text-muted} → 제목 "성적 추이" {typography.heading-1}. 오른쪽 `data-status-badge` "데이터 기준일 2026-11-18" + `button-outline` "성적 입력·수정"(앱에 있는 화면 동작) + `mode-switch`(학생) + icon/lock. 아래 여백 24 |
| U6 | 수능 최저 배지 아이콘 | 근접 ◐ · 미충족 ■ | 근접 = 적정 쌍 ▲(속이 찬 세모) · 미충족 = 위험 쌍 ✕. 충족 ● · 자료 부족/판정 불가(이름만) 그대로 |
| U7 | 검수 전 기준 | 강원대 "교사 입력 · 미검수"로 미충족 판정 | 학생 화면은 검수 전 기준을 판정하지 않아요(design.md 수능 최저 판정 배지). 강원대 행 = `data-status-badge` "준비 중" + "기준 검수 전이라 판정하지 않았어요", 숫자 · `judge-badge` 없음 |
| U8 | PC 숫자 타일 | 같은 무게 `stat-tile` 4개 | 목록을 거르지 않는 타일을 3개 이상 늘어놓지 않아요 → 같은 띠(y 96~192) 안에 `stat-tile` 변형 hero 1개("최근 모의고사 평균") + 오른쪽 보조 숫자 한 줄(라벨 · 값 3쌍). 2-3 참고 |
| U9 | 차트 눈금 | 1~9 / 1~5 전체 | `grade-trend-chart` 기본 = 보이는 계열 범위 ±0.5로 좁힌 보기(모의고사 1~4.5, 내신 1~3.5), 차트 머리 오른쪽 `button-pill-soft` "전체 눈금"(꺼짐). 켠 모양은 390-full-scale. 승인 프레임이 1~9로 그려져 있으면 그 모양을 390-full-scale로 옮겨요 |
| U10 | 오류 · 빈 · 불러오는 중 | "데이터 부족" 표 3줄 | design.md 그대로: 화면 오류 줄(icon/triangle-alert 20 {colors.ink} + {typography.body} + `button-outline` 하나, 판정 색 없음) · 불러오는 중 한 줄({typography.body-sm} {colors.text-muted}, 스켈레톤 없음) · `empty-state`(주요 버튼 하나) |
| U11 | 쓰지 않는 것 | — | 일정 종류 색 · `promo-banner` · `mascot-illustration` · `checkbox`(하나만 고르는 목록뿐) · 등급 색(grade-1~9). 고르기 칸은 `text-input` 변형 select만 써요 |

---

## 0. 공통 데이터 (모든 프레임 같은 값)

모의고사(2026, 공통과목, 등급 1~9, 평균 = 국·수·영·탐 4개 평균 소수 1자리)

| 회차 | 국어 | 수학 | 영어 | 탐구 | 평균 |
|---|---|---|---|---|---|
| 3월 | 3 | 4 | 2 | 3 | 3.0 |
| 6월 | 3 | 3 | 2 | 3 | 2.8 |
| 9월 | 2 | 3 | 2 | 3 | 2.5 |
| 10월 | 2 | 3 | 1 | 2 | 2.0 |

한국사(10월) 3등급 — 차트에는 넣지 않고 최저 판정에만 써요.

내신(5등급제, 전 교과 평균은 따로 저장된 값)

| 학기 | 전 교과 | 국어 | 수학 | 영어 | 사회 | 과학 |
|---|---|---|---|---|---|---|
| 1-1 | 2.4 | 2 | 3 | 2 | 2 | 3 |
| 1-2 | 2.2 | 2 | 3 | 2 | 2 | 2 |
| 2-1 | 2.1 | 2 | 2 | 2 | 2 | 3 |

목표 대학 최저 현황(10월 모의고사 기준, 기준 값은 시안용 예시)

| 순위 | 대학 · 모집단위 | 기준 요약 | 지금 값 / 기준 값 | 판정 | 필요한 것 한 줄 | 출처 배지 |
|---|---|---|---|---|---|---|
| 1 | 경희대학교 경영학과 | 국·수·영·탐 중 2개 합 3 이내 (수학 포함) | 등급 합 4 / 기준 3 | 근접 ▲ | 수학 1등급만 올리면 충족해요 | 모집요강 반영 |
| 2 | 성균관대학교 사회과학계열 | 국·수·영·탐 중 3개 합 6 이내 · 한국사 4 이내 | 등급 합 5 / 기준 6 | 충족 ● | 지금 성적으로 충족해요. 이 등급을 지키면 돼요 | 모집요강 반영 |
| 3 | 강원대학교 경영학과 | (보여 주지 않음) | — | 판정하지 않음 | 기준 검수 전이라 판정하지 않았어요 | 준비 중 |

판정 배지 매핑(design.md 수능 최저 판정 배지): 충족 = 안정 쌍 ● / 근접 = 적정 쌍 ▲ / 미충족 = 위험 쌍 ✕ / 자료 부족·판정 불가 = 판정 없음 쌍(아이콘 없음, 이름만). 배지는 늘 색 + 아이콘 + 이름 3개를 함께 써요. 미충족 ✕ 예시는 상태 프레임 390-row-states에서 보여요.
로고: 경희대학교·성균관대학교 = `univ-logo`(디자인 시스템에 SVG 있음), 강원대학교 = `univ-monogram` "강"(로고 파일 없음).

---

## 1. 모바일 390 × 844 (프레임 이름 score-trend/390)

좌우 여백 20(spacing.card), 콘텐츠 폭 350. 위에서 아래로. 프레임 높이 844 안에 1~8번과 9번 첫 행 윗부분까지 보이고, 나머지는 스크롤 아래(프레임 밖, 잘림)예요. 스크롤 아래는 상태 프레임 390-scrolled로 보여요.

1. 상단 앱바 — `app-bar` (y 0~56)
   - 왼쪽 비움(소분류 화면), 가운데 "성적 추이"(heading-4), 오른쪽 보조 동작 "목표 대학"(link 글자) → 누르면 `bottom-sheet` 목표 대학 정하기(390-target-sheet).

2. 소분류 탭 — `sub-nav` (y 56~100)
   - 성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사. 성적 추이 선택(잉크 SemiBold + 아래 2px Route Blue 막대). 넘치면 가로 스크롤, 오른쪽 끝 잘린 탭이 보이게.

3. 성적 종류 전환 — `segmented-control` (y 108~152, 높이 44)
   - 선택지: 내신 · 모의고사. 이번 프레임은 모의고사가 `segmented-control-active`(accent-soft 채움 + 아래 2px Route Blue 막대 + 잉크 글자). 내신을 고른 모양은 390-school.

4. 요약 문장 (y 168~232)
   - body 2줄(규칙으로 만든 문장): "최근 4회 평균 등급 범위는 2.0~3.0이에요. 3월보다 1.0등급 좋아졌어요."
   - 아래 caption text-muted: "2026년 3월~10월 모의고사 · 1등급이 위예요"

5. 영역 전환 — `segmented-control` (y 244~288, 높이 44, 칸 5개 각 70)
   - 선택지: 평균 · 국어 · 수학 · 영어 · 탐구. 이번 프레임은 평균이 `segmented-control-active`.
   - 내신 탭일 때는 전 교과 · 국어 · 수학 · 영어 · 사회 · 과학(칸 6개).

6. 추이 차트 — `grade-trend-chart` (y 300~480, 350 × 180)
   - 차트 머리 오른쪽 `button-pill-soft` "전체 눈금"(꺼짐, U9). 세로축 좁힌 보기 1~4.5(1이 위), 눈금 숫자 caption. 가로축 3월 · 6월 · 9월 · 10월 caption.
   - 선택 계열(평균)만 2px Route Blue 선 + 점. 나머지 4계열(국어·수학·영어·탐구)은 1px text-faint 선 + 선 끝 이름표 caption text-muted("국어" 등). 계열을 색으로 구분하지 않아요.
   - 가장 최근 점(10월 2.0)에 값 라벨 "2.0" — numeric 굵게, Route Blue(이 화면의 핵심 숫자 1개).
   - 기준선: 3월 평균 3.0 위치에 1px hairline 점선 + caption "3월 3.0".
   - 대체 텍스트: "모의고사 평균 등급, 3월 3.0, 6월 2.8, 9월 2.5, 10월 2.0. 1등급이 위예요."

7. 값 표 — `data-table` (y 496~652, 머리 28 + 4행 × 32) + 아래 링크 한 줄
   - 열: 회차 | 국어 | 수학 | 영어 | 탐구 | 평균(숫자 열 오른쪽 정렬, 고정폭 숫자). 0번 모의고사 표 값 그대로.
   - 10월 행 = 내 최신 행, accent-soft 채움. 등급 숫자에는 색을 입히지 않아요.
   - 행을 누르면 그 회차 원점수가 펼쳐져요(`data-table` 변형 expand, 390-table-expand). 행 오른쪽 끝 ▾.
   - 표 아래 link 한 줄 "모의고사 성적 입력·수정 ›"(앱에 있는 동작).

8. 섹션 머리 (y 684~708)
   - "목표 대학 최저 현황"(heading-4) + 오른쪽 caption text-muted "10월 모의고사 기준".

9. 최저 현황 목록 (y 720부터, 행마다 높이 약 88, 행 사이 1px hairline)
   - 행 구성: 왼쪽 `univ-logo` 32 × 32(강원대학교는 `univ-monogram`) → 가운데 "1순위 · 경희대학교 경영학과"(title, 두 줄까지 흘림) + 기준 요약(caption text-muted) + 필요한 것 한 줄(body-sm) → 오른쪽 위 "4"(numeric 잉크) + " / 기준 3"(body-sm text-muted), 그 아래 `judge-badge` "▲ 근접"(적정 쌍).
   - 기준 요약 줄 끝에 `data-status-badge`("모집요강 반영" 또는 "준비 중").
   - 행을 누르면 행 상세 `bottom-sheet`(390-row-sheet).
   - 1순위 행 윗부분이 첫 화면에 보이고, 2·3순위는 스크롤 아래. 정렬: 목표 순위 순(1→3).

10. 산출 근거 (스크롤 아래) — `trace-accordion`, 접힘
    - 제목 "어떻게 계산했나요?" + icon/chevron-down. 펼친 모양은 390-trace-open(내용은 PC 3-3과 같아요).

11. 고지 (스크롤 아래) — `disclaimer-note`
    - "대학 공식 모집요강이 최종 기준이에요 · 충족 현황은 모의고사 등급으로 본 참고 정보예요 · 모의고사 등급은 성적 통지표가 최종 기준이에요 · 데이터 기준일 2026-11-18"
    - 아래 여백은 탭바에 가리지 않게 96.

12. 하단 탭바 — `tab-bar-pill` (y 764~828, 좌우 16 띄움, 높이 64, 화면 위에 고정)
    - 홈 · 성적 · 대학 찾기 · 수시 전략 · 더보기. 성적 탭 선택(Route Blue 아이콘 + 잉크 SemiBold 글자).

모바일 Route Blue 쓰임: `sub-nav` 선택 막대, 선택 세그먼트 2곳, 차트 선택 계열 선, 최신 값 라벨 "2.0"(숫자 1개), 10월 행 옅은 채움, 탭바 선택 아이콘, 앱바 · 표 아래 링크. 판정 배지 안에는 쓰지 않아요.

---

## 2. PC 1440 × 900 (프레임 이름 score-trend/1440)

왼쪽 사이드바 248 + 본문(좌우 패딩 32) + 오른쪽 보조 패널 360. 본문 폭 768(x 280~1048), 보조 패널 x 1080~1440. 앱 셸 안 바탕 {colors.canvas-soft}(Page), 카드 · 패널은 흰 바탕.

2-1. 사이드바 — `sidebar` (x 0~248, 전체 높이, {colors.canvas} + 오른쪽 1px hairline-soft)
   - 위 `brand-logo` 폭 124.
   - `sidebar-group` 4개: 홈 / 성적(펼침) / 대학 찾기 / 수시 전략. 성적 아래 `sidebar-item` 5개(U4). "성적 추이" 선택(accent-soft 채움 + 왼쪽 3px Route Blue 막대 + 잉크 글자).
   - 맨 아래 caption "데이터 기준일 2026-11-18" + `button-pill-soft` "백업".

2-2. 머리 — `page-header` (x 280~1408, 위 여백 32, U5)
   - 왼쪽 경로 "성적 › 성적 추이" → 제목 "성적 추이".
   - 오른쪽 `data-status-badge` "데이터 기준일 2026-11-18" + `button-outline` "성적 입력·수정" + `mode-switch`(학생 · 교사, 학생 선택) + icon/lock.

2-3. 숫자 줄 (본문 맨 위 띠, 높이 96, U8)
   - 왼쪽 `stat-tile` 변형 hero(카드 없이 Page 위): 라벨 "최근 모의고사 평균" → 값 "2.0등급"(display, Route Blue — 이 화면의 핵심 숫자) → 해석 "10월 · 최근 4회 중 가장 좋아요"(body ink).
   - 오른쪽 보조 숫자 한 줄(라벨 caption text-muted · 값 numeric ink, 쌍 사이 24): "모의고사 평균 범위 2.0~3.0" · "최근 내신 평균 2.1등급(2학년 1학기 · 5등급제)" · "목표 대학 최저 ● 충족 1 · ▲ 근접 1"(판정 아이콘 + 판정 글자색, stat-tile 판정 라벨 규칙). 그 아래 caption "검수 전이라 판정하지 않은 전형 1개".

2-4. 요약 문장 (숫자 줄 아래 16)
   - body-lg(Light 300): "모의고사는 최근 4회 평균 범위 2.0~3.0, 내신은 3학기 전 교과 평균 범위 2.1~2.4예요. 둘 다 처음보다 좋아졌어요."

2-5. 추이 카드 2개 나란히 (각 372 폭, 사이 24, 흰 카드, 패딩 24 → 안쪽 폭 324, 900 아래로 잘려도 돼요)

   왼쪽 카드: 내신 추이
   - 머리: "내신 학기별 평균 등급"(heading-3) + caption "3학기 · 5등급제 · 1등급이 위예요" + 오른쪽 `button-pill-soft` "전체 눈금".
   - `segmented-control`: 전 교과 · 국어 · 수학 · 영어 · 사회 · 과학(칸 6개 각 54, 높이 40). 전 교과가 `segmented-control-active`.
   - `grade-trend-chart` 324 × 220: 세로축 좁힌 보기 1~3.5(1이 위), 가로축 1-1 · 1-2 · 2-1. 선택 계열(전 교과) 2px Route Blue 선 + 점, 나머지 5계열 1px text-faint 선 + 선 끝 이름표. 최신 점 값 라벨 "2.1"(numeric 잉크). 기준선 1-1 전 교과 2.4 점선 + caption "1-1 2.4".
   - 대체 텍스트: "내신 전 교과 평균 등급, 1학년 1학기 2.4, 1학년 2학기 2.2, 2학년 1학기 2.1."
   - `data-table`: 학기 | 전 교과 | 국 | 수 | 영 | 사 | 과, 3행. 2-1 행 accent-soft 채움.

   오른쪽 카드: 모의고사 추이
   - 머리: "모의고사 영역별 등급"(heading-3) + caption "2026년 3월~10월 · 1등급이 위예요" + 오른쪽 `button-pill-soft` "전체 눈금".
   - `segmented-control`: 평균 · 국어 · 수학 · 영어 · 탐구(칸 5개, 높이 40). 평균이 `segmented-control-active`.
   - `grade-trend-chart` 324 × 220: 세로축 좁힌 보기 1~4.5, 가로축 3월 · 6월 · 9월 · 10월. 모바일 6번과 같은 규칙. 최신 점 값 라벨 "2.0"(numeric 잉크 — PC의 Route Blue 숫자는 hero 1개로 둬요).
   - `data-table`(변형 expand): 회차 | 국 | 수 | 영 | 탐 | 평균, 4행. 10월 행 accent-soft 채움. 표 아래 link "모의고사 성적 입력·수정 ›".

2-6. 오른쪽 보조 패널 (x 1080~1440, 머리 아래부터 끝까지, 흰 바탕 + 왼쪽 1px hairline, 패딩 24 → 안쪽 폭 312)

   3-1. 머리
   - "목표 대학 최저 현황"(heading-3) + caption "10월 모의고사 기준" + 오른쪽 `button-pill-soft` "목표 대학 바꾸기" → `modal`(1440-target-modal).

   3-2. 최저 현황 목록 (3행, 행마다 약 104, 행 사이 1px hairline)
   - 행 구성은 모바일 9번과 같아요: `univ-logo`/`univ-monogram` 32 → 순위 · 대학 · 모집단위(title) + 기준 요약(caption) + `data-status-badge` → "지금 값 / 기준 값"(numeric 잉크 + body-sm text-muted) + `judge-badge` → 필요한 것 한 줄(body-sm).
   - 3순위 강원대 = U7(준비 중, 숫자 · 배지 없음).
   - 1순위 행은 선택 상태(1px 잉크 안쪽 테두리) — 아래 산출 근거가 이 행을 설명해요. 다른 행을 고른 모양은 1440-row-skku.

   3-3. 산출 근거 — `trace-accordion`, 1순위 펼침
   - 제목 "어떻게 계산했나요? · 경희대학교"
   - 단계 줄(단계 이름 body-sm text-muted → 값 table 고정폭):
     1. 기준 시험 → 2026 10월 모의고사
     2. 반영 영역 → 국·수·영·탐 중 2개, 수학 포함
     3. 고른 영역 → 수학 3 + 영어 1 (수학은 꼭 넣고, 나머지는 가장 좋은 등급)
     4. 등급 합 → 4
     5. 기준 → 3 이내
     6. 판정 규칙 → 한 영역만 1등급 올려서 기준 안에 들면 근접
   - 마지막 줄(위 1px hairline, 굵게): "▲ 근접 — 수학 1등급만 올리면 충족해요"

   3-4. 고지 — `disclaimer-note` (패널 맨 아래)
   - 모바일 11번과 같은 문구.

PC Route Blue 쓰임: 사이드바 선택 막대, 세그먼트 선택 2곳, 두 차트의 선택 계열 선, 최신 행 옅은 채움, hero 값 "2.0등급"(숫자 1개), 표 아래 링크. 판정 배지 · 패널 안 숫자에는 쓰지 않아요.

---

## 3. 상태 프레임 (03-draft.json `states`에만 적고 `frames`에는 넣지 않아요)

모두 390×844 또는 1440×900. 앱 근거: [앱] = 앱에 있는 상태(파일 이름), [안전] = 앱에 없는 안전장치(앱에 더할 것), [시안] = 승인 시안의 동작을 펼쳐 그린 것. 셸(`app-bar` · `sub-nav` · `tab-bar-pill` / `sidebar` · `page-header`)과 0번 데이터는 기본 프레임과 같고, 다른 곳만 적어요. 겹친 레이어(`bottom-sheet` · `modal`) 뒤는 {colors.scrim}, 그림자는 `bottom-sheet` · `modal` · `toast` · 떠 있는 목록에만.

빈 상태가 한 화면에 둘 이상이면 `button-primary`는 첫 번째 빈 상태에만 두고, 나머지는 link 한 줄로 둬요(주요 버튼 하나).

### A. 불러오기 · 오류 (4장)

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| score-trend/390-loading | 390×844 | [앱 StudentDataScreen] 셸(`app-bar` · `sub-nav` · `tab-bar-pill`)만 있고, 3번 자리에 한 줄 "기기에 저장된 성적을 읽고 있어요." {typography.body-sm} {colors.text-muted}. 세그먼트 · 차트 · 목록 없음, 스켈레톤 없음 |
| score-trend/1440-loading | 1440×900 | 셸 + `page-header`, 숫자 줄 자리에 같은 한 줄. 오른쪽 보조 패널은 머리(3-1)만 두고 목록 자리에 같은 한 줄 |
| score-trend/390-storage-error | 390×844 | [앱 role=alert] 3번 자리에 화면 오류 줄(흰 카드): icon/triangle-alert 20 {colors.ink} + "이 브라우저에서 기기 저장소를 열 수 없어요. 저장 권한과 비공개 모드를 확인해 주세요." {typography.body} + `button-outline` "다시 불러오기". 판정 색 없음. 아래는 비움 |
| score-trend/1440-storage-error | 1440×900 | 같은 오류 줄을 본문 맨 위 흰 카드로. 보조 패널은 머리만 두고 목록 자리 비움. `page-header`의 "성적 입력·수정"은 그대로 |

### B. 성적 보기 · 빈 상태 · 데이터 상태 (13장)

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| score-trend/390-school | 390×844 | [시안] 3번 세그먼트 = 내신 선택. 요약 "최근 3학기 전 교과 평균 범위는 2.1~2.4예요. 1학년 1학기보다 0.3등급 좋아졌어요." + caption "1학년 1학기~2학년 1학기 · 5등급제 · 1등급이 위예요" → 영역 세그먼트 6칸(각 58, 전 교과 선택) → 차트 1~3.5, 가로축 1-1 · 1-2 · 2-1, 최신 값 라벨 "2.1" Route Blue → `data-table` 학기 | 전 교과 | 국 | 수 | 영 | 사 | 과(2-1 행 accent-soft) → 표 아래 link "내신 성적 입력·수정 ›". 8번 이하 같음 |
| score-trend/390-table-expand | 390×844 | [시안 + 앱 원점수 열] 7번 표에서 6월 행을 누른 상태(`data-table` 변형 expand): 6월 행 끝 ▴, 아래 {colors.canvas-soft} 영역 안 작은 표 영역 | 원점수 | 예상 등급(국어 78/100 · 3, 수학 70/100 · 3, 영어 84/100 · 2, 탐구 41/50 · 3). 펼친 행은 accent-soft 없음. 화면을 표가 위로 오게 스크롤한 상태 |
| score-trend/390-full-scale | 390×844 | [시안 U9] 6번 차트 머리 `button-pill-soft` "전체 눈금"을 켠 상태(on 모양 = 잉크 글자 SemiBold + ✓). 세로축 1~9 전체, 선 · 점 위치만 바뀌고 나머지 같음 |
| score-trend/390-empty-all | 390×844 | [앱 MockTrend 빈 상태] 성적이 하나도 없음, 모의고사 탭. 4~7번 자리에 `empty-state`: 흑백 선 icon/chart-column → "아직 입력한 모의고사 성적이 없어요" {typography.heading-4} → "원점수를 입력하면 회차별 흐름을 선으로 보여 드려요." {typography.body-sm} → `button-primary` "모의고사 성적 입력". 8번 섹션 머리 아래 "모의고사 성적을 넣으면 목표 대학 최저 현황을 볼 수 있어요." {typography.body-sm} {colors.text-muted}(버튼 없음) |
| score-trend/1440-empty-all | 1440×900 | 숫자 줄 hero 값 "—" + 해석 "성적 입력 전이에요", 보조 숫자도 "—". 내신 카드 = `empty-state`(icon/chart-column → "평균을 낼 수 있는 내신 성적이 없어요" → "과목과 등급을 입력하면 학기별 추이를 볼 수 있어요." → `button-primary` "내신 성적 입력"), 모의고사 카드 = 같은 모양이되 버튼 대신 link "모의고사 성적 입력 ›". 보조 패널 목록 자리에 390-empty-all과 같은 한 줄 |
| score-trend/390-school-empty | 390×844 | [앱 ScoreTrendContent 빈 상태] 내신 탭 선택, 내신 없음(모의고사는 있음): 4~7번 자리에 `empty-state` "평균을 낼 수 있는 내신 성적이 없어요" → "과목과 등급을 입력하면 학기별 추이를 볼 수 있어요." → `button-primary` "내신 성적 입력". 8번 이하(모의고사 기준 최저 현황)는 그대로 |
| score-trend/390-mock-one | 390×844 | [앱 회차 1개] 모의고사 3월 1회만: 요약 "모의고사가 한 번 있어요. 3월 평균은 3.0등급이에요." → 차트 가로 가운데 점 하나(평균, Route Blue, 값 라벨 "3.0"), 선 없음, 다른 계열은 점만 text-faint + 이름표 → 차트 아래 caption "한 번뿐이라 선으로 잇지 않았어요. 다음 회차를 넣으면 흐름이 보여요." {colors.text-muted}. 기준선 없음. 표 1행 |
| score-trend/390-area-pending | 390×844 | [앱 "표시할 등급이 없어요", NEVER-1] 영역 = 탐구 선택, 탐구 등급컷이 검수 전: 차트 자리에 `data-status-badge` "준비 중" + 한 줄 "탐구의 표시할 등급이 없어요. 검수된 등급컷이 등록되면 추이를 보여 드려요." {typography.body-sm}. 표 탐구 열은 원점수 "41/50" + 등급 칸 "준비 중"(배지), 평균 열 "—"(검수 전 등급이 섞이면 평균을 내지 않아요). 요약 문장은 "탐구 등급은 검수 전이라 아직 보여 드리지 않아요." |
| score-trend/1440-area-pending | 1440×900 | PC 모의고사 카드에서 탐구 선택, 같은 내용. hero는 "최근 모의고사 평균" 대신 "—" + 해석 "탐구 등급이 준비 중이라 평균을 내지 않았어요". 내신 카드 · 패널 그대로 |
| score-trend/390-grade-range | 390×844 | [앱 예상 등급 범위] 영역 = 수학 선택, 6월 수학 예상 등급이 "2~3등급" 범위: 6월에는 점을 찍지 않고 3월 점과 9월 점을 잇지 않아요(9월~10월만 선). 차트 아래 caption "6월은 예상 등급이 2~3등급 범위라 점으로 찍지 않았어요. 표에서 볼 수 있어요." {colors.text-muted}. 표 6월 수학 칸 "2~3", 6월 평균 "—". 범위를 그리는 모양은 9장 제안 1 |
| score-trend/1440-grade-range | 1440×900 | PC 모의고사 카드에서 수학 선택, 같은 규칙. 보조 패널 · 내신 카드 그대로 |
| score-trend/390-order-unknown | 390×844 | [앱 "순서 미확인"] 등록된 시험 목록 밖의 기록이 1개 있음: 표 맨 아래 행 "순서 미확인"(회차 칸) + 값, 행 아래 caption "시험 목록 밖의 기록 1개는 차트에 넣지 않았어요. 성적 입력에서 시험을 다시 골라 주세요." 차트는 4회 그대로. 표가 보이게 스크롤한 상태 |
| score-trend/390-scrolled | 390×844 | [시안] 기본 프레임을 아래로 스크롤: 9번 목록 1~3순위 전체(3순위 강원대 = `univ-monogram` "강" + `data-status-badge` "준비 중" + "기준 검수 전이라 판정하지 않았어요", 숫자 · 배지 없음) → 10번 `trace-accordion` 접힘 → 11번 `disclaimer-note` → 탭바 |

### C. 최저 현황 행 · 산출 근거 (7장)

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| score-trend/390-trace-open | 390×844 | [시안] 390-scrolled에서 `trace-accordion` 펼침: 1순위 경희대 단계 줄 6개(PC 3-3과 같음) + 마지막 줄 "▲ 근접 — 수학 1등급만 올리면 충족해요". 제목 옆 icon/chevron-up |
| score-trend/390-row-sheet | 390×844 | [앱 최저 현황 모달의 링크] 2순위 성균관대 행을 누른 `bottom-sheet`(높이 약 75%): 머리 `univ-logo` 32 + "2순위 · 성균관대학교 사회과학계열" {typography.heading-4} → `judge-badge` "● 충족" + "등급 합 5 / 기준 6" → 기준 원문 한 줄 + `data-status-badge` "모집요강 반영" → `trace-accordion` 펼침(기준 시험 10월 · 반영 영역 3개 + 한국사 · 고른 영역 국2 + 영1 + 탐2 · 등급 합 5 · 기준 6 이내 · 한국사 3 / 4 이내) → link 두 줄 "등록한 모집요강 열기 ↗" · "지원 자격 확인표 열기 ›" → `button-outline` "닫기" |
| score-trend/1440-row-skku | 1440×900 | [시안] 보조 패널에서 2순위 행을 고른 상태(1px 잉크 안쪽 테두리가 2순위로), 3-3 근거가 성균관대 내용으로 바뀜(390-row-sheet와 같은 단계) + 근거 아래 link 두 줄 "등록한 모집요강 열기 ↗" · "지원 자격 확인표 열기 ›" |
| score-trend/390-row-states | 390×844 | [시안 판정 행 상태] 목록 행 3개를 다른 데이터로 보여 줘요(예시 대학 바꿈): ① 미충족 — `judge-badge` "✕ 미충족"(위험 쌍) + "등급 합 7 / 기준 5" + "국어·수학 등급 합을 2 줄여야 해요" ② 자료 부족 — 판정 없음 쌍 "자료 부족"(아이콘 없음) + "한국사 성적이 없어요. 다음 모의고사 뒤에 다시 볼게요" ③ 판정 불가 — 판정 없음 쌍 "판정 불가" + "이 전형은 최저 기준이 아직 없어요. 담임 선생님께 알려 주세요". 숫자 칸은 ②③ "—" |
| score-trend/1440-row-states | 1440×900 | 보조 패널 목록에 같은 3행. 고른 행(①)의 근거 마지막 줄 "✕ 미충족 — 국어·수학 등급 합을 2 줄여야 해요". 2-3 보조 숫자는 "● 충족 0 · ✕ 미충족 1 · 자료 부족 1" |
| score-trend/390-target-empty | 390×844 | [앱 "등록한 목표 대학이 없어요"] 목표 대학 0개, 스크롤해 8번이 보이는 상태: 섹션 머리 아래 `empty-state` 흑백 선 icon/chart-column → "목표 대학을 정하면 최저 현황을 볼 수 있어요" → "지원 준비에 등록한 대학 중 1~3순위까지 정할 수 있어요." → `button-primary` "목표 대학 정하기". `trace-accordion` 없음, `disclaimer-note` 그대로 |
| score-trend/1440-target-empty | 1440×900 | 보조 패널 목록 자리에 같은 `empty-state`, 3-1 "목표 대학 바꾸기" 버튼은 숨겨요(빈 상태 버튼 하나). 근거 아코디언 없음. 2-3 보조 숫자 "목표 대학 최저 —" |

### D. 목표 대학 정하기 (9장)

앱은 "목표 대학 최저 현황" `modal` 안에 지원 준비 대학 목록과 "지원할 대학·전형 관리" 버튼만 있어요. 시안은 승인된 대로 1~3순위를 정하는 시트 · 모달로 그리고, 앱 모달의 내용(지원 준비 목록 · 관리 링크)을 그 안에 넣어요.

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| score-trend/390-target-sheet | 390×844 | [시안 + 앱 Modal] 앱바 "목표 대학"을 누른 `bottom-sheet`(높이 약 75%): 손잡이 → "목표 대학 정하기" {typography.heading-4} → caption "지원 준비에 등록한 전형 중에서 골라요" → `text-input` 변형 select 3칸(size=md, 라벨 "1순위" · "2순위" · "3순위(선택)", 값 "경희대학교 경영학과 · 학생부교과" 등, 넘치면 말줄임) → link "지원할 대학·전형 관리 ›"(원서·서류 체크리스트로) → 아래 고정 줄 `button-outline` "취소" + `button-primary` "저장" |
| score-trend/1440-target-modal | 1440×900 | 보조 패널 "목표 대학 바꾸기"를 누른 `modal`(560): 같은 내용, select size=sm, 버튼 오른쪽 정렬. 머리 오른쪽 닫기 ✕ |
| score-trend/390-target-pick-sheet | 390×844 | 3순위 select를 누른 `bottom-sheet` 단일 선택 목록(행 56): `univ-logo` 20 + "강원대학교 경영학과" {typography.title} + "학생부교과 · 2028학년도" {typography.body-sm} {colors.text-muted}. 지금 값 = Selected + 오른쪽 icon/check. 다른 순위에 이미 고른 전형은 글자 {colors.text-muted} + "1순위에 있어요" caption(누를 수 없음). 맨 위 행 "비워 두기"(3순위만). 고르면 바로 닫혀요 |
| score-trend/1440-target-dropdown | 1440×900 | 1440-target-modal에서 2순위 select 아래 떠 있는 목록(같은 폭, 행 40, 마우스 올린 행 {colors.canvas-soft}, 고른 행 Selected + icon/check, 이미 고른 전형은 muted). Esc · 바깥 누름으로 닫혀요 |
| score-trend/390-target-no-app | 390×844 | [앱 "등록한 목표 대학이 없어요"] 지원 준비에 등록한 전형이 0개일 때 390-target-sheet 안: select 3칸 대신 `empty-state` "지원 준비에 등록한 전형이 없어요" → "원서·서류 체크리스트에서 대학과 전형을 먼저 추가해 주세요." → `button-primary` "지원 준비로 가기". 아래 고정 줄은 `button-outline` "닫기" 하나 |
| score-trend/390-target-leave-confirm | 390×844 | [안전] 390-target-sheet에서 3순위를 바꾼 뒤 "취소" · 바깥 누름: 확인 `bottom-sheet`(design.md 확인 창) "저장하지 않고 닫을까요?" {typography.heading-4} → "바꾼 목표 대학 순위가 사라져요." {typography.body} → `button-primary` "닫기" + `button-outline` "계속 고르기" |
| score-trend/1440-target-leave-confirm | 1440×900 | 같은 확인 창을 1440-target-modal 위 `modal`(560)로, 버튼 오른쪽 정렬 |
| score-trend/390-toast-saved | 390×844 | [안전] "저장"을 누른 뒤: 시트가 닫히고 최저 현황 목록이 새 순서로 바뀜(스크롤해 8번이 보이는 상태), `tab-bar-pill` 위 {spacing.md}에 `toast` "목표 대학을 저장했어요" |
| score-trend/1440-toast-saved | 1440×900 | 모달이 닫히고 보조 패널 목록이 바뀐 상태, 오른쪽 아래 `toast` 같은 문구 |

상태 프레임 합계 = A 4 + B 13 + C 7 + D 9 = **33장**(기본 2장 별도). 판정 행 상태 · 빈 상태 · 오류는 모두 그렸고, 그리지 않는 것: 성적 입력 화면으로 가는 링크의 도착 화면(다른 slug), 모집요강 원문(외부 링크).

---

## 4. 승인 체크리스트 대응

- 명도 대비 4.5:1: 회색 선(text-faint)은 선·비활성 표시에만, 읽어야 하는 이름표·눈금은 text-muted 이상. 판정 쌍은 design.md 색 쌍 그대로. 이미 고른 전형(muted 글자)도 4.5:1 이상인 text-muted.
- Route Blue는 "선택됨·여기예요"만: 선택 계열 선, 선택 세그먼트·메뉴·탭·`sub-nav`, 최신 행, 핵심 숫자 1개, 링크, 떠 있는 목록의 고른 행 check. 판정 배지·최저 현황 숫자·버튼 채움에는 쓰지 않아요.
- 판정 = 색 + 아이콘 + 이름: 충족 ● / 근접 ▲ / 미충족 ✕ / 자료 부족·판정 불가(이름만, 판정 없음 쌍). 검수 전 기준은 판정하지 않고 "준비 중".
- 판정 색은 최저 현황 배지 · 근거 마지막 줄 아이콘 · 2-3 판정 개수 라벨에만 써요. 오류 줄 · 빈 상태 · 확인 창에는 쓰지 않아요.
- 등급 숫자·이름표에는 색을 입히지 않아요. 등급 색(grade-1~9)은 5 to 9 막대 전용이라 이 화면에는 쓰지 않아요.
- 모서리 0, 그림자 없음(`bottom-sheet` · `modal` · `toast` · 떠 있는 목록만 예외). 숫자는 모두 고정폭.

## 5. 문구 원칙

- 해요체. 화면 이름은 "충족 현황". 앞날을 단정하는 표현, 될지 안 될지를 숫자로 말하는 표현은 쓰지 않아요.
- 추이는 단일 숫자보다 "범위 + 회차 수"로 말해요.
- 기준 값은 출처 배지(모집요강 반영 / 준비 중)와 함께 보여 줘요. 검수 전 기준은 숫자를 보여 주지 않아요.
- 등급컷이 검수 전이거나 예상 등급이 범위면 숫자를 만들어 채우지 않고 "—" · "준비 중" · 범위 그대로 적어요(NEVER-1).

## 6. 접근성

- 차트 대체 텍스트는 1장 6번 · 2장 문구. 빠진 회차는 "6월 예상 등급 2~3 범위라 선에 넣지 않음"처럼 읽혀요. 같은 값이 표에 있어 표가 차트의 대신 읽기예요.
- 불러오는 중은 role=status, 저장소 오류 줄은 role=alert, `toast`는 role=status.
- `bottom-sheet` · `modal`은 열리면 제목에 포커스, Esc · 닫기로 닫히고 연 버튼으로 포커스가 돌아와요. 떠 있는 목록은 방향키 위·아래 + Enter.
- 터치 영역: 세그먼트 · 표 행(expand) · 목록 행 · 링크 모두 44 이상.
- 시트 · 모달 240ms, `toast` 4초, prefers-reduced-motion이면 바로 보여요.

## 7. 앱과 다르게 그리는 점 (앱을 고칠 것, 시안이 기준)

1. 앱 모의고사 영역 고르기는 select(국어 기본) → 시안은 `segmented-control` 평균 · 국어 · 수학 · 영어 · 탐구(평균 기본). 선택지가 5개라 design.md select 규칙대로 세그먼트.
2. 앱 차트는 선 · 점이 잉크 → 시안은 선택 계열 Route Blue + 나머지 text-faint(`grade-trend-chart`).
3. 앱 최저 현황은 버튼을 눌러 여는 `modal`이고 "최저 기준 확인 필요"만 보여 줘요 → 시안은 본문(모바일) · 보조 패널(PC)에 늘 보이고, 검수된 기준만 판정해요. 앱 모달의 링크(모집요강 · 지원 자격 확인표 · 지원할 대학·전형 관리)는 390-row-sheet · 1440-row-skku · 390-target-sheet로 옮겨요.
4. 앱 표의 "수정" 열 → 시안은 표 아래 link 한 줄 "모의고사 성적 입력·수정 ›"(모바일 열 폭 때문), 원점수는 expand로.
5. 앱은 목표 대학 순위를 정하지 않아요 → 시안의 1~3순위 정하기(D 묶음)를 더해요.

## 8. 디자이너 메모

- 03-draft.json frames = 정확히 2개: score-trend/390 (390×844), score-trend/1440 (1440×900). 3장 상태 프레임 33개는 같은 Figma 페이지(기본 프레임 섹션 오른쪽)에 그리고 states에만 적어요(frames에 넣으면 G3 실패).
- 레이어 이름 = 컴포넌트 이름: `app-bar`, `sub-nav`, `tab-bar-pill`, `sidebar`, `sidebar-group`, `sidebar-item`, `brand-logo`, `page-header`, `mode-switch`, `segmented-control`, `segmented-control-active`, `grade-trend-chart`, `data-table`, `judge-badge`, `univ-logo`, `univ-monogram`, `data-status-badge`, `trace-accordion`, `disclaimer-note`, `stat-tile`, `button-pill-soft`, `button-outline`, `button-primary`, `empty-state`, `bottom-sheet`, `modal`, `toast`, `text-input`. 요약 문장 · 오류 줄 · 불러오는 중 줄은 "summary" · "error-line" · "loading-line" 일반 텍스트 레이어.
- 색: 모든 fill · stroke 팔레트 변수 바인딩. `brand-logo` · `univ-logo`만 원본 색(팔레트 예외).
- Figma 호출 한도(Education 플랜)가 있어 그리는 순서를 정해 둬요. 앞 단계가 끝나면 03-draft.json states에 바로 적어요(중간에 멈춰도 이어 그릴 수 있게).
  1. 기본 2장 바로잡기(0-1 U1~U9): 모바일 `sub-nav` 넣고 아래 44 내리기 · 탭바 이름 · 배지 ▲ ✕ · 강원대 준비 중 · PC `brand-logo` · 사이드바 메뉴 · `page-header` · 숫자 줄 hero · "전체 눈금" 버튼.
  2. 모바일 데이터 상태(기본 390 복제 후 바뀐 곳만): 390-school → 390-scrolled → 390-trace-open → 390-row-states → 390-table-expand → 390-full-scale → 390-grade-range → 390-area-pending → 390-order-unknown → 390-mock-one.
  3. 빈 · 불러오기 · 오류: 390-loading → 390-storage-error → 390-empty-all → 390-school-empty → 390-target-empty → 1440-loading → 1440-storage-error → 1440-empty-all → 1440-target-empty.
  4. 겹친 레이어(모바일 먼저, PC는 같은 내용을 `modal`로): 390-row-sheet → 390-target-sheet → 390-target-pick-sheet → 390-target-no-app → 390-target-leave-confirm → 390-toast-saved → 1440-target-modal → 1440-target-dropdown → 1440-target-leave-confirm → 1440-toast-saved.
  5. PC 데이터 상태: 1440-row-skku → 1440-row-states → 1440-area-pending → 1440-grade-range.
- 상태 프레임은 기본 프레임을 복제해 바뀌는 곳만 고쳐요. 겹친 레이어는 뒤 화면을 다시 그리지 않고 복제본 위에 {colors.scrim} + 시트 · 모달만 올려요.
- 390-row-states · 1440-row-states의 예시 대학은 시안용 가상 값이에요. 실제 대학 기준처럼 보이지 않게 `data-status-badge` "모집요강 반영"을 붙이지 말고 "예시" caption을 프레임 밖 주석으로 적어요.

## 9. design.md 수정 제안 (만들지 않고 제안만)

1. `grade-trend-chart` 범위 점 변형: 예상 등급이 한 값이 아니라 범위(예: 2~3등급)일 때 앱은 세로 막대 + 위아래 짧은 가로선으로 그려요. design.md 정의에는 점 · 선만 있어서, 이 명세는 그 회차를 점 없이 비우고 caption + 표로 대신해요(390-grade-range · 1440-grade-range). "범위 회차 = 2px 세로 막대(선택 계열 색) + 끝 가로선 10, 앞뒤 점과 선으로 잇지 않음"을 변형으로 정해 주세요.
2. `grade-trend-chart` "전체 눈금" 토글 모양: 정의에 토글이 있다고만 적혀 있어서 이 명세는 차트 머리 오른쪽 `button-pill-soft` "전체 눈금"(켜짐 = ✓ + SemiBold)으로 그려요. 이 모양을 정의에 적어 주세요.
