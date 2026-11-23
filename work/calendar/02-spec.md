# 02-spec — 입시 일정 (calendar)

작성일 2026-11-23 · 담당 planner (S2) · 첫 판
근거: 01-research.md(§0 F1~F10 · S-a~S-j · M1, P1~P15), docs/design.md(커밋 9eee67e — App Shell, Responsive Strategy, Colors(Route Blue · 판정 색 규칙), Components — filter-chip · segmented-control · stat-tile · data-table · warning-callout · disclaimer-note · empty-state · bottom-sheet · modal · toast · page-header · sub-nav · sidebar-item, Voice, Accessibility), docs/prd.md(5장 홈 D-day, 6-1 면접 · 논술 일정, 6-7 수시로 고사 일정 · 겹침 경고, 7-2/7-5 기기 저장, 8장 AdmissionProgram.schedule, 9장 R-CARD-002, 13장), docs/story-service.md NEVER-1/2, 앱 구현 app/src/screens/ApplicationCalendar.tsx · app/src/domain/calendar.ts · app/src/domain/board.ts(R-CARD-002 문구) · app/src/shell/nav.ts.
사용자 요청(채팅 원문): "캘린더에 면접 일정이라든지 입시 날짜 정리해 놓는 기능도 있으면 좋겠다." + "시안에서 지금 안 그린 기능들이나 그 안의 팝업창 같은 것들도 더 그려봐."
겹치지 않게 본 것: 원서·서류 체크리스트는 마감일을 **입력**하는 화면, 수시로는 고사 날짜를 칸에 **입력**하는 화면이에요. 이 화면은 그 두 기록을 날짜로 **모아 보기만** 해요. 새 날짜를 입력하지 않고, 대학 공식 일정(관리자 데이터)을 끌어오지 않고, 서버에 보내지 않아요. 판정(안정 · 적정 · 소신 · 위험) · 판정 배지 · 환산 숫자가 없어요.
프레임: calendar/390 (390×844), calendar/1440 (1440×900). 상태 프레임 27장(5장) — 모두 확정(앱 기능 19장 + 새 기능 8장, 2026-11-23 사용자 결정).
필수 포함: rules `requires_disclaimer_note` · `requires_trace_accordion` 둘 다 이 slug가 없어요. 그래도 F10 고지(내 기록 · 공식 모집요강 확인 · 자동 알림 없음)를 `disclaimer-note`로 넣어요(D12). 계산 결과가 없어 `trace-accordion`은 넣지 않아요.

표기: **확정** = 앱에 이미 있는 기능을 design.md 부품으로 옮긴 것(앱 동작 그대로). **확정(새 기능)** = 앱에 없던 새 기능 제안을 사용자가 2026-11-23 채팅에서 전부 넣기로 정한 것(앱 반영 사항). 이 설계서에 남은 [확인] 항목은 없어요. 새 기능은 상태 프레임에 그리고, 기본 프레임에는 화면에 늘 보이는 것(월 제목 ▾ · 21일 겹침 ▲)만 넣어요.

## 0. 결정

