# 02-spec — 지원 자격 확인표 (eligibility-check, 학생)

작성일 2026-11-23 · 담당 planner (S2) · 초판
근거: 01-research.md(0장 앱 상태 · 팝업, P1~P9, 4절 미결 1~7), docs/design.md(커밋 9eee67e: App Shell, Elevation, Components — stat-tile · data-status-badge(fact) · text-input(on · size) · button-danger-text · bottom-sheet · modal · toast · empty-state · disclaimer-note · sub-nav · sidebar-item, Voice, Accessibility), docs/prd.md(6-1 전형 상세 "지원자격(재학생 한정 여부, 학교장 추천 인원)", 8장 AdmissionProgram.eligibility, 13장), docs/story-service.md NEVER-1/2, 앱 `app/src/screens/Preparation.tsx`(view="eligibility") · `components/PlanEditor.tsx` · `domain/planner.ts` · `shell/nav.ts`.
사용자 요청(오케스트레이터 전달): 앱에는 있는데 시안이 없는 기능과 그 안의 팝업(Modal · 확인 창 · 바텀시트 · toast)을 빠짐없이 그려요. 01-research 0장의 상태 · 팝업을 모두 상태 프레임으로 옮기고, 앱에 없는 새 기능 제안은 [확인]으로 구분해요.

이 화면은 **학생이 모집요강을 보며 직접 적는 확인 기록**이에요. 서비스가 자격을 판정하지 않고, 계산 · 환산 숫자가 없어요(NEVER-1 대상 없음). 상태 이름은 모두 "내가 확인한 기록"으로 읽히는 앱 문구 그대로예요(충족으로 확인 · 미충족으로 확인). 합격 · 지원 결과를 말하는 문장은 넣지 않아요(NEVER-2).
프레임: eligibility-check/390 (390×844), eligibility-check/1440 (1440×900). 상태 프레임 30장(5장).
`trace-accordion` · `disclaimer-note`: rules 필수 대상이 아니에요(계산 · 판정 없음). 앱의 "직접 작성하는 확인표예요 …" 안내를 `disclaimer-note` 모양으로 그려요(D9).

표기: **확정** = 앱 동작 · 문구를 그대로 옮기거나 design.md 규칙에서 바로 나오는 결정. **확정(새 기능)** = 앱에 없는 새 기능 · 새 문구로, 초판에서 [확인]이던 항목이에요. 2026-11-23 사용자 결정(채팅)으로 모두 확정했어요: 새 기능은 전부 넣고, 열린 디자인 선택은 이 설계서 기본안대로, design.md 수정 제안(9장)은 오케스트레이터가 한 번에 반영해요. 남은 [확인] 항목은 없어요.

## 0. 결정