| # | 항목 | 결정 | 이유 |
|---|---|---|---|
| D1 | 위치 — 확정 | 학생 › **수시 전략 › 입시 일정**(앱 nav.ts 그대로). 수시 전략 소분류 5칸: 수시로 · 원서·서류 체크리스트 · **입시 일정** · 상담 질문·할 일 · 생기부 AI. 모바일 `sub-nav`, PC `sidebar-item`. design.md App Shell 문장에는 아직 "수시 전략(수시로 · 생기부 AI)"만 있어 9장 제안 1로 고쳐요 | 앱 nav.ts student › '수시 전략' items |
| D2 | 소분류 아이콘 — 확정(2026-11-23 사용자 결정) | 입시 일정 = icon/calendar(앱 그대로). 앱 nav.ts에서 성적 추이도 icon/calendar라 design.md sidebar-item "같은 사이드바의 다른 메뉴 아이콘과 겹치지 않습니다"에 걸려서, 성적 추이는 icon/trending-up으로 바꿔요(성적 추이 화면 · 앱 nav.ts 수정은 그 slug 담당이 해요). 시안은 icon/calendar로 그려요 | design.md sidebar-item(2026-11-22 사용자 피드백) |
| D3 | 화면 주인공 — 확정 | 월간 그리드(모바일 위 · PC 왼쪽). 다가오는 일정 1개는 `stat-tile`(기본 변형, hero 아님)로 화면 머리 바로 아래에 둬요. 앱은 목록 아래에 두지만 "가장 가까운 일정"을 먼저 보게 순서만 올려요(기능 변화 없음, 앱 순서 맞춤은 앱 반영 사항) | design.md Do "화면마다 주인공 하나", P5 |
| D4 | 필터 — 확정 | 앱의 select 2개 + 체크박스를 `filter-chip` 한 줄로 옮겨요. 체크박스 · select 부품은 새로 만들지 않아요. ① "전형: 전체 ▾" 칩 → 누르면 모바일 `bottom-sheet` / PC `modal` "지원 전형 고르기"(라디오 행 목록) ② 일정 종류 단일 선택 칩 3개 "전체"(on) · "원서·서류" · "면접·논술·실기" ③ "완료 포함" 켜고 끄는 칩(기본 off) | design.md filter-chip "모바일 목록 위 컨트롤은 … filter-chip 가로 스크롤 1줄까지 · 상세 조건은 칩을 누르면 bottom-sheet", P2 |
| D5 | 보기 전환 — 확정 | `segmented-control` "월간 · 목록"(월간 기본). 주 · 3일 · 하루 보기는 없어요 | 앱 F3, P1 |
| D6 | 달력 칸 — 확정 | 앱 그대로 숫자 아래 "n건"(점 · 일정 이름 막대 없음). 오늘 = 날짜 숫자를 잉크 채움 정사각(24×24, {colors.primary} + {colors.on-primary}), 선택한 날 = 칸 전체 {colors.accent-soft} + 1px {colors.accent} 안쪽 테두리. 토 · 일요일도 흑백(빨강 · 파랑 요일 색 없음). 다른 달 칸은 비워요. 그리기는 `data-table`로 하고 9장 제안 2(변형 month)로 규칙을 올려요 | design.md "색은 의미가 있을 때만", Route Blue = 선택, P1 · P3 |
| D7 | 일정 행 — 확정 | 행 = 왼쪽 대학 · 학과 / 학년도 · 전형 · 일정 이름 / "(안 이름)에 기록" · 오른쪽 날짜(+시각)와 상태 글자. 유형 꼬리표 · 유형 색은 두지 않아요(일정 이름 글자에 이미 "면접" · "서류 제출"이 있어요). 모바일은 흰 카드 안 행 목록, PC 목록 보기는 `data-table` | design.md "판정 색을 … 카테고리 구분에 쓰지 마세요", P3 |
| D8 | 상태 글자 — 확정 | "D-n"(고정폭 {colors.ink}) · "오늘"({colors.ink} SemiBold) · "기한 지남" · "완료" · "날짜 미정"({colors.text-muted}). "기한 지남"에도 위험 색 · 아이콘을 쓰지 않아요(판정 · 오류가 아님). Route Blue 숫자는 화면에 1개, `stat-tile` 값에만 | design.md Route Blue "핵심 숫자 1~2개", 판정 색 제외 |
| D9 | 일정 상세(M1) — 확정 | 모바일 `bottom-sheet`, PC `modal`(최대 폭 560). 앱 내용 · 순서 그대로(5장 390-detail). 주요 버튼 없음, 아래 `button-outline` "일정 수정하러 가기" | 앱 Modal, design.md "모바일에서는 … 모달을 바텀시트로" |
| D10 | 데이터 출처 — 확정 | 날짜는 학생이 입력한 기록이에요(관리자 검수 데이터 아님). `data-status-badge`(시행계획 기준 · 준비 중 · 데이터 기준일)를 쓰지 않고 캡션 "내가 입력한 일정 · 한국 시간"만. 날짜 미정은 달력에 넣지 않고 아래 접힌 묶음으로. 날짜를 추정해 채우지 않아요 | NEVER-1 취지, P8 |
| D11 | 내보내기 — 확정 | `button-outline` "이번 달 n개 .ics 내보내기", 누르면 바로 파일 저장(앱 그대로). 이번 달 0개면 비활성. 실패하면 버튼 아래 오류 줄 | 앱 F9, S-g, S-h |
| D12 | 고지 — 확정 | 맨 아래 `disclaimer-note`(6장 문구, 앱 F10 + 시안 예시 안내) | 앱 F10, design.md disclaimer-note |
| D13 | 빈 상태 — 확정 | 전형 0개 = `empty-state`(`button-primary` "지원할 전형부터 등록하기" 하나). 이번 달 · 선택한 날 0개 = 목록 카드 안 한 줄(버튼 없음) | design.md empty-state, P9 · P14 |
| D14 | 오류 · 경고 줄 — 확정 | 불러오기 오류 · 없는 전형 · 내보내기 실패는 판정 · 조합 경고가 아니라서 `warning-callout`(소신 색)을 쓰지 않아요. 흑백 안내 줄 = 앞 ⓘ {colors.ink} + {typography.body-sm} {colors.ink} + 고칠 방법 한 문장(일반 레이어 "notice-row") | design.md "판정 색을 장식이나 카테고리 구분에 쓰지 마세요", Voice 오류 문구 |
| D15 | 고사 일정 겹침 — 확정(새 기능) | 앱은 겹침 경고를 수시로에서만 보여 줘요(R-CARD-002). 같은 날 면접 · 논술이 2개 이상이면 달력 칸 "n건" 옆 ▲ {colors.judge-reach} + 그날 목록 맨 위 `warning-callout`(앱 R-CARD-002 문구 그대로) + 링크 "수시로에서 보기 ›". 수시로 조합 경고와 같은 경고라 소신 색 쌍을 그대로 써요 | design.md warning-callout "조합 경고", PRD 6-7 · 9장 R-CARD-002, P4 |
| D16 | 월 고르기 — 확정(새 기능) | 앱은 ‹ › 와 "오늘"만 있어요. 월 제목 "2026년 11월 ▾"를 누르면 모바일 `bottom-sheet` / PC `dropdown`(D18)에 "‹ 2026년 ›" + 1~12월 `filter-chip` 3×4 격자(보고 있는 달 on, 일정 있는 달은 칩 안 "n건" caption). 입시 일정이 9~2월에 몰려 있어 한 번에 고르게 해요 | P11 |
| D17 | 내보내기 확인 · 완료 알림 — 확정(새 기능) | 앱은 확인 창 · 완료 알림 없이 바로 저장해요. 누르면 모바일 `bottom-sheet` / PC `modal` "이번 달 일정 내보내기"(요약 · 빠지는 항목 · 기기에서 만든다는 안내) → `button-primary` "파일 저장" + `button-outline` "취소" → 저장 뒤 `toast` "일정 6개를 파일로 저장했어요". 완료를 "확인" 한 버튼 팝업으로 띄우지 않아요 | P7 · P12, design.md toast |
| D18 | PC 전형 · 월 고르기 패널 — 확정(2026-11-23 사용자 결정) | 9장 제안 4(PC 떠 있는 선택 패널 `dropdown`)대로 칩 · 월 제목 바로 아래 떠 있는 패널(폭 360)로 그려요. 버튼이 있는 내보내기 확인은 `modal` 그대로예요 | rules shadow_allowed_on에 dropdown이 있고, components 이름 추가는 오케스트레이터가 design.md 패치와 함께 해요 |
| D19 | 시안 날짜 — 확정(설계서 기본안) | demo-dataset "오늘" = 2026-11-20(금)에 맞춰 2026년 11월을 그리고 학년도는 "2028학년도"로 둬요. 데모 학생(2학년)의 실제 2028학년도 수시 일정은 2027년이지만, 시안은 수시로 승인본(11월 21일 면접 겹침)과 같은 달에 맞춘 시험용 예시예요. 고지에 "시안의 날짜는 시험용 예시예요"를 넣어요 | design.md Don't "시안 예시 값은 demo-dataset 하나만", demo-dataset 날짜 |

## 1. 시안 데이터 (가상 · 시험용)

demo-dataset.md의 관심 대학 6곳(수시 6장)과 "오늘" 2026-11-20(금)을 써요. 아래 일정 값은 demo-dataset에 없어서 새로 만든 시험용 예시예요(보고 대상). 전형 이름은 6곳 모두 "학생부종합"으로 둬요(판정은 이 화면에 나오지 않아요).

| # | 날짜 · 시각 | 대학 · 학과 | 일정 이름 | 종류 | 기록 | 상태(오늘 11-20 기준) |
|---|---|---|---|---|---|---|
| E1 | 11-05(목) 17:00 | 성균관대 · 행정학과 | 서류 제출 | 원서·서류 | 체크리스트 | 완료(완료 포함 on일 때만 보여요) |
| E2 | 11-13(금) 17:00 | 동국대 · 행정학과 | 추천서 제출 | 원서·서류 | 체크리스트 | 기한 지남 |
| E3 | 11-20(금) 18:00 | 한양대 · 정책학과 | 서류 제출 마감 | 원서·서류 | 체크리스트 | 오늘 |
| E4 | 11-21(토) | 경희대 · 행정학과 | 면접 | 면접·논술·실기 | A안에 기록 | D-1 |
| E5 | 11-21(토) | 건국대 · 행정학과 | 면접 | 면접·논술·실기 | A안에 기록 | D-1 |
| E6 | 11-27(금) 17:00 | 중앙대 · 공공인재학부 | 서류 제출 | 원서·서류 | 체크리스트 | D-7 |
| E7 | 11-28(토) | 성균관대 · 행정학과 | 논술 | 면접·논술·실기 | A안에 기록 | D-8 |
| E8 | 12-05(토) | 동국대 · 행정학과 | 면접 | 면접·논술·실기 | A안에 기록 | D-15(12월) |
| U1 | 날짜 미정 | 중앙대 · 공공인재학부 | 면접 | 면접·논술·실기 | A안에 기록 | 날짜 미정 |
| U2 | 날짜 미정 | 한양대 · 정책학과 | 면접 | 면접·논술·실기 | A안에 기록 | 날짜 미정 |

- 11월 칸 "n건"(완료 포함 off): 13일 1건 · 20일 1건 · 21일 2건 · 27일 1건 · 28일 1건. 완료 포함 on이면 5일 1건이 더해져요.
- 이번 달 일정 6개(E2~E7), 완료 포함 on이면 7개. 내보내기 버튼 "이번 달 6개 .ics 내보내기".
- 다가오는 일정 = E3(오늘 18:00 전이라 "오늘"). 2026-11 달력: 1일 = 일요일, 30일 = 월요일, 5줄.
- 학년도 표기는 "2028학년도"(D19).
- 체크리스트 일정 원문 링크 = 등록한 URL이 있을 때만 "등록한 원문 확인 ↗". 시안에서는 E3 · E4에 있다고 둬요.
- 10월(빈 달 시안) = 일정 0개. 12월 = E8 1건.

## 2. 모바일 390×844 (frame calendar/390)

앱 셸: 바탕 Page {colors.canvas-soft}, 내용은 테두리 없는 흰 카드. 화면 제목 → `sub-nav`(수시 전략 소분류) → 본문 → 하단 `tab-bar-pill`(수시 전략 선택). 좌우 여백 20(콘텐츠 350), 카드 패딩 16, 카드 사이 12, 섹션 간격 {spacing.xl}. 마지막 요소 아래 여백은 탭바 높이만큼.
첫 화면에는 M1~M6(달력 끝까지)이 보이고 목록부터 스크롤이에요.

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| M1 | 화면 머리 | `brand-logo`, 텍스트, `segmented-control`, `segmented-control-active` | 맨 위 `brand-logo`(대분류 첫 화면 머리 규칙). 한 줄: 왼쪽 "입시 일정" {typography.heading-1}, 오른쪽 `segmented-control` on=page "월간 · 목록"(월간 선택, 폭 120, 높이 36 · 터치 44) [D5]. 아래 리드 {typography.body-sm} {colors.text-muted} "원서·서류 마감과 고사 날짜를 한곳에서 확인해요." + 같은 줄 링크 {typography.link} {colors.accent} "일정 입력·수정 ›"(→ 원서·서류 체크리스트) |
| M2 | 소분류 탭 | `sub-nav` | 5칸: 수시로 · 원서·서류 체크리스트 · **입시 일정**(선택) · 상담 질문·할 일 · 생기부 AI. 넘치면 가로 스크롤, 선택 탭이 보이게 처음 위치를 맞춰요 [D1] |
| M3 | 다가오는 일정 | `stat-tile` | 흰 카드(패딩 16). 라벨 {typography.caption} {colors.text-muted} "다가오는 일정" → 값 {typography.numeric} {colors.accent} "오늘"(D-n이면 "D-1"처럼 고정폭) → 보조 {typography.body-sm} {colors.ink} "한양대 정책학과 · 서류 제출 마감 · 11.20(금) 18:00". 카드 오른쪽 "›", 누르면 그 일정 상세(M1 팝업) [D3, D8, P5] |
| M4 | 필터 칩 줄 | `filter-chip` | 가로 스크롤 한 줄, on=page(off 채움 {colors.canvas}): "전형: 전체 ▾" · "전체"(on) · "원서·서류" · "면접·논술·실기" · "완료 포함"(off). 칩 높이 32 · 터치 44, 사이 8. "전형" 칩 뒤에 8px 세로 1px {colors.hairline} 구분선. "전형" 칩을 누르면 `bottom-sheet`(390-plan-sheet) [D4] |
| M5 | 달력 머리 | 텍스트, `button-outline` | 흰 카드 위쪽(패딩 16 16 8). 왼쪽 `button-outline` "‹"(44×44, aria "이전 달") · 가운데 "2026년 11월 ▾" {typography.heading-2} 고정폭 숫자(누르면 390-month-sheet, aria-haspopup) · `button-outline` "›"(44×44, aria "다음 달"), 오른쪽 끝 `button-outline` "오늘"(높이 36 · 터치 44) [D16] |
| M6 | 월간 그리드 | `data-table` | 같은 카드 안, 좌우 0(칸 50×48 × 7열 = 350). 머리글 줄 높이 28 {colors.canvas-soft} {typography.table-head} "일 월 화 수 목 금 토"(흑백). 칸 = 날짜 숫자 {typography.table} 고정폭(위 6, 가운데) + 일정 있으면 아래 "n건" {typography.caption} {colors.ink}. 칸 구분 1px {colors.hairline-soft}. 오늘(20일) = 숫자 잉크 채움 정사각. 21일 "2건" 옆 ▲ {colors.judge-reach}(12px, 고사 겹침 D15 — aria "11월 21일, 일정 2개, 면접 일정이 겹쳐요"). 선택한 날 없음. 다른 달 칸은 빈칸 {colors.canvas}. 칸 전체가 누르는 영역(50×48, 44 이상) [D6] |
| M7 | 일정 목록 | 텍스트 | 섹션 머리 Page 위: "이번 달 일정 · 6개" {typography.heading-3}. 흰 카드 안 행 6개(E2~E7 날짜순), 행 사이 1px {colors.hairline-soft}, 행 최소 높이 72, 패딩 12 16. 행 왼쪽: 1줄 "동국대 · 행정학과" {typography.title} → 2줄 "2028학년도 · 학생부종합 · 추천서 제출" {typography.body-sm} {colors.text-muted} → 3줄(고사만) "A안에 기록" {typography.caption} {colors.text-muted}. 행 오른쪽(오른쪽 정렬): 날짜 "11.13(금)" {typography.table} 고정폭 + 시각 "17:00" 같은 줄, 아래 상태 글자(D8). 행 전체가 버튼(›), 누르면 M1 팝업 [D7, D8] |
| M8 | 날짜 미정 묶음 | 텍스트 | 흰 카드 한 줄(높이 52, 접힘): "날짜 미정 2개" {typography.title} + caption muted "입력한 날짜가 없어 달력에 표시하지 않아요" + 오른쪽 ▾. 펼치면 M7과 같은 행(390-undated) [D10] |
| M9 | 내보내기 | 텍스트, `button-outline` | caption muted "내가 입력한 일정 · 한국 시간" → `button-outline` 전체 폭 높이 52 "이번 달 6개 .ics 내보내기"(누르면 390-export-sheet) [D11, D17] |
| M10 | 고지 | `disclaimer-note` | 6장 고지 문구 [D12] |
| M11 | 하단 탭바 | `tab-bar-pill` | 수시 전략 선택 |