| # | 항목 | 결정 | 이유 |
|---|---|---|---|
| D1 | 메뉴 위치 — 확정(앱) | 앱 `shell/nav.ts` 학생 › **대학 찾기** › "지원 자격 확인표"(될각 다음, 전형 비교 앞). 모바일 `sub-nav`, PC `sidebar-item` 선택. 모바일 하단 `tab-bar-pill` = 대학 찾기 선택. design.md App Shell 학생 대분류 목록에 이 메뉴가 없어서 9장 제안 1로 문장을 바꿔요 | 앱이 이미 이 자리에 있어요. 하네스는 앱 메뉴를 바꾸지 않아요 |
| D2 | 소분류 아이콘 — 확정(2026-11-23 사용자 결정) | **icon/clipboard-check**(9장 제안 1 · 7, 오케스트레이터가 work/icons에 추가). 앱은 icon/check인데 같은 학생 사이드바의 모의고사 · 원서·서류 체크리스트와 겹쳐요 | design.md sidebar-item "다른 메뉴 아이콘과 겹치지 않습니다" |
| D3 | 상태 4종 표시 — 확정(기본안, 2026-11-23 사용자 결정) | **흑백 + 아이콘 + 이름, 판정 색 없음.** `data-status-badge` 변형 self(9장 제안 3): 채움 {colors.canvas} + 1px {colors.hairline} + {colors.ink-soft} 글자 {typography.label}, 높이 24, 왼쪽 아이콘 12. 확인 필요 = icon/circle-help · 충족으로 확인 = icon/check · 미충족으로 확인 = icon/x · 해당 없음 = icon/minus(9장 제안 7로 추가) | 학생이 적은 기록이라 될각 판정 색(안정 · 위험 등)을 쓰면 서비스 판정으로 읽혀요(01 P2 · 미결 2). 수능 최저 배지(위험 쌍 ✕)와도 섞이지 않게 해요. design.md "판정 색을 장식이나 카테고리 구분에 쓰지 마세요" |
| D4 | 요약 — 확정 | `stat-tile` 2개(같은 흰 카드 2장, hero 아님): ① "내 확인 상태" = 요약 4종 글자(확인 항목 없음 · 미충족 기록 있음 · 확인 필요 · 확인 기록 완료), 값 {typography.heading-4} {colors.ink}, 아이콘 없음 ② "확인 필요" = unknown 개수 {typography.numeric} + 보조 "전체 5개 중" {typography.body-sm}. 진행 막대 · 원형 · 퍼센트 없음. Route Blue 숫자 없음 | 01 P4. 같은 무게 타일 2개는 design.md 허용(3개 이상 금지). "완료율"처럼 읽히는 표시를 피해요 |
| D5 | 상태 바꾸기 — 확정(앱 흐름) + 모양 확정(새 기능) | 상태는 **M2 자격 조건 확인 팝업 안에서만** 바꿔요(앱 그대로). 앱의 select를 **단일 선택 목록 4줄**로 펼쳐 그려요(9장 제안 5): 행 = 상태 아이콘 + 이름 {typography.title} + 설명 한 줄. 고른 행 = Elevation Selected({colors.accent-soft} + 왼쪽 3px {colors.accent}) + 오른쪽 icon/check {colors.accent} | 01 P3 · L3~L5. 네 가지가 한눈에 보여요. Route Blue는 선택 표시라 design.md 허용 |
| D6 | select 그리기 — 확정(9장 제안 4 변형 select) | 앱의 select 2곳("준비할 전형", M1 "등록된 전형에서 선택")은 `text-input` 변형 select: 오른쪽 icon/chevron-down 16으로 그려요. 누르면 모바일 = `bottom-sheet` 단일 선택 목록, PC = Overlay 드롭다운({colors.canvas} + {shadow.overlay}, 노드 이름 "dropdown", 옵션 행 40, 고른 옵션 = accent-soft + 오른쪽 icon/check) | design.md에 select 컴포넌트가 없어요. result-summary 02-spec 제안 1과 같은 방식 |
| D7 | 삭제 버튼 위계 — 확정 | 카드 · 전형 카드의 삭제 트리거 = `button-danger-text`("전형 삭제", "삭제"). 확인 팝업(M3 · M4) 안 실행 = `button-primary` "삭제"(잉크, 앱 그대로) + `button-outline` "취소". 확인 팝업 안에 위험색 채움 버튼은 없어요 | design.md button-danger-text "누르면 반드시 확인 모달". 팝업 안 주요 버튼은 1개(잉크) |
| D8 | 카드 버튼 글자 — 확정(기본안) | 앱은 "전형별 지원 자격 수정" · "전형별 지원 자격 삭제"처럼 항목 이름을 붙여요. 시안은 보이는 글자를 **"수정" · "삭제"**로 줄이고, 화면 읽기 이름은 앱처럼 "전형별 지원 자격 수정"으로 둬요 | 긴 조건 이름이면 버튼이 두 줄이 돼요(390 카드 안쪽 318) |
| D9 | 안내 — 확정 | 앱 안내 문장을 목록 바로 위 `disclaimer-note` 모양(ⓘ + {typography.caption} {colors.text-muted})으로. 문구는 6장 그대로. 바닥 저장 위치 캡션은 화면 맨 아래 일반 caption | 01 P9. "최종 지원 자격은 학교·대학에 확인해요"가 핵심 고지예요 |
| D10 | 이어서 갈 곳 링크 5개 — 확정(앱) + 배치 | 전형 카드 아래 "이 전형으로 이어서" caption + `button-outline` 5개: 원서·서류 확인하기 · 상담 질문·할 일 · 수시로에서 카드 담기 · 이 전형 일정 보기 · 관심 전형 모아보기. **모바일 = 가로 스크롤 한 줄**(높이 44, 사이 8, 오른쪽 여백 0이라 넷째 버튼이 잘려 보여요). PC = 한 줄(높이 40) | 01 미결 5. 세로로 쌓으면 220px가 늘어 항목 카드가 첫 화면에서 밀려나요 |
| D11 | 대학 표시 — 확정(새 기능) | 전형 카드 제목 앞에 `univ-logo` 32(모바일) / 40(PC). M1에서 "등록된 전형에서 선택"으로 고른 전형만 로고, 직접 입력이면 `univ-monogram` | design.md Do "대학은 univ-logo로". 앱은 로고가 없어요 |
| D12 | 주요 버튼 — 확정 | PC `page-header` 오른쪽 `button-primary` "+ 지원 전형 추가"(앱 그대로, 화면에 1개). 모바일은 첫 화면 폭이 좁아 고르기 카드 안 `button-pill-soft` "+ 지원 전형 추가"(높이 44). "+ 자격 조건 추가" = `button-outline` | design.md "한 화면에 주요 버튼은 하나" |
| D13 | 빈 화면(전형 없음) — 확정(문구) + 버튼 확정(새 기능) | `empty-state`: 흑백 선 아이콘(icon/file-text) → "준비할 전형을 먼저 추가해 주세요" {typography.heading-4} → 앱 설명 {typography.body-sm} → `button-primary` "+ 지원 전형 추가". 앱은 버튼이 머리에만 있어요. 시안은 **empty-state 안에 버튼을 두고 PC page-header의 주요 버튼은 숨겨요**(주요 버튼 1개 유지) | design.md empty-state "button-primary 하나". 01 P8 |
| D14 | 항목 0개 — 확정(요약) + 빈 칸 확정(새 기능) | 항목을 모두 지운 전형: 요약 "확인 항목 없음" · 확인 필요 0(앱 그대로). 목록 자리에 점선 1px {colors.hairline} 칸 + "확인 항목이 없어요 · 아래 '+ 자격 조건 추가'로 모집요강의 조건을 적어 보세요" {typography.body-sm} {colors.text-muted} | 앱은 목록 자리가 비어요. 01 P8 · L14 |
| D15 | 저장 성공 알림 — 확정(새 기능) | M2 저장 뒤 `toast` "자격 조건을 저장했어요"(모바일 탭바 위, PC 오른쪽 아래, 3초). 앱은 저장 성공 문구가 없어요 | design.md toast 예시 "저장했어요". 시트가 닫힌 뒤 저장됐는지 알 수 있어요 |
| D16 | 조건 이름 바꾸면 상태 되돌림 안내 — 확정(새 기능) | 앱은 M2에서 조건 이름을 바꾸면 상태를 "확인 필요"로 조용히 되돌려요. 시안은 이름 칸 아래 caption {colors.text-muted} "조건 이름을 바꾸면 확인 상태가 '확인 필요'로 돌아가요"를 이름을 고친 순간에만 보여요 | 말없이 바뀌면 학생이 놓쳐요 |
| D17 | 확인 기록 시각 표기 — 확정(기본안) | 시안 = "확인 기록 2026-11-18 16:40"(고정폭 숫자). 앱은 ko-KR 로캘 표기("2026. 11. 18. 오후 4:40:00")라 구현을 맞춰야 해요 | design.md 날짜 tabular, 문장 짧게 |
| D18 | 상태 색 · 경고 색 쓰지 않는 곳 — 확정 | M1 정체성 변경 경고 · 중복 안내 = {colors.canvas-soft} 채움 칸(Level 1) + icon/triangle-alert(경고) 또는 icon/info(안내) {colors.ink} + {typography.body-sm} {colors.ink}. `warning-callout`(소신 색 쌍)은 쓰지 않아요. 오류 줄 · 링크 형식 오류만 위험 쌍(design.md "입력 오류는 위험 색 쌍") | 판정 색을 판정 · 오류가 아닌 곳에 쓰지 않아요 |
| D19 | 앱에 없는 것 중 그리지 않는 것 | ① 카드에서 상태를 바로 바꾸는 빠른 선택 — 그리지 않아요(상태 · 근거 메모 · 시각을 한 곳에서 함께 남기는 흐름 유지) ② 전형계획 데이터(PRD 8장 eligibility)로 항목 미리 채우기 — 범위 밖(검수 데이터 연결 필요, 01 미결 6). 나중에 하면 `data-status-badge` "모집요강 반영 · 기준일"과 원문 쪽수를 함께 둬야 해요 ③ 기본 항목마다 부연 한 줄(01 P1) — 새 문구라 넣지 않고, 빈 메모 안내 문장이 그 역할을 해요 | 새 기능은 최소로 |

## 1. 시안 데이터 (가상 · 시험용)

모든 값은 시안 시험용이에요(실제 모집요강 확인 결과 아님). 대학 이름은 demo-dataset 관심 대학, **전형 이름 · 메모 · 시각은 새 값**이라 work/_data/demo-dataset.md에 추가가 필요해요(이 파일은 직접 고치지 않아요). 시안의 "오늘" = 2026-11-20(demo-dataset).