모바일 Route Blue: `sub-nav` 선택 막대, `segmented-control-active`, `filter-chip` on 테두리, 선택한 날 칸(상태 프레임), 링크("일정 입력·수정 ›" · "등록한 원문 확인 ↗"), `tab-bar-pill` 선택 아이콘, `stat-tile` 값 1개. 행 날짜 · 상태 · 칸 숫자에는 쓰지 않아요.
주요 버튼(`button-primary`) 없음. 전형 0개 `empty-state`와 내보내기 확인 시트에서만 하나 나와요. 판정 색은 21일 겹침 ▲ 하나(소신 색)뿐이에요.

## 3. PC 1440×900 (frame calendar/1440)

앱 셸: 왼쪽 `sidebar`(흰 바탕) 248, 위 `brand-logo`, `sidebar-group` 홈(접힘) · 성적(접힘) · 대학 찾기(접힘) · **수시 전략(펼침)**. 수시 전략 아래 `sidebar-item` **5칸: 수시로 · 원서·서류 체크리스트 · 입시 일정(선택, icon/calendar) · 상담 질문·할 일 · 생기부 AI**.
콘텐츠: 1440 − 248 = 1192, 좌우 패딩 32 → 폭 1128, 바탕 Page. 왼쪽 본문 744 + 간격 24 + 오른쪽 보조 패널 360(design.md "오른쪽 보조 패널 360px").
첫 화면에 P1~P5와 달력 전체가 보여요.

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| P1 | 화면 머리 | `page-header`, `button-outline` | 위 caption "수시 전략 › 입시 일정" → 제목 "입시 일정" {typography.heading-1} → 리드 {typography.body-lg} "원서·서류 마감과 고사 날짜를 한곳에서 확인해요." 오른쪽 끝 `button-outline` "일정 입력·수정"(→ 원서·서류 체크리스트). 데이터 기준일 배지 없음(내 기록이라서, D10) |
| P2 | 필터 줄 | `filter-chip`, `segmented-control`, `segmented-control-active` | 전체 폭 1128, Page 위 한 줄(높이 44): 왼쪽 `filter-chip` on=page "전형: 전체 ▾" · 구분선 · "전체"(on) · "원서·서류" · "면접·논술·실기" · 구분선 · "완료 포함"(off). 오른쪽 끝 `segmented-control` on=page "월간 · 목록"(월간). "전형" 칩을 누르면 `dropdown`(1440-plan-dropdown) [D4, D5, D18] |
| P3 | 달력 | 텍스트, `button-outline`, `data-table` | 왼쪽 744 흰 카드(패딩 24, 안쪽 696). 머리: `button-outline` "‹"(40×40) · "2026년 11월 ▾" {typography.heading-2}(누르면 1440-month-picker `dropdown`) · `button-outline` "›" · 오른쪽 `button-outline` "오늘". 그리드 7열 × 약 99.4, 머리글 32 + 5줄 × 88. 칸 = 왼쪽 위 날짜 숫자 + 아래 "n건" {typography.caption}, 규칙은 M6과 같아요(21일 겹침 ▲ 포함). 마우스를 올리면 칸에 1px {colors.ink} 안쪽 테두리(Elevation 3) [D6] |
| P4 | 고지 | `disclaimer-note` | 달력 카드 바로 아래, 6장 문구 |
| P5 | 다가오는 일정 | `stat-tile` | 오른쪽 360 첫 흰 카드(패딩 20). M3과 같은 내용 [D3] |
| P6 | 일정 목록 | 텍스트 | 오른쪽 둘째 흰 카드. 머리 "이번 달 일정 · 6개" {typography.heading-4}. 행은 M7과 같고 폭 320에 맞춰 날짜 · 상태를 오른쪽 열(폭 84)에 둬요. 카드 안쪽 세로 스크롤(카드 최대 높이 = 화면 아래까지). 누르면 `modal`(1440-detail) [D7] |
| P7 | 날짜 미정 · 내보내기 | 텍스트, `button-outline` | 오른쪽 셋째 흰 카드: M8 접힘 줄 → 1px {colors.hairline-soft} → caption muted "내가 입력한 일정 · 한국 시간" → `button-outline` 전체 폭(높이 44) "이번 달 6개 .ics 내보내기"(누르면 1440-export-modal) [D10, D11, D17] |

PC Route Blue: `sidebar-item` 선택, `filter-chip` on 테두리, `segmented-control-active`, 선택한 날 칸(상태 프레임), 링크, `stat-tile` 값 1개. 행 · 칸 숫자에는 쓰지 않아요. 주요 버튼 없음. 판정 색은 21일 겹침 ▲ 하나뿐이에요.

## 4. 데이터 규칙

- 일정 = 원서·서류 체크리스트 단계(마감일이 있으면 날짜 · 시각) + 수시로 칸(고사 종류 · 고사 날짜, 시각 없음). 같은 전형 · 같은 고사 · 같은 날짜가 여러 안(A안 · B안)에 있으면 한 행으로 합치고 "A안 · B안에 기록"으로 보여요(앱 그대로).
- 수시로 고사는 완료 상태가 없어서 지난 날짜면 "기한 지남"이에요. 시각이 있는 체크리스트 일정은 그 시각이 지나는 순간 "기한 지남"(한국 시간).
- 내보내기(.ics) = 지금 필터가 걸린 "이번 달" 일정만. 날짜 미정은 빠져요. 서버로 보내지 않고 기기에서 파일을 만들어요. 자동 알림을 보내지 않아요.
- 관리자 데이터(시행계획 · 모집요강 일정)를 쓰지 않아요. 환산 · 판정 계산이 없어서 NEVER-1 대상 숫자가 없어요.

## 5. 상태 프레임 (03-draft.json states에만 적고 frames에는 넣지 않아요)

이름 = calendar/<상태>. 앱 기능 19장 + 새 기능 8장 = 27장, 모두 확정.

### 5-1. 확정 (앱에 있는 기능 · 상태 · 팝업)

| 프레임 | 크기 | 출처 | 무엇을 그리나 |
|---|---|---|---|
| calendar/390-loading | 390×844 | S-a | M1 · M2까지 그대로, 그 아래 흰 카드 하나에 "일정을 불러오고 있어요." {typography.body-sm} {colors.text-muted}(가운데). 칩 · 달력 · 목록 없음. 움직이는 표시 없음 |
| calendar/390-error | 390×844 | S-b | M1 · M2 아래 notice-row(D14): ⓘ "저장된 기록을 열지 못했어요. 앱을 다시 열거나 백업 파일로 복원해 주세요." 칩 · 달력 · 목록 없음. 문구는 앱 저장소 오류 문구 자리(실제 문구는 오류 종류에 따라 달라요) |
| calendar/390-no-plans | 390×844 | S-c · S-e | M3 `stat-tile` 값 "날짜 미정" {colors.text-muted}(Route Blue 아님) + 보조 "날짜가 확인된 미완료 일정이 없어요." → M4 칩 줄 → M5 · M6 달력(모든 칸 "n건" 없음) → 목록 자리에 `empty-state`: 흑백 선 아이콘(icon/calendar) → "아직 등록한 전형이 없어요" {typography.heading-4} → "체크리스트에 전형을 담고 마감일을 넣으면 여기에 모여요" {typography.body-sm} → `button-primary` "지원할 전형부터 등록하기"(→ 체크리스트). 날짜 미정 묶음 없음, 내보내기 버튼 비활성 "이번 달 0개 .ics 내보내기" |
| calendar/390-month-empty | 390×844 | S-d · S-h | ‹ 눌러 "2026년 10월". 달력 칸 "n건" 없음, 오늘 표시 없음(다른 달). 목록 머리 "이번 달 일정 · 0개", 흰 카드 안 한 줄 {typography.body-sm} {colors.text-muted} "등록한 일정이 없어요. 체크리스트에서 마감일을, 수시로에서 고사 날짜를 입력해 주세요." 내보내기 `button-outline` 비활성(글자 {colors.text-faint}, 테두리 {colors.hairline-soft}) "이번 달 0개 .ics 내보내기" |
| calendar/390-day | 390×844 | S-j | 28일 칸 선택(D6). 달력 아래 머리 "11월 28일(토) 일정 · 1개" {typography.heading-3} + 오른쪽 텍스트 버튼 {typography.link} {colors.accent} "이번 달 전체 보기". 행 E7. 겹친 날(21일) 선택은 390-overlap에서 그려요 |
| calendar/390-day-empty | 390×844 | S-d(선택한 날) | 24일(화) 칸 선택. 머리 "11월 24일(화) 일정 · 0개" + "이번 달 전체 보기", 흰 카드 안 한 줄 "등록한 일정이 없어요. 체크리스트에서 마감일을, 수시로에서 고사 날짜를 입력해 주세요." |
| calendar/390-list | 390×844 | S-i | `segmented-control` "목록" 선택. 달력(M5 · M6) 자리에 달 이동 줄만 남고(‹ 2026년 11월 › · 오늘) 그리드 없음. 바로 아래 목록. 목록은 날짜 머리로 나눠요: "11.13(금)" · "11.20(금) · 오늘" · "11.21(토)" · "11.27(금)" · "11.28(토)" {typography.label} {colors.text-muted}, 그 아래 해당 행. 일정 없는 날은 건너뛰어요 [P1] |
| calendar/390-undated | 390×844 | F8 | 아래로 스크롤한 모습: 목록 마지막 2행 → 날짜 미정 묶음 펼침 ▴, 행 U1 · U2(오른쪽 날짜 자리 "날짜 미정" muted, 상태 글자 없음) → 내보내기 캡션 · 버튼 → `disclaimer-note` |
| calendar/390-completed | 390×844 | F2 체크박스 | "완료 포함" 칩 on. 5일 칸 "1건" 생김, 목록 "이번 달 일정 · 7개", 첫 행 E1 상태 "완료" muted(행 글자는 그대로 ink, 줄긋기 없음). 내보내기 "이번 달 7개 .ics 내보내기" |
| calendar/390-plan-filtered | 390×844 | F2 ?plan= | 전형 계획 화면 "이 전형 일정 보기"로 들어온 모습. 칩 "전형: 경희대 행정학과 ▾" on. 달력 21일 "1건"만, 목록 "이번 달 일정 · 1개"(E4). `stat-tile` = 경희대 행정학과 · 면접 · 11.21(토) · 값 "D-1" |
| calendar/390-plan-missing | 390×844 | S-f | 칩 "전형: 삭제되었거나 없는 전형 ▾" on, 그 아래 notice-row(D14) "이 전형을 찾지 못했어요. 전체 전형을 선택하거나 지원 준비 기록을 확인해 주세요." + 텍스트 버튼 {colors.accent} "전체 전형 보기". 달력은 비운 채(칸 "n건" 없음), 목록 "이번 달 일정 · 0개" 한 줄. `stat-tile`은 "날짜 미정" 상태 [P13] |
| calendar/390-export-error | 390×844 | S-g | 아래로 스크롤한 모습: 내보내기 버튼 바로 아래 notice-row(D14) "일정을 내보내지 못했어요. 브라우저 다운로드 권한을 확인해 주세요." (role=alert) |
| calendar/390-detail | 390×844 | M1 | E4 행을 누른 뒤. `bottom-sheet`(손잡이, 그림자, 뒤 scrim, 높이 내용만큼 약 60%): 머리 한 줄 = 일정 이름 "면접" {typography.heading-3} + 오른쪽 `button-outline` "닫기"(높이 36 · 터치 44) → "경희대 · 행정학과" {typography.title} → "2028학년도 · 학생부종합" {typography.body-sm} {colors.text-muted} → "11.21(토) · D-1" {typography.table} 고정폭 → "A안에 기록 · 안마다 고사 날짜가 다르면 각각 표시돼요." {typography.body-sm} → caption muted "내가 입력한 일정 · 한국 시간 기준" → 메모 {typography.body-sm} "고사 시각은 수시로에 기록되지 않아요. 원문에서 확인해 주세요." → 링크 {typography.link} {colors.accent} "등록한 원문 확인 ↗" → 아래 고정 줄 `button-outline` 전체 폭 높이 52 "일정 수정하러 가기"(→ 수시로). 줄 사이 1px {colors.hairline-soft}. 열면 제목으로 포커스, Esc · 닫기 · scrim으로 닫고 누른 행으로 포커스가 돌아가요 [D9, P6] |
| calendar/390-plan-sheet | 390×844 | F2 select | "전형: 전체 ▾" 칩을 누른 뒤. `bottom-sheet`: 제목 "지원 전형 고르기" {typography.heading-4} → 라디오 행(높이 52, 행 사이 1px {colors.hairline-soft}): "전체 전형"(선택 = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대) · "2028 · 경희대 · 학생부종합 · 행정학과" · "2028 · 건국대 · 학생부종합 · 행정학과" · "2028 · 성균관대 · 학생부종합 · 행정학과" · "2028 · 동국대 · 학생부종합 · 행정학과" · "2028 · 한양대 · 학생부종합 · 정책학과" · "2028 · 중앙대 · 학생부종합 · 공공인재학부". 행을 누르면 시트가 닫히고 바로 바뀌어요(적용 버튼 없음). 학과 없는 전형은 "학과 미지정" |
| calendar/1440-day | 1440×900 | S-j | 28일 칸 선택. 오른쪽 목록 카드 머리 "11월 28일(토) 일정 · 1개" + "이번 달 전체 보기", 행 E7 |
| calendar/1440-list | 1440×900 | S-i | "목록" 선택. 왼쪽 744 카드 = 달 이동 줄 + `data-table` 열(폭): 날짜 104(고정폭, 시각 있으면 아래 줄) · 상태 80 · 대학 · 학과 200 · 전형 140 · 일정 120 · 기록 100(오른쪽 패딩 포함 696). 행 높이 52, 머리글 {colors.canvas-soft}, 정렬 화살표 없음(날짜순 고정). 행을 누르면 1440-detail. 오른쪽 패널은 P5 + P7만 남아요(목록 카드 없음, 겹치지 않게) |
| calendar/1440-detail | 1440×900 | M1 | E3(체크리스트 일정) 행을 누른 뒤. `modal`(최대 폭 560, 뒤 scrim): 390-detail과 같은 순서. 제목 "서류 제출 마감" · "한양대 · 정책학과" · "2028학년도 · 학생부종합" · "11.20(금) 18:00 · 오늘" · ("에 기록" 줄 없음) · "내가 입력한 일정 · 한국 시간 기준" · 메모 "학교장 추천 공문은 담임 선생님께 받기"(체크리스트 메모 예시, 없으면 줄 없음) · "등록한 원문 확인 ↗" · 아래 `button-outline` "일정 수정하러 가기"(→ 원서·서류 체크리스트). 오른쪽 위 닫기는 앱처럼 `button-outline` "닫기" |
| calendar/1440-plan-dropdown | 1440×900 | F2 select | "전형: 전체 ▾" 칩을 누른 뒤. 칩 바로 아래 4px 띄운 `dropdown`(폭 360, 행 높이 40 {typography.body}): 390-plan-sheet와 같은 행, 선택 행 = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대. 바깥 · Esc로 닫고 행을 고르면 바로 닫혀요 [D18] |
| calendar/1440-no-plans | 1440×900 | S-c · S-e | 왼쪽 달력(빈 칸), 오른쪽 패널 = `stat-tile` "날짜 미정" + 둘째 카드 `empty-state`(390-no-plans와 같은 문구 · `button-primary`) + 내보내기 비활성 |