등록한 전형 4개("준비할 전형" 목록 순서):
1. 2028 · 경희대학교 · 지역균형전형 · 행정학과 ← 기본 선택, 모집요강 링크 있음, 로고 있음
2. 2028 · 성균관대학교 · 학교장추천전형 · 행정학과(로고 있음, 링크 없음)
3. 2028 · 동국대학교 · 학교장추천인재전형 · 행정학과
4. 2028 · 중앙대학교 · 지역균형전형 · 공공인재학부

기본 전형(경희대학교)의 항목 5개 — 기본 프레임(섞임, 01 S-e):

| # | 조건 | 상태 | 메모 | 자료 링크 | 확인 기록 |
|---|---|---|---|---|---|
| 1 | 전형별 지원 자격 | 충족으로 확인 | 국내 고교 졸업 예정자 · 모집요강 12쪽 확인 | 있음 | 2026-11-18 16:40 |
| 2 | 졸업연도·재학 조건 | 충족으로 확인 | 2028년 2월 졸업 예정자만 · 졸업생 제외 | 있음 | 2026-11-18 16:42 |
| 3 | 지역·학교 조건 | 해당 없음 | 지역 제한이 없는 전형이에요 | 없음 | 2026-11-19 09:10 |
| 4 | 학교장추천 필요 여부 | 확인 필요 | (빈 메모 → 안내 문장) | 없음 | 아직 확인하지 않음 |
| 5 | 사회 진로선택 이수 과목 수 | 미충족으로 확인 | 지금 2과목 이수 · 모집요강 3과목 이상 · 3학년 수강 계획을 담임 선생님께 문의 | 있음 | 2026-11-19 21:05 |

요약: 내 확인 상태 "미충족 기록 있음" · 확인 필요 1(전체 5개 중).
다른 상태 프레임 값: 390-new = 새 전형(중앙대학교) 기본 4항목 모두 확인 필요 · 요약 "확인 필요" · 4(전체 4개 중). 390-complete = 경희대학교 5항목 중 4번 → 충족으로 확인, 5번 → 충족으로 확인(메모 "3학년 1학기 진로선택 1과목 추가 수강 확정") · 요약 "확인 기록 완료" · 0.

## 2. 모바일 390×844 (frame eligibility-check/390)

앱 셸: 바탕 Page {colors.canvas-soft}, 내용은 테두리 없는 흰 카드. 화면 제목 → `sub-nav` → 본문 → 하단 `tab-bar-pill`(대학 찾기 선택). 좌우 여백 20(콘텐츠 350), 카드 패딩 16, 카드 사이 12, 섹션 간격 {spacing.xl}. 마지막 요소 아래 여백은 탭바 높이만큼.
첫 화면에 M1~M5와 M6 안내, 첫 항목 카드 윗부분까지 보이고 나머지는 스크롤이에요.

| # | 구성 요소 | 컴포넌트 | 내용 · 문구 |
|---|---|---|---|
| M1 | 화면 제목 | 텍스트 | "지원 자격 확인표" {typography.heading-1} → 리드 {typography.body-lg} "모집요강을 확인하며 내 조건과 필요한 증빙을 정리해요." |
| M2 | 소분류 탭 | `sub-nav` | 대학 찾기 소분류(9장 제안 1 반영 목록): 전형계획 · 수시 입결 · 학과별 구간 · 계열 모아보기 · 될각 · **지원 자격 확인표**(선택) · 최저로 찾기. 넘치면 가로 스크롤, 선택 탭이 보이게 처음 위치를 맞춰요 [D1] |
| M3 | 고르기 카드 | 흰 카드, `text-input`, `button-pill-soft` | caption {colors.text-muted} "준비할 전형" → `text-input` 선택형 size=md(44, 폭 318, icon/chevron-down) 값 "2028 · 경희대학교 · 지역균형전형 · 행정학과"(한 줄 넘치면 말줄임, 전체 이름은 시트에서) → 아래 `button-pill-soft` "+ 지원 전형 추가"(높이 44, 왼쪽 정렬). 선택 칸을 누르면 `bottom-sheet`(390-plan-picker) [D6, D12] |
| M4 | 전형 카드 | 흰 카드, `univ-logo`, `button-outline`, `button-danger-text` | caption {colors.text-muted} "2028학년도 · 내가 등록한 전형" → 한 줄: `univ-logo` 32 + "경희대학교 · 지역균형전형" {typography.heading-3}(넘치면 단어 사이 두 줄) → "행정학과" {typography.body-sm} {colors.text-muted}(없으면 "모집단위 미입력") → 링크 "등록한 자료 열기 ↗" {typography.link} {colors.accent}(없으면 "자료 링크 미등록" {colors.text-muted}) → 버튼 줄: `button-outline` "전형 정보 수정"(44) + `button-danger-text` "전형 삭제" → 위 1px {colors.hairline-soft} → caption "이 전형으로 이어서" → `button-outline` 5개 가로 스크롤 한 줄(D10) [D7, D10, D11] |
| M5 | 요약 | `stat-tile` ×2 | 한 줄: 왼쪽 타일(폭 214) 라벨 "내 확인 상태" → 값 "미충족 기록 있음" {typography.heading-4}. 오른쪽 타일(폭 124) 라벨 "확인 필요" → 값 "1" {typography.numeric} → 보조 "전체 5개 중" {typography.body-sm}. 숫자 고정폭, Route Blue 없음 [D4] |
| M6 | 안내 | `disclaimer-note` | ⓘ "아래는 직접 작성하는 확인표예요. 공통 항목 중 적용되지 않는 것은 '해당 없음'으로 표시해 주세요. 추천 배정이나 최종 지원 자격은 학교·대학에 확인해요." [D9] |
| M7 | 항목 카드 목록 | 흰 카드 ×5, `data-status-badge`, `button-outline`, `button-danger-text` | 카드 1장 = 첫 줄 왼쪽 조건 이름 {typography.heading-4}(두 줄까지), 오른쪽 위 `data-status-badge` 변형 self(상태 1개) → 메모 {typography.body-sm} {colors.ink}(빈 메모면 "확인한 조건·근거 또는 문의할 담당자를 기록해 주세요." {colors.text-muted}) → 링크 "등록한 자료 열기 ↗" 또는 "자료 링크 미등록" → caption {colors.text-muted} "확인 기록 2026-11-18 16:40"(없으면 "아직 확인하지 않음") → 버튼 줄 `button-outline` "수정"(44) + `button-danger-text` "삭제". 카드 순서 = 등록 순서(1장 표) [D3, D8, D17] |
| M8 | 추가 | `button-outline` | "+ 자격 조건 추가" 폭 350, 높이 44. 항목 50개면 꺼짐(390-limit) |
| M9 | 저장 위치 | 텍스트 | caption {colors.text-muted} "준비 기록은 이 브라우저에 저장돼요. 암호화 백업·복원에 함께 포함돼요."("암호화 백업·복원" = 링크 {colors.accent}, 성적 입력의 백업으로 이동) |

## 3. PC 1440×900 (frame eligibility-check/1440)