### 5-2. 확정 — 새 기능 (앱에 없던 기능, 2026-11-23 사용자 결정으로 확정 · 승인 대상 · 앱 반영 사항)

| 프레임 | 크기 | 결정 | 무엇을 그리나 |
|---|---|---|---|
| calendar/390-overlap | 390×844 | D15 | 390-day와 같고, 21일 칸 "2건" 옆 ▲ {colors.judge-reach}(12px). 목록 머리 바로 아래 `warning-callout`: ▲ + 제목 {colors.judge-reach} "면접 일정이 겹쳐요" + 설명 {colors.ink} "11월 21일(토)에 경희대·건국대 고사가 함께 있어요. 한 곳은 다른 카드로 바꿔 보세요." + 링크 "수시로에서 보기 ›"({colors.ink} 밑줄, 경고 안에는 Route Blue를 쓰지 않아요). 달력 칸 ▲은 색 + 아이콘이고, 이름은 경고 줄과 칸 aria "11월 21일, 일정 2개, 면접 일정이 겹쳐요"로 읽혀요 |
| calendar/1440-overlap | 1440×900 | D15 | 1440-day + 21일 칸 ▲ + 오른쪽 패널 목록 카드 위 `warning-callout`(390-overlap 문구) |
| calendar/390-month-sheet | 390×844 | D16 | 월 제목 "2026년 11월 ▾"를 누른 뒤. `bottom-sheet`: 제목 "달 고르기" → 연도 줄 `button-outline` "‹" · "2026년" {typography.heading-4} · `button-outline` "›" → `filter-chip` 3×4 격자(칩 108×52, 사이 8): 1월 ~ 12월, 11월 on, 일정 있는 달(11월 · 12월)은 칩 안 아래 "6건" · "1건" {typography.caption}. 칩을 누르면 닫히고 그 달로 가요. 아래 `button-outline` "오늘로 가기" |
| calendar/1440-month-picker | 1440×900 | D16 · D18 | 같은 내용을 월 제목 바로 아래 4px 띄운 `dropdown`(폭 360, 칩 3×4 격자, 칩 108×44)으로. "오늘로 가기"는 패널 아래 줄 |
| calendar/390-export-sheet | 390×844 | D17 | 내보내기 버튼을 누른 뒤. `bottom-sheet`: 제목 "이번 달 일정 내보내기" {typography.heading-4} → 요약 {typography.body} "11월 일정 6개를 일정 파일(.ics)로 저장해요" → 줄 caption muted "날짜 미정 2개는 빠져요 · 지금 고른 필터 기준이에요" → 안내 {typography.body-sm} "파일은 이 기기에서 만들어요. 서버에 보내지 않아요 · 자동 알림은 보내지 않아요 · 수정한 일정은 다시 내보내 주세요" → 아래 고정 줄 2버튼: 왼쪽 `button-outline` "취소" · 오른쪽 `button-primary` "파일 저장"(각 폭 167, 높이 52). 실패하면 시트를 닫지 않고 두 버튼 위에 notice-row "일정을 내보내지 못했어요. 브라우저 다운로드 권한을 확인해 주세요." |
| calendar/390-export-done | 390×844 | D17 | 시트가 닫힌 뒤 기본 화면 + `toast` "일정 6개를 파일로 저장했어요"(탭바 위 {spacing.md}, 3초 뒤 사라짐) |
| calendar/1440-export-modal | 1440×900 | D17 | 390-export-sheet와 같은 내용을 `modal`(최대 폭 560)로, 버튼은 오른쪽 아래 정렬 "취소" · "파일 저장" |
| calendar/1440-export-done | 1440×900 | D17 | 기본 화면 + 오른쪽 아래 `toast` "일정 6개를 파일로 저장했어요" |

## 6. 문구