앱 셸: 왼쪽 `sidebar` 248(위 `brand-logo`, 대학 찾기 `sidebar-group` 펼침, 소분류 7행 중 "지원 자격 확인표" `sidebar-item` 선택), 콘텐츠 Page {colors.canvas-soft}, 좌우 패딩 32, 콘텐츠 폭 1080(왼쪽 정렬). 위 여백 32.

| # | 구성 요소 | 컴포넌트 | 내용 · 문구 |
|---|---|---|---|
| P1 | 화면 머리 | `page-header`, `button-primary` | 왼쪽 caption "대학 찾기" → "지원 자격 확인표" {typography.heading-1} → 리드 {typography.body-lg}(M1 문구). 오른쪽 `button-primary` "+ 지원 전형 추가"(44). 데이터 기준일 배지 없음(서비스 데이터가 없는 화면) [D12] |
| P2 | 전형 카드 | 흰 카드(패딩 24), `text-input`, `univ-logo`, `button-outline`, `button-danger-text` | 1줄: caption "준비할 전형" + `text-input` 선택형 size=sm(40, 폭 440). 2줄: `univ-logo` 40 + caption "2028학년도 · 내가 등록한 전형" / "경희대학교 · 지역균형전형" {typography.heading-3} / "행정학과" {typography.body-sm} {colors.text-muted} / "등록한 자료 열기 ↗". 같은 줄 오른쪽 끝 `button-outline` "전형 정보 수정"(40) + `button-danger-text` "전형 삭제". 3줄: 위 1px {colors.hairline-soft} → caption "이 전형으로 이어서" + `button-outline` 5개 한 줄(40) [D6, D7, D10, D11] |
| P3 | 요약 + 안내 | `stat-tile` ×2, `disclaimer-note` | 한 줄: 타일 2개(각 폭 240, M5와 같은 내용) + 오른쪽 남은 폭(552)에 `disclaimer-note`(M6 문구, 세로 가운데) [D4, D9] |
| P4 | 항목 카드 그리드 | 흰 카드(패딩 24), `data-status-badge`, `button-outline`, `button-danger-text` | 2열(각 528, 사이 24), 등록 순서로 왼쪽 → 오른쪽. 카드 안 구성은 M7과 같고 버튼 높이 40. 첫 화면에 1~4번 카드 윗부분까지 보여요 |
| P5 | 추가 | `button-outline` | "+ 자격 조건 추가"(40), 그리드 아래 왼쪽 |
| P6 | 저장 위치 | 텍스트 | M9와 같음 |

## 4. 규칙 · 데이터

- 데이터 = 이 브라우저 IndexedDB의 학생 준비 기록(ApplicationPlan.eligibility: title · status · note · source_url · checked_at). 서버 데이터 · 검수 데이터 · 계산 없음. **NEVER-1 대상 계산이 없어요.**
- 상태 4종 키 → 이름: unknown 확인 필요 · met 충족으로 확인 · unmet 미충족으로 확인 · na 해당 없음(앱 eligibilityStates 그대로).
- 요약 우선순위(앱 eligibilitySummary): 항목 0개 = 확인 항목 없음 → unmet 1개 이상 = 미충족 기록 있음 → unknown 1개 이상 = 확인 필요 → 나머지 = 확인 기록 완료.
- 확인 기록 시각: 상태가 unknown이 아니게 저장될 때 기록, 조건 이름을 바꾸면 상태 · 시각이 비워져요.
- 링크는 https:// 주소만(앱 safeSourceUrl). 항목 · 단계 각 50개까지.
- 전형 정체성(학년도 · 대학 · 전형 · 모집단위)을 바꾸면 체크리스트 · 자격 항목의 상태 · 근거 · 메모를 초기화(M1 경고).
- PRD 8장 AdmissionProgram.eligibility(graduates_allowed · school_recommendation_limit)는 이 화면에 연결하지 않아요(D19 ②).

## 5. 상태 프레임 (03-draft.json states에만 적고 frames에는 넣지 않아요)

이름 = `eligibility-check/<상태>`. 01-research 0-3 화면 상태(S-a~S-i)와 0-4 팝업(M1~M4)을 모두 옮겼어요. 팝업은 모바일 `bottom-sheet`(손잡이, {shadow.overlay}, 뒤 {colors.scrim}), PC `modal`(최대 폭 560, 닫기 ✕, 뒤 scrim). 시트 · 모달 안 버튼 줄 = 아래 고정, `button-primary` 왼쪽 + `button-outline` "취소" 오른쪽(모바일은 둘 다 폭 반씩, 높이 52 · 44 → 둘 다 52로 맞춤).

| 프레임 | 크기 | 01 대응 | 무엇을 그리나 |
|---|---|---|---|
| eligibility-check/390-loading | 390×844 | S-a | M1 · M2 아래 본문 자리에 "준비 기록을 읽고 있어요." {typography.body-sm} {colors.text-muted}만. M3 "+ 지원 전형 추가"는 꺼짐({colors.text-faint}) |
| eligibility-check/390-load-error | 390×844 | S-b | 본문 자리에 오류 줄: icon/triangle-alert + {typography.body-sm} {colors.judge-risk} "준비 기록을 읽지 못했어요. 화면을 새로 고친 뒤 다시 확인해 주세요."(문구는 앱 state.error, 시안 예시) [D18] |
| eligibility-check/390-empty | 390×844 | S-c | M1 · M2 아래 `empty-state`(D13 문구), 버튼 "+ 지원 전형 추가". 고르기 · 전형 카드 · 요약 · 목록 없음. M9 캡션은 남겨요 [D13] |
| eligibility-check/1440-empty | 1440×900 | S-c | page-header 주요 버튼 숨김, 콘텐츠 가운데 `empty-state`(폭 480) [D13] |
| eligibility-check/390-new | 390×844 | S-d | 새 전형(중앙대학교 · 지역균형전형 · 공공인재학부, 링크 미등록, `univ-monogram` "중") 직후. 요약 "확인 필요" · 4(전체 4개 중). 카드 4장 모두 "확인 필요" 배지 + 빈 메모 안내 + "아직 확인하지 않음" |
| eligibility-check/390-complete | 390×844 | S-f | 1장 390-complete 값. 요약 "확인 기록 완료" · 0(전체 5개 중). 배지 = 충족으로 확인 4 · 해당 없음 1 |
| eligibility-check/390-no-items | 390×844 | (항목 0개) | 요약 "확인 항목 없음" · 0(전체 0개 중), 목록 자리 D14 점선 칸 [D14] + "+ 자격 조건 추가" |
| eligibility-check/390-limit | 390×844 | S-i | 목록 끝(50번째 카드 아래)으로 스크롤한 모습. "+ 자격 조건 추가" 꺼짐(글자 {colors.text-faint}, 테두리 {colors.hairline-soft}) + 아래 caption {colors.text-muted} "항목은 50개까지 적을 수 있어요"(새 문구 확정 — 앱은 꺼지기만 해요) |
| eligibility-check/390-plan-picker | 390×844 | (select 열림) | "준비할 전형"을 누른 뒤 `bottom-sheet`: 제목 "준비할 전형" {typography.heading-4} → 단일 선택 목록 4줄(1장 목록, 행 48, 전체 이름 두 줄까지), 1번 행 Selected + icon/check. 고르면 바로 닫히고 화면이 그 전형으로 바뀌어요(주소 ?plan=). 버튼 없음 [D6] |
| eligibility-check/1440-plan-picker | 1440×900 | (select 열림) | 선택 칸 바로 아래 드롭다운(노드 "dropdown", 폭 440, 옵션 행 40, 1번 행 accent-soft + icon/check, {shadow.overlay}) [D6] |
| eligibility-check/390-plan-add | 390×844 | M1 추가 | `bottom-sheet`(화면 높이 약 90%, 안쪽 스크롤): 제목 "지원 전형 추가" → `text-input` 선택형 "등록된 전형에서 선택" 값 "직접 입력" → 라벨 + `text-input`: 학년도 "2028" · 대학명 · 전형명 · 모집단위(선택) → 모집요강 링크(선택) placeholder "https://" {colors.text-faint} → 버튼 줄 `button-primary` "저장" + `button-outline` "취소". 첫 칸(등록된 전형에서 선택)에 포커스 링 2px {colors.ink} |
| eligibility-check/1440-plan-add | 1440×900 | M1 추가 | `modal`: 같은 내용. 학년도 · 모집단위 / 대학명 · 전형명은 2열(각 240) |
| eligibility-check/390-plan-edit-warning | 390×844 | M1 수정 ① | 제목 "지원 전형 수정"("등록된 전형에서 선택" 없음). 전형명을 "학생부종합"으로 바꾼 상태 → 입력칸 아래 경고 칸(D18: canvas-soft + icon/triangle-alert {colors.ink}) "대학·전형·모집단위·학년도를 바꾸면 기존 체크 항목과 자격 조건의 확인 상태·기한·근거·메모를 초기화해요. 다른 전형을 준비하려면 ‘지원 전형 추가’를 이용해 주세요." → "저장" · "취소" |
| eligibility-check/390-plan-duplicate | 390×844 | M1 추가 ② | "등록된 전형에서 선택"으로 경희대학교 · 지역균형전형 · 행정학과를 고른 상태(칸이 채워짐) → 안내 칸(canvas-soft + icon/info) "같은 학년도·대학·전형·모집단위의 준비 기록이 있어요. 기존 체크리스트와 메모를 유지하고 그 기록을 열어요." → 주요 버튼 글자가 **"기존 준비 기록 열기"**로 바뀜 + "취소" |
| eligibility-check/1440-plan-saving | 1440×900 | M1 ③ | 1440-plan-add에 값을 채우고 저장을 누른 순간: 주요 버튼 "저장 중"(꺼짐 모양 = 채움 {colors.ink} 유지, 글자 옆 작은 진행 표시 없이 글자만), 모든 입력 · "취소" 꺼짐, ✕ 꺼짐(Esc 막힘) |
| eligibility-check/1440-plan-error | 1440×900 | M1 ④ | 모집요강 링크에 "http://…" → 그 칸 `text-input-error` + 아래 caption {colors.judge-risk} "링크는 https:// 주소를 사용해 주세요." + 버튼 줄 위 오류 줄(icon/triangle-alert + {colors.judge-risk}) "준비 기록의 항목·날짜·링크를 확인해 주세요. 링크는 https:// 주소를 사용해 주세요." |
| eligibility-check/390-item-edit | 390×844 | M2 기존 | 4번 "학교장추천 필요 여부" 수정을 누른 뒤 `bottom-sheet`: 제목 "자격 조건 확인" → `text-input` "확인할 조건" 값 "학교장추천 필요 여부" → 소제목 "내 확인 상태" {typography.label} {colors.text-muted} + 단일 선택 목록 4줄(D5, 행 48): 확인 필요(선택됨) "아직 모집요강에서 확인하지 않았어요" · 충족으로 확인 "모집요강 조건과 내 상황이 맞는 걸 확인했어요" · 미충족으로 확인 "모집요강 조건과 내 상황이 맞지 않는 걸 확인했어요" · 해당 없음 "이 전형에는 없는 조건이에요" → `text-input` "모집요강·확인 자료 링크" → `text-input` 여러 줄(높이 112) "조건·확인 근거·문의할 담당자" → caption "증빙 원본을 올릴 필요는 없어요. 확인한 내용과 필요한 다음 행동을 기록해 주세요." → "저장" · "취소" [D5] |
| eligibility-check/1440-item-edit | 1440×900 | M2 기존 | `modal`: 같은 내용, 상태 목록 행 40. 뒤 카드 4번이 보이는 위치 |
| eligibility-check/390-item-add | 390×844 | M2 새 항목 | "+ 자격 조건 추가" 뒤: 제목 "자격 조건 확인", 모든 칸 빈 값(조건 칸에 포커스), 상태 = 확인 필요 선택 |
| eligibility-check/390-item-rename | 390×844 | M2 이름 변경 | 5번 항목 이름을 "사회 진로선택 이수 과목"으로 고친 순간: 상태가 확인 필요로 돌아가 선택 행이 바뀌고 이름 칸 아래 caption "조건 이름을 바꾸면 확인 상태가 '확인 필요'로 돌아가요" [D16] |
| eligibility-check/390-busy | 390×844 | S-g | 390-item-edit에서 저장을 누른 순간: 주요 버튼 "저장 중", 입력 · 상태 목록 · "취소" 꺼짐, 손잡이 끌어 닫기 막힘. 뒤 화면 버튼도 꺼짐 |
| eligibility-check/390-save-error | 390×844 | S-h 실패 | 390-item-edit 링크 칸 "http://example" → `text-input-error` + 버튼 줄 위 오류 줄 "준비 기록의 항목·날짜·링크를 확인해 주세요. 링크는 https:// 주소를 사용해 주세요." |
| eligibility-check/390-toast | 390×844 | (저장 성공) | 시트가 닫히고 4번 카드가 "충족으로 확인" + "확인 기록 2026-11-20 10:12"로 바뀐 기본 화면, 탭바 위 `toast` "자격 조건을 저장했어요" [D15] |
| eligibility-check/390-plan-delete | 390×844 | M3 | "전형 삭제" 뒤 `bottom-sheet`(짧은 시트): 제목 "지원 전형을 삭제할까요?" {typography.heading-4} → {typography.body} "경희대학교의 체크리스트·자격 확인 기록을 삭제해요. 연결된 상담 질문·할 일은 전형 연결만 해제하고 보관해요." → `button-primary` "삭제" + `button-outline` "취소" [D7] |
| eligibility-check/1440-plan-delete | 1440×900 | M3 | `modal`(폭 480): 같은 내용 |
| eligibility-check/390-item-delete | 390×844 | M4 | 5번 카드 "삭제" 뒤 짧은 `bottom-sheet`: "확인 항목을 삭제할까요?" → "사회 진로선택 이수 과목 수의 상태와 메모도 함께 지워져요." → "삭제" · "취소" |
| eligibility-check/1440-item-delete | 1440×900 | M4 | `modal`(폭 480): 같은 내용 |
| eligibility-check/390-deleted | 390×844 | S-h 성공 | M4 삭제 뒤: M3 고르기 카드 바로 위 처리 결과 줄 {typography.body-sm} {colors.ink} + icon/check "항목을 삭제했어요."(role=status). 카드 4장, 요약 "확인 필요" · 1(전체 4개 중) |
| eligibility-check/390-plan-deleted | 390×844 | S-h 성공 | M3 삭제 뒤: 처리 결과 줄 "전형을 삭제했어요. 연결된 상담 기록은 남겨 두었어요." 화면은 목록 첫 전형(성균관대학교 · 학교장추천전형)으로 바뀌고 그 전형 항목(기본 4개, 모두 확인 필요) |
| eligibility-check/390-scroll | 390×844 | (아래쪽) | 스크롤 아래: 4 · 5번 카드 → "+ 자격 조건 추가" → M9 저장 위치 캡션 → 탭바 |