| 자리 | 문구 |
|---|---|
| 화면 제목 · 메뉴 | 입시 일정 |
| 리드 | 원서·서류 마감과 고사 날짜를 한곳에서 확인해요. |
| 입력 이동 | 일정 입력·수정 (모바일은 "일정 입력·수정 ›" 링크) |
| 필터 칩 | 전형: 전체 ▾ / 전형: 경희대 행정학과 ▾ / 전형: 삭제되었거나 없는 전형 ▾ · 전체 · 원서·서류 · 면접·논술·실기 · 완료 포함 |
| 전형 고르기 | 지원 전형 고르기 / 전체 전형 / 2028 · 경희대 · 학생부종합 · 행정학과 (학과 없으면 학과 미지정) |
| 보기 전환 | 월간 · 목록 |
| 달 이동 | ‹ · 2026년 11월 · › · 오늘 |
| 칸 | 21 / 2건 |
| 다가오는 일정 | 다가오는 일정 / 오늘 · D-1 / 한양대 정책학과 · 서류 제출 마감 · 11.20(금) 18:00 |
| 다가오는 일정 없음 | 날짜 미정 / 날짜가 확인된 미완료 일정이 없어요. |
| 목록 머리 | 이번 달 일정 · 6개 / 11월 21일(토) 일정 · 2개 / 이번 달 전체 보기 |
| 행 | 경희대 · 행정학과 / 2028학년도 · 학생부종합 · 면접 / A안에 기록 / 11.21(토) / D-1 |
| 상태 글자 | D-n · 오늘 · 기한 지남 · 완료 · 날짜 미정 |
| 일정 이름 | 원서 접수 · 서류 제출 · 서류 제출 마감 · 추천서 제출 · 면접 · 논술 · 실기 (학생이 체크리스트에 적은 이름 그대로) |
| 빈 달 · 빈 날 | 등록한 일정이 없어요. 체크리스트에서 마감일을, 수시로에서 고사 날짜를 입력해 주세요. |
| 전형 0개 | 아직 등록한 전형이 없어요 / 체크리스트에 전형을 담고 마감일을 넣으면 여기에 모여요 / 지원할 전형부터 등록하기 |
| 날짜 미정 묶음 | 날짜 미정 2개 · 입력한 날짜가 없어 달력에 표시하지 않아요 |
| 출처 | 내가 입력한 일정 · 한국 시간 |
| 내보내기 버튼 | 이번 달 6개 .ics 내보내기 |
| 불러오는 중 | 일정을 불러오고 있어요. |
| 없는 전형 | 이 전형을 찾지 못했어요. 전체 전형을 선택하거나 지원 준비 기록을 확인해 주세요. / 전체 전형 보기 |
| 내보내기 실패 | 일정을 내보내지 못했어요. 브라우저 다운로드 권한을 확인해 주세요. |
| 상세 | (일정 이름) / 닫기 / (안 이름)에 기록 · 안마다 고사 날짜가 다르면 각각 표시돼요. / 내가 입력한 일정 · 한국 시간 기준 / 고사 시각은 수시로에 기록되지 않아요. 원문에서 확인해 주세요. / 등록한 원문 확인 ↗ / 일정 수정하러 가기 |
| 겹침 | 면접 일정이 겹쳐요 / 11월 21일(토)에 경희대·건국대 고사가 함께 있어요. 한 곳은 다른 카드로 바꿔 보세요. / 수시로에서 보기 › |
| 달 고르기 | 달 고르기 / 2026년 / 1월 ~ 12월 / 6건 / 오늘로 가기 |
| 내보내기 확인 | 이번 달 일정 내보내기 / 11월 일정 6개를 일정 파일(.ics)로 저장해요 / 날짜 미정 2개는 빠져요 · 지금 고른 필터 기준이에요 / 파일은 이 기기에서 만들어요. 서버에 보내지 않아요 · 자동 알림은 보내지 않아요 · 수정한 일정은 다시 내보내 주세요 / 취소 · 파일 저장 |
| 완료 알림 | 일정 6개를 파일로 저장했어요 |
| 고지 (`disclaimer-note`) | ⓘ 날짜는 내가 저장한 기록이에요. 대학 공식 모집요강에서 최종 확인해 주세요. 날짜 미정 항목은 내보내지 않으며 자동 알림은 전송하지 않아요. 수정한 일정은 다시 내보내 주세요. · 시안의 날짜는 시험용 예시예요 |

문구 점검: 모두 해요체. 결과를 약속하거나 결과 날짜로 읽히는 말("붙는 날" 류), 퍼센트 숫자, rules forbidden_words 3개와 그 붙여 쓴 형태를 쓰지 않아요. 일정 이름에는 결과 발표 · 등록 같은 결과 관련 말을 시안 예시로 넣지 않아요(학생이 적으면 그대로 보일 뿐이에요). "D-n"은 남은 날만 말해요.

## 7. 접근성

- 달력 = 표(caption "2026-11 일정 달력 · 날짜를 누르면 해당 날짜의 일정을 표시해요"), 칸 = 버튼(aria "2026-11-21 일정 2개" / "일정 없음"), 오늘 aria-current=date, 선택 aria-pressed. 오늘 · 선택은 모양(잉크 채움 · 테두리)으로도 구분돼 색에 기대지 않아요.
- 방향키로 칸 이동(앞뒤 날 · 위아래 주), Enter/Space로 선택 · 해제. 달이 바뀌면 "2026년 11월"을 조용한 알림으로 알려요.
- 필터 칩: 일정 종류 3칩 = 라디오 묶음, "완료 포함" = 토글 버튼(aria-pressed), "전형" 칩 = 시트 · 모달을 여는 버튼(aria-haspopup).
- 행 = 버튼(aria "경희대 행정학과 면접 일정 상세"). 상태는 글자라서 색 없이 읽혀요.
- 시트 · 모달 열면 제목으로 포커스, 포커스 가둠, Esc로 닫고 누른 자리로 포커스가 돌아가요. 라디오 행은 방향키.
- 오류 · 안내 줄 role=alert, 불러오는 중 role=status. `toast`는 role=status.
- `dropdown`(PC 전형 · 달 고르기): 누른 칩 · 제목에 aria-expanded, 방향키로 행 이동, Esc · 바깥 누름으로 닫고 누른 자리로 포커스가 돌아가요.
- 숫자 · 날짜 고정폭. 모바일 터치 44 이상(칸 50×48, 칩 터치 44), 포커스 2px 잉크 링. 대비 4.5:1 이상({colors.text-faint}는 비활성 버튼 글자에만).
- 시트 · 모달 240ms, 선택 · 칩 150ms, prefers-reduced-motion이면 바로.

## 8. 디자이너 메모

- 03-draft.json frames = 정확히 2개: calendar/390, calendar/1440. 5장 상태 프레임 27개는 같은 페이지에 그리고 states에만 적어요(모두 확정이라 "[확인] 제안" 라벨은 달지 않아요). states 예정 목록(27):
  - 앱 기능 19: calendar/390-loading · 390-error · 390-no-plans · 390-month-empty · 390-day · 390-day-empty · 390-list · 390-undated · 390-completed · 390-plan-filtered · 390-plan-missing · 390-export-error · 390-detail · 390-plan-sheet · 1440-day · 1440-list · 1440-detail · 1440-plan-dropdown · 1440-no-plans
  - 새 기능 8: calendar/390-overlap · 1440-overlap · 390-month-sheet · 1440-month-picker · 390-export-sheet · 390-export-done · 1440-export-modal · 1440-export-done