상태 프레임 30장(모두 확정). 새 기능(2026-11-23 사용자 결정으로 확정)이 들어간 프레임: 390-empty · 1440-empty(버튼 위치), 390-no-items, 390-limit(caption), 390-item-edit · 1440-item-edit · 390-item-add · 390-item-rename · 390-busy · 390-save-error(상태 목록 모양), 390-item-rename(안내 caption), 390-toast. 03-draft.json states 예정 목록 = 위 표 30개 이름 그대로(추가 · 삭제 없음).

## 6. 문구

| 자리 | 문구 |
|---|---|
| 제목 | 지원 자격 확인표 |
| 리드 | 모집요강을 확인하며 내 조건과 필요한 증빙을 정리해요. |
| 주요 버튼 | + 지원 전형 추가 |
| 고르기 라벨 | 준비할 전형 |
| 전형 카드 | 2028학년도 · 내가 등록한 전형 / 모집단위 미입력 / 등록한 자료 열기 ↗ / 자료 링크 미등록 / 전형 정보 수정 / 전형 삭제 / 이 전형으로 이어서 |
| 이어서 링크 | 원서·서류 확인하기 · 상담 질문·할 일 · 수시로에서 카드 담기 · 이 전형 일정 보기 · 관심 전형 모아보기 |
| 요약 | 내 확인 상태 · 확인 필요 · 전체 n개 중 |
| 요약 값 | 확인 항목 없음 · 미충족 기록 있음 · 확인 필요 · 확인 기록 완료 |
| 상태 이름 | 확인 필요 · 충족으로 확인 · 미충족으로 확인 · 해당 없음 |
| 상태 설명(M2 목록) | 아직 모집요강에서 확인하지 않았어요 / 모집요강 조건과 내 상황이 맞는 걸 확인했어요 / 모집요강 조건과 내 상황이 맞지 않는 걸 확인했어요 / 이 전형에는 없는 조건이에요 |
| 안내 | 아래는 직접 작성하는 확인표예요. 공통 항목 중 적용되지 않는 것은 '해당 없음'으로 표시해 주세요. 추천 배정이나 최종 지원 자격은 학교·대학에 확인해요. |
| 빈 메모 | 확인한 조건·근거 또는 문의할 담당자를 기록해 주세요. |
| 확인 기록 | 확인 기록 YYYY-MM-DD HH:MM / 아직 확인하지 않음 |
| 카드 버튼 | 수정 · 삭제(화면 읽기 이름 "○○ 수정" · "○○ 삭제") |
| 추가 | + 자격 조건 추가 |
| 저장 위치 | 준비 기록은 이 브라우저에 저장돼요. 암호화 백업·복원에 함께 포함돼요. |
| 읽는 중 | 준비 기록을 읽고 있어요. |
| 빈 화면 | 준비할 전형을 먼저 추가해 주세요 / 대학·전형 이름과 모집요강 링크를 직접 등록할 수 있어요. 추가한 전형은 체크리스트와 자격 확인표에서 함께 사용해요. |
| 항목 0개 | 확인 항목이 없어요 · 아래 '+ 자격 조건 추가'로 모집요강의 조건을 적어 보세요 |
| 50개 | 항목은 50개까지 적을 수 있어요 |
| M1 | 지원 전형 추가 / 지원 전형 수정 / 등록된 전형에서 선택 / 직접 입력 / 학년도 / 대학명 / 전형명 / 모집단위(선택) / 모집요강 링크(선택) / 저장 / 저장 중 / 기존 준비 기록 열기 / 취소 |
| M1 경고 | 대학·전형·모집단위·학년도를 바꾸면 기존 체크 항목과 자격 조건의 확인 상태·기한·근거·메모를 초기화해요. 다른 전형을 준비하려면 ‘지원 전형 추가’를 이용해 주세요. |
| M1 중복 | 같은 학년도·대학·전형·모집단위의 준비 기록이 있어요. 기존 체크리스트와 메모를 유지하고 그 기록을 열어요. |
| M2 | 자격 조건 확인 / 확인할 조건 / 내 확인 상태 / 모집요강·확인 자료 링크 / 조건·확인 근거·문의할 담당자 / 증빙 원본을 올릴 필요는 없어요. 확인한 내용과 필요한 다음 행동을 기록해 주세요. |
| M2 이름 변경 | 조건 이름을 바꾸면 확인 상태가 '확인 필요'로 돌아가요 |
| M3 | 지원 전형을 삭제할까요? / ○○대학교의 체크리스트·자격 확인 기록을 삭제해요. 연결된 상담 질문·할 일은 전형 연결만 해제하고 보관해요. / 삭제 / 취소 |
| M4 | 확인 항목을 삭제할까요? / ○○의 상태와 메모도 함께 지워져요. / 삭제 / 취소 |
| 결과 줄 | 항목을 삭제했어요. / 전형을 삭제했어요. 연결된 상담 기록은 남겨 두었어요. |
| 오류 줄 | 준비 기록의 항목·날짜·링크를 확인해 주세요. 링크는 https:// 주소를 사용해 주세요. |
| toast | 자격 조건을 저장했어요 |

쓰지 않는 말: 합격과 엮인 확률 · 보장 표현, "지원할 수 있어요/없어요", "자격 있음/없음"(서비스 판정처럼 읽혀요), "판정", "적합". 상태는 언제나 "…으로 확인"처럼 내 기록임을 드러내요.

## 7. 접근성