- 기본 프레임 두 장에는 늘 보이는 새 기능만 넣어요: 월 제목 "2026년 11월 ▾"(D16), 21일 칸 겹침 ▲(D15). 겹침 `warning-callout`(그날 선택 시) · 달 고르기 · 내보내기 확인 · `toast`는 상태 프레임에만.
- 레이어 이름 = 컴포넌트 이름: `brand-logo`, `sub-nav`, `tab-bar-pill`, `sidebar`, `sidebar-group`, `sidebar-item`, `page-header`, `segmented-control`, `segmented-control-active`, `filter-chip`, `stat-tile`, `button-outline`, `button-primary`, `data-table`, `bottom-sheet`, `modal`, `dropdown`, `toast`, `empty-state`, `warning-callout`, `disclaimer-note`. 달력은 `data-table` 이름 + 설명 "variant=month"(9장 제안 2). 일정 행 · 안내 줄 · 라벨/값 줄은 일반 레이어("event-row" · "notice-row").
- 9장 제안 1~4는 모두 확정이고 오케스트레이터가 design.md에 한 번에 패치해요. 반영된 뒤 제안된 변형 그대로 그려요: 사이드바 입시 일정 icon/calendar(제안 1), 달력 = `data-table` 변형 month(제안 2), 배치는 Responsive Strategy 새 행(제안 3), PC 전형 · 달 고르기 = `dropdown`(제안 4 — 9장의 "반영 전 대체안" `modal`은 쓰지 않아요). 반영 전이면 오케스트레이터에게 알리고 멈춰요. 새 색 토큰은 없어요.
- 모서리 전부 0. 그림자는 `bottom-sheet` · `modal` · `dropdown` · `toast`에만. 판정 색은 겹침 ▲ · `warning-callout`에만(소신 색 쌍). "기한 지남"에 빨강을 쓰지 않아요. 요일 색 없음. 모든 fill · stroke 변수 바인딩.
- 날짜 표기는 "11.21(토)"(앱은 지금 "2026-11-21" ISO로 보여요 — 표기 맞춤은 앱 반영 사항이에요). 시안 값은 1장 표만.
- 대학명 · 학과명은 한 줄 먼저, 넘치면 단어 사이에서만 두 줄.

## 9. design.md 수정 제안 (S3 전에 반영 필요 — 아래 문장을 그대로 넣어요)

design.md를 고치면 rules/design-rules.json source.sha256도 새 해시로 바꿔야 해요(안 바꾸면 J9 실패). 제안 1~3은 새 컴포넌트 이름이 없어 rules components 목록은 그대로예요. 제안 4를 받아들이면 components에 dropdown을 더해야 해요.

1. **App Shell 학생 대분류 — 수시 전략 소분류(필요).** 위치: App Shell › 모바일 › "학생 대분류:" 문장. 앱 nav.ts에 이미 있는 소분류 3개(원서·서류 체크리스트 · 입시 일정 · 상담 질문·할 일)를 넣어요. **바꿀 부분**:
   - 지금: "/ 수시 전략(수시로 · 생기부 AI)."
   - 바꾼 뒤: "/ 수시 전략(수시로 · 원서·서류 체크리스트 · 입시 일정 · 상담 질문·할 일 · 생기부 AI)."
   - 같은 문장 끝(계열 모아보기 아이콘 문장 뒤)에 **추가**: " 입시 일정 소분류 아이콘은 icon/calendar(2026-11-23), 성적 추이는 icon/trending-up으로 바꿔 icon/calendar와 겹치지 않게 합니다."(D2 [확인] — 받아들이지 않으면 이 추가 문장만 빼요)
   - 참고: nav.ts의 대학 찾기 소분류(전형 성향 탐색 · 전국 배치표 · 지원 자격 확인표 · 전형 비교 등)도 design.md 문장과 달라요. 그 화면들 담당 slug에서 고칠 일이라 이 제안에는 넣지 않아요.
2. **data-table 변형 month(달력, 필요).** 위치: Components › data-table 절, "변형 expand(2026-11-23 특수 계열 모아보기): …" 문단 바로 다음 줄에 **추가**:
   > 변형 month(2026-11-23 입시 일정): 한 달을 7열(일~토) 표로 보여 주는 달력입니다. 머리글 {colors.canvas-soft} + {typography.table-head}, 칸 구분 1px {colors.hairline-soft}, 요일 글자에 색을 쓰지 않습니다. 칸 = 날짜 숫자 {typography.table} 고정폭 + 일정이 있으면 아래 "n건" {typography.caption} {colors.ink}(일정 이름 막대 · 색 점은 쓰지 않음). 칸 전체가 버튼이고 모바일 칸은 50×48(44 이상), PC 칸은 높이 88입니다. 오늘 = 날짜 숫자를 24×24 {colors.primary} 채움 정사각 + {colors.on-primary} 글자로, 선택한 날 = 칸 전체 {colors.accent-soft} + 1px {colors.accent} 안쪽 테두리(Elevation Selected의 칸 버전), 다른 달 칸은 비웁니다. PC 호버 = Elevation 3. 경고가 있는 날은 "n건" 옆 ▲ {colors.judge-reach}를 두고 이름은 목록의 warning-callout과 칸 대체 텍스트로 읽히게 합니다. 모바일에서도 카드 목록으로 바꾸지 않고 표로 둡니다.
3. **Responsive Strategy 행 추가(필요).** 위치: Responsive Strategy 표, "수시로" 행 바로 다음에 **추가**(탭으로 칸 구분):
   > 입시 일정(2026-11-23)	제목 + 월간 · 목록 세그먼트 → 다가오는 일정 stat-tile → filter-chip 한 줄(전형 ▾ · 일정 종류 · 완료 포함, 전형은 바텀시트) → 달 이동 + data-table 변형 month → 이번 달(또는 고른 날) 일정 목록 → 날짜 미정 접힘 → .ics 내보내기 → 고지. 일정 상세는 바텀시트	왼쪽 달력(data-table 변형 month) + 오른쪽 360 패널(다가오는 일정 stat-tile → 일정 목록 → 날짜 미정 · 내보내기), 위에 filter-chip 한 줄 + 오른쪽 월간 · 목록 세그먼트. 목록 보기는 왼쪽이 data-table로 바뀝니다. 일정 상세는 모달
4. **dropdown — PC 떠 있는 선택 패널([확인], 선택).** 위치: Components › Overlays, "modal — PC 확인·편집" 절 바로 다음에 **추가**:
   > dropdown — PC 선택 패널(2026-11-23 입시 일정): 칩·제목 같은 누른 자리 바로 아래 4px 띄워 여는 떠 있는 목록입니다. {colors.canvas} 채움 + 1px {colors.hairline}, 모서리 0, {shadow.overlay}, 폭 = 누른 요소 이상 최대 360, 행 높이 40 {typography.body}, 선택 행 = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대. 바깥을 누르거나 Esc로 닫고, 행을 고르면 바로 닫힙니다. 모바일에서는 bottom-sheet로 바꿉니다. 확인·편집처럼 버튼이 있는 내용에는 modal을 씁니다.
   - 반영 전 대체안: PC 전형 고르기 · 달 고르기를 `modal`(최대 폭 560)로 그려요(1440-plan-modal · 1440-month-picker).

체크박스 · 진행 막대 · 날짜 선택 · select는 새로 제안하지 않아요: 체크박스("완료 포함")와 select("일정 종류")는 `filter-chip`으로, select("지원 전형")는 `bottom-sheet` / `modal` 라디오 행으로, 날짜 선택은 이 화면에 입력이 없어 필요 없어요.

rules(사람이 고쳐요): `requires_disclaimer_note`에 calendar를 더하길 권해요(이 화면에 고지가 꼭 있어야 해서 G2가 지켜 주게). `requires_trace_accordion`은 계산이 없어 더하지 않아요.