- 상태 배지는 아이콘 + 이름 글자라 색 없이 읽혀요. 화면 읽기 = "학교장추천 필요 여부, 내 확인 상태 확인 필요, 확인 기록 없음".
- M2 상태 목록 = 라디오 묶음("내 확인 상태, 확인 필요 선택됨, 4개 중"), 방향키로 이동 · Space로 선택. 선택은 accent-soft 채움 + 막대 + 체크 아이콘(색만으로 알리지 않아요).
- select 대체(`text-input` 선택형)는 콤보박스로 읽히고 Enter/Space로 열어요. 드롭다운 옵션은 방향키, Esc로 닫고 칸으로 포커스.
- 팝업: 열면 첫 입력(확인 창은 제목)에 포커스, Tab은 팝업 안에서만 돌고, Esc · ✕ = 닫기(저장 중이면 막힘), 닫으면 연 버튼으로 포커스 복귀(앱 Modal 그대로).
- 처리 결과 줄 = role=status(조용한 알림), 오류 줄 = role=alert. toast도 role=status.
- "수정" · "삭제" 버튼의 화면 읽기 이름에 조건 이름을 넣어요(D8). 꺼진 "+ 자격 조건 추가"는 이유 caption과 aria-describedby로 연결.
- 숫자 · 날짜 고정폭. 모바일 터치 44 이상(버튼 · 선택 칸 · 상태 행 48 · 이어서 링크), PC 버튼 40. 포커스 2px 잉크 링.
- 글자 대비: 배지 {colors.ink-soft} on {colors.canvas} 15:1, caption {colors.text-muted} on {colors.canvas} 5:1, 오류 {colors.judge-risk} on {colors.canvas} 6:1. {colors.text-faint}는 꺼진 상태 · placeholder에만.
- 시트 · 모달 240ms, toast 150ms 페이드, prefers-reduced-motion이면 바로.

## 8. 디자이너 메모

- 03-draft.json frames = 정확히 2개: eligibility-check/390, eligibility-check/1440(둘 다 1장 기본 값 = 섞임 상태). 5장 상태 프레임 30개는 같은 페이지에 그리고 states에만 적어요. 프레임 이름은 위 표 그대로이고 "[확인]" 표시는 붙이지 않아요(2026-11-23 사용자 결정으로 모두 확정).
- 레이어 이름 = 컴포넌트 이름: `sub-nav`, `tab-bar-pill`, `sidebar`, `sidebar-group`, `sidebar-item`, `brand-logo`, `page-header`, `text-input`, `text-input-focused`, `text-input-error`, `button-primary`, `button-outline`, `button-pill-soft`, `button-danger-text`, `univ-logo`, `univ-monogram`, `stat-tile`, `data-status-badge`, `disclaimer-note`, `bottom-sheet`, `modal`, `toast`, `empty-state`. 상태 배지는 `data-status-badge` 이름 + 설명 "variant=self", select 칸은 `text-input` 이름 + 설명 "variant=select", 여러 줄 메모는 `text-input` 이름 + 설명 "variant=multiline", 항목 카드 · 전형 카드는 일반 레이어("item-card", "plan-card"), 상태 목록은 "choice-list", 드롭다운은 "dropdown".
- 9장 제안 1 · 3 · 4 · 5 · 6 · 7은 오케스트레이터가 design.md · work/icons에 한 번에 반영해요(2026-11-23 사용자 결정). 시안은 반영 전 대체안을 쓰지 않고 **제안된 변형 그대로** 그려요: 상태 배지 = `data-status-badge` 변형 self(설명 "variant=self"), select 칸 = `text-input` 변형 select, 메모 칸 = `text-input` 변형 multiline, M2 상태 = 단일 선택 목록("choice-list"), 확인 모달 = button-primary "삭제" + button-outline "취소". 새 토큰은 없어요.
- 아이콘: 메뉴 = icon/clipboard-check, 해당 없음 = icon/minus(제안 7로 work/icons에 추가). 그릴 때 아직 없으면 멈추고 오케스트레이터에 알려요(icon/check · 글자 "–"로 바꿔 그리지 않아요).
- 회색 Page 위에 바로 놓이는 요소는 없어요(모두 흰 카드 안). 카드 안 `text-input`은 on=card({colors.field}), `button-pill-soft`는 {colors.canvas-soft}. 상태 배지 self는 어디서나 흰 채움 + hairline.
- 색: 판정 색 · 등급 색 · 증감 색 · 연도 색 · 경고 칸 색(소신 쌍) 없음. {colors.judge-risk}는 `button-danger-text` 글자와 입력 오류(`text-input-error` · 오류 줄)에만. Route Blue는 sub-nav · sidebar-item · tab-bar-pill 선택, 상태 목록 선택 행, 드롭다운 선택 옵션, 링크("등록한 자료 열기 ↗", "암호화 백업·복원")에만 — 숫자에는 쓰지 않아요. 모든 fill · stroke 변수 바인딩.
- 그림자는 `bottom-sheet` · `modal` · `toast` · "dropdown"에만. 모서리 전부 0(손잡이 막대 포함).
- 모바일 치수: 좌우 20, 카드 패딩 16(안쪽 318), 카드 사이 12, 섹션 32. 이어서 링크 줄은 카드 안쪽에서 시작해 카드 오른쪽 끝까지 잘려요(카드 패딩 오른쪽 0). PC 콘텐츠 1080, 카드 패딩 24, 그리드 2열 528.
- 대학 · 전형 이름은 한 줄 먼저, 넘치면 단어 사이에서만 두 줄. select 칸 값만 한 줄 말줄임(전체 이름은 시트 · 드롭다운에서).

## 9. design.md 수정 제안

이 화면에 필요한 문장이에요. 사람이 확인해 넣어요(하네스는 design.md · rules를 고치지 않아요). design.md를 고치면 rules/design-rules.json `source.sha256`도 새 해시로 바꿔야 해요(안 바꾸면 J9 실패). **새 컴포넌트 이름은 없어서 rules `components`는 그대로예요.**

1. **App Shell 학생 대분류에 지원 자격 확인표 추가.** 위치: App Shell › 모바일 › "학생 대분류:" 문장. **바꿀 문장**:
   - 지금: "학생 대분류: 홈 / 성적(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사) / 대학 찾기(전형계획 · 수시 입결 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기) / 수시 전략(수시로 · 생기부 AI). 학과별 구간 소분류 아이콘은 icon/layers(2026-11-23 사용자 결정, 수시 전략 icon/layout-grid와 겹치지 않게), 계열 모아보기 소분류 아이콘은 icon/folder(2026-11-23 사용자 결정, icon/layers · icon/layout-grid와 겹치지 않게)."
   - 바꾼 뒤: "학생 대분류: 홈 / 성적(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사) / 대학 찾기(전형계획 · 수시 입결 · 학과별 구간 · 계열 모아보기 · 될각 · 지원 자격 확인표 · 최저로 찾기) / 수시 전략(수시로 · 생기부 AI). 학과별 구간 소분류 아이콘은 icon/layers(2026-11-23 사용자 결정, 수시 전략 icon/layout-grid와 겹치지 않게), 계열 모아보기 소분류 아이콘은 icon/folder(2026-11-23 사용자 결정, icon/layers · icon/layout-grid와 겹치지 않게), 지원 자격 확인표 소분류 아이콘은 icon/clipboard-check(2026-11-23, 모의고사 · 원서·서류 체크리스트의 icon/check와 겹치지 않게)."
   - 참고(이 slug 범위 밖, 결정 요청만): 앱 nav.ts 대학 찾기에는 전형 성향 탐색 · 전국 배치표 · 전형 비교가 있고 학과별 구간 · 계열 모아보기 · 최저로 찾기가 없어요. 수시 전략에는 원서·서류 체크리스트 · 입시 일정 · 상담 질문·할 일이 더 있어요. design.md 목록과 앱 메뉴를 한 번에 맞추는 결정이 따로 필요해요.
2. **Responsive Strategy 행 추가.** 위치: Responsive Strategy 표, "특수 계열 모아보기(2026-11-23)" 행 바로 다음에 **추가**(탭으로 칸 구분):
   > 지원 자격 확인표(2026-11-23)	화면 제목 → 준비할 전형 선택 칸(누르면 바텀시트) → 전형 카드(이어서 갈 곳 버튼 가로 스크롤 한 줄) → 요약 stat-tile 2개 → 안내 → 항목 카드 세로 목록(상태 배지 · 메모 · 자료 링크 · 확인 기록) → 항목을 고치면 바텀시트	page-header(주요 버튼 "+ 지원 전형 추가") → 전형 카드(선택 칸 + 이어서 갈 곳 버튼 한 줄) → 요약 stat-tile 2개 + 안내 한 줄 → 항목 카드 2열 그리드 → 항목을 고치면 모달
3. **data-status-badge 변형 self(내 확인 기록).** 위치: Components › data-status-badge 절, "변형 fact(2026-11-23 특수 계열 모아보기): …데이터 상태(준비 중 · 기준일)에는 쓰지 않습니다." 문단 바로 다음 줄에 **추가**:
   > 변형 self(2026-11-23 지원 자격 확인표): 학생이 모집요강을 보고 직접 적은 확인 기록의 상태입니다(확인 필요 · 충족으로 확인 · 미충족으로 확인 · 해당 없음). 채움 {colors.canvas} + 1px {colors.hairline} 외곽선 + {colors.ink-soft} 글자 {typography.label}, 높이 24, 좌우 패딩 {spacing.xs}, 모서리 0이고 Page 바탕 위에서도 같은 모양입니다. 이름 앞에 아이콘 12({colors.ink-soft})를 둡니다: 확인 필요 icon/circle-help · 충족으로 확인 icon/check · 미충족으로 확인 icon/x · 해당 없음 icon/minus. 서비스 판정이 아니라 내 기록이라서 판정 색 · Route Blue를 쓰지 않고, 이름은 "…으로 확인"처럼 기록임을 드러내는 문구를 그대로 씁니다. 수능 최저 판정 배지 · judge-badge와 한 화면에 섞어 쓰지 않습니다.
   - 반영 전 대체안: `data-status-badge` 기본(흑백 알약) + 앞에 같은 아이콘 12 {colors.text-muted}.
4. **text-input 선택형 · 여러 줄 변형.** 위치: Components › Inputs & Forms › text-input 절, "변형(2026-11-23 학과별 입결 구간표): … text-input-error도 같은 변형을 따릅니다." 문장 바로 다음 줄에 **추가**:
   > 변형 select(2026-11-23 지원 자격 확인표): 고르기 칸입니다. 오른쪽 icon/chevron-down 16 {colors.ink}, 값이 넘치면 한 줄 말줄임. 누르면 모바일은 bottom-sheet 단일 선택 목록, PC는 칸 바로 아래 Overlay 드롭다운({colors.canvas} + {shadow.overlay}, 칸과 같은 폭, 옵션 행 40, 고른 옵션 = {colors.accent-soft} 채움 + 오른쪽 icon/check {colors.accent}). 변형 multiline: 여러 줄 메모 칸, 높이 모바일 112 · PC 104(4줄), 넘치면 칸 안 세로 스크롤. 두 변형 모두 on · size · 포커스 · 오류 규칙은 text-input과 같습니다.
   - result-summary 02-spec 제안 1(select-input)과 같은 필요예요. 하나로 합쳐 결정해 주세요. 반영 전 대체안: `text-input` + chevron 아이콘 + 레이어 설명 "variant=select"(G2 통과).
5. **시트 · 모달 안 단일 선택 목록.** 위치: Components › Overlays › bottom-sheet 절 끝에 **추가**:
   > 단일 선택 목록(2026-11-23 지원 자격 확인표): 바텀시트 · 모달 안에서 선택지 하나를 고를 때 씁니다(라디오 · 체크박스 모양은 쓰지 않습니다). 행 높이 모바일 48 · PC 40, 행 = (아이콘 16) + 이름 {typography.title} + (설명 한 줄 {typography.body-sm} {colors.text-muted}), 행 사이 1px {colors.hairline-soft}. 고른 행 = Elevation Selected({colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대) + 오른쪽 icon/check {colors.accent}. 라디오 묶음으로 읽히고 방향키로 이동합니다. 고르면 바로 닫히는 목록(정렬 · 전형 고르기)과 저장 버튼으로 확정하는 목록(편집기 안 상태)을 모두 이 모양으로 그립니다.
   - 반영 전 대체안: M2 상태는 `text-input` 선택형(제안 4 대체안)으로 앱 select 그대로.
6. **확인 모달 버튼 위계(문장 보강).** 위치: Components › Buttons › button-danger-text 절, "누르면 반드시 확인 모달을 띄웁니다." 문장 뒤에 **추가**:
   > 확인 모달은 제목 질문 + 함께 지워지는 것 한 줄 + button-primary "삭제"(잉크) + button-outline "취소"입니다. 모달 안 실행 버튼에는 위험 색 채움을 쓰지 않습니다(2026-11-23 지원 자격 확인표).
7. **아이콘 세트(design.md 밖, work/icons).** icon/clipboard-check(메뉴) · icon/minus(해당 없음)를 lucide에서 추가해 주세요. 앱 nav.ts 아이콘(check → clipboard-check) 변경은 하네스 범위 밖이라 앱 쪽 작업으로 넘겨요.
8. **rules.** `requires_disclaimer_note` · `requires_trace_accordion`에 eligibility-check를 **추가하지 않아요**(계산 · 판정 · 서비스 데이터가 없는 학생 기록 화면). `screens`에는 이미 등록돼 있어요.
