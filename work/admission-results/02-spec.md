# 02-spec — 수시 입결 (admission-results)

> 근거: 01-research.md(P1~P11, L1~L12), PRD 6-6·8장 AdmissionResult·13장, story-service NEVER-1/2, design.md(App Shell, Components, Voice, Accessibility), work/_pending/apply4.py(cut-dot-plot · sub-nav · sidebar-group 정의, design.md 반영 대기), work/five-to-nine/02-spec.md v2(배치표 표 형식).
> 위치: 학생 대분류 "대학 찾기" › 소분류 "수시 입결"(전형계획 · 수시 입결 · 될각). 소분류 화면이라 뒤로가기 없음.
> 원칙: 이 화면은 지난 입결 **사실**만 보여줘요. 판정 이름(안정·적정·소신·위험)·판정 색·judge-badge는 쓰지 않고, 될각으로 가는 링크만 둬요(NEVER-2). 검수 전·출처 허락 미확인 입결은 점·값을 그리지 않고 "준비 중"으로 둬요(NEVER-1).
> 필수 포함: `disclaimer-note` (apply4.py가 이 화면을 requires_disclaimer_note에 넣어요). 계산 결과를 새로 만들지 않는 화면이라 근거 아코디언은 두지 않고, 내 위치의 근거는 5 to 9 화면 링크로 이어요.
> 컴포넌트: `cut-dot-plot` · `sub-nav` · `sidebar-group`은 이제 design.md·rules에 있어요(2026-11-24 확인). 본문에 백틱 없이 남은 곳도 같은 컴포넌트예요(레이어 이름도 이 이름).
> 개정 2026-11-24(상세화): 서비스 이름 U:NAVI와 최신 design.md에 맞춰 기본 프레임을 바로잡고(0-1), 상태 프레임을 5장에서 37장으로 늘렸어요(5장). 앱 구현(app/src/screens/AdmissionResults.tsx · components/UniversityResultOverview.tsx · InterestList.tsx · InterestButton.tsx · PrepareProgram.tsx · CollectedResultBrowser.tsx)의 팝업·불러오는 중·오류·빈 상태를 모두 옮기고, 앱에 없는 안전장치(되돌리기 toast · 저장하지 않고 닫기 확인 창)를 더했어요.

## 0-1. 최신 design.md 맞춤 (2026-11-24, 승인 레이아웃은 그대로)

| # | 바로잡을 곳 | 이전 | 지금 |
|---|---|---|---|
| U1 | 서비스 이름 | 진학 내비 | U:NAVI. PC `sidebar` 맨 위는 `brand-logo` 폭 124(원본 비율, 팔레트 예외). 글자 워드마크를 따로 만들지 않아요. 모바일은 소분류 화면이라 `app-bar` 제목 "수시 입결" 그대로(`brand-logo`는 대분류 첫 화면 머리에만) |
| U2 | 모바일 `sub-nav` | 전형계획 · 수시 입결 · 될각 | 대학 찾기 소분류 전체: 전형계획 · 대학 지도 · **수시 입결** · 전국 배치표 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기 · 지원 자격 확인표 · 전형 비교. 가로 스크롤, 첫 화면에서 수시 입결이 보이게 스크롤해 두고 오른쪽 끝 잘린 탭을 보여요 |
| U3 | PC 사이드바 메뉴 | 대학 찾기 아래 3개 | `sidebar-group` 대학 찾기(펼침) 아래 `sidebar-item` 10개(U2 순서). 아이콘은 design.md에 정해진 것만(대학 지도 icon/map · 전국 배치표 icon/chart-scatter · 학과별 구간 icon/layers · 계열 모아보기 icon/folder · 지원 자격 확인표 icon/clipboard-check · 전형 비교 icon/columns-2), 수시 입결·전형계획·될각·최저로 찾기는 지금 Figma 아이콘 유지. 수시 전략 아래는 접힘 |
| U4 | PC 머리 | 상단 바 64 | `page-header`: 위 여백 32 → 경로 "대학 찾기 › 수시 입결" {typography.caption} {colors.text-muted} → 제목 {typography.heading-1} → 오른쪽 `data-status-badge` "데이터 기준일 2026-11-18" + `mode-switch`(학생). 아래 여백 24 |
| U5 | 바탕 | 흰 화면 | 앱 셸 안 바탕 {colors.canvas-soft}(Page), 그래프·표·패널은 테두리 없는 흰 카드. Page 위에 바로 놓이는 `segmented-control` 트랙·`text-input`은 {colors.canvas} 채움 |
| U6 | 점 | 지름 8, 이전 연도 {colors.text-faint}, 연도 선 {colors.text-faint} | 지름 11, 최근 연도 {colors.ink} · 1년 전 {colors.year-prev} · 2년 전 {colors.year-old}, 연도 점 사이 1px {colors.text-muted} 선. 고른 점 = 지름 11 점 바깥 2px {colors.ink} 링(전체 15) |
| U7 | 범례 | "2025·2026학년도(옅게)" | "● 2027학년도 ● 2026학년도 ● 2025학년도"(점 색 = U6, 글자는 모두 {colors.ink}) + "▮ 내 환산 범위" |
| U8 | 오류·빈·불러오는 중 | 정의 없음 | design.md 그대로: 화면 오류 줄(icon/triangle-alert 20 {colors.ink} + {typography.body} + `button-outline` 하나, 판정 색 없음) · 불러오는 중 한 줄("○○을 읽고 있어요." {typography.body-sm} {colors.text-muted}, 스켈레톤 없음) · `empty-state`(주요 버튼 하나) |
| U9 | 입력 오류 | 정의 없음 | `text-input-error`: 2px {colors.judge-risk} 링 + icon/triangle-alert 14 + 간격 4 + {typography.caption} 문구(색 + 아이콘 + 글자) |
| U10 | 전형 고르기 | 탭만 | 한 유형 탭 안에 전형이 2개 이상이면 리드 위에 `text-input` 변형 select("학생부교과(지역균형) ⌄", 모바일 size=md 44 · PC size=sm 40, on=page). 1개면 지금처럼 리드에만 이름을 적어요(앱의 "전형 선택"과 같아요) |
| U11 | 쓰지 않는 것 | — | 수능 최저 배지(▲·✕) · 판정 색 · 일정 종류 색 · `promo-banner` · `mascot-illustration`은 이 화면에 없어요. 지난 입결 숫자는 흑백 글자이고, `data-table` 변형 expand는 쓰지 않아요(원문 상세는 바텀시트 · 모달) |

## 0. 결정 (기본값)

| # | 결정 | 이유 |
|---|---|---|
| D1 | 좌표에는 **70% 컷을 공개한 학과·전형만** 점으로 찍어요. 다른 기준(최종 등록자 평균, 50% 컷만 공개 등)으로 공개된 값은 표에만 두고 "기준" 열에 적어요 | 산출 기준이 다른 값을 같은 축에 찍으면 위치가 비교되는 것처럼 읽혀요 |
| D2 | 같은 70% 컷이라도 대학마다 등급 산출 방식(반영 교과 평균 · 전 교과 평균 · 대학별 환산)이 달라요. 말풍선·패널·표에 "기준"을 늘 적어요 | PRD 8장 basis |
| D3 | 대학별 = 행이 **학과**(그 대학 학과 전부). 내 비교 = 행이 **대학·학과**(최대 10행) | "학교별로 어느 과가 몇 점대인지" + "원하는 학교·학과를 같이" |
| D4 | 내 비교 목록 = `interest-heart`로 담은 학과(전형계획·대학 상세·될각·대학별 환산의 하트와 같은 목록). 이 화면에서 "학교·학과 추가"로 담아도 하트가 켜져요 | 담기 방식을 하나로 |
| D5 | 가로축은 데이터가 있는 구간 + 내 위치를 0.5 단위로 감싸서 자동으로 좁혀요(최소 2등급 폭). 축 위 캡션에 "1.0~3.0 구간"처럼 적어요. 모바일·PC 같음 | 0.1 차이가 9칸 전체 축에서는 겹쳐요 |
| D6 | 지역 칩은 내 비교에서만 둬요. 대학별에서는 대학 고르기 시트·드롭다운 안에서 지역으로 거르고, 본문 칩은 계열 · 연도 | 대학 하나만 보는 보기에서 지역은 의미가 없어요 |
| D7 | 전형 유형 탭 하나(교과·종합·논술·기타)를 고르면 표에서 "전형" 열을 빼고 표 위 캡션에 전형 이름을 한 번 적어요. 전체일 때만 "전형" 열이 생겨요 | 모바일 밀도, 이름·셀 한 줄 |
| D8 | 기타 = 실기·특기자 등 교과·종합·논술이 아닌 전형(PRD) | |
| D9 | 대학은 `univ-logo` 파일이 있는 9개만: 연세대 · 고려대 · 성균관대 · 한양대 · 중앙대 · 경희대 · 강원대 · 한림대 · 광주과학기술원. 광주과학기술원은 종합전형만 있어서 교과·논술 탭에서는 목록에 "이 전형이 없어요"로 나와요 | 사용자 지정 |

## 1. 예시 데이터 (가상 — 대학·숫자 모두 예시)

내 위치(5 to 9 전 교과, five-to-nine 시안과 같은 값): 환산 9등급 범위 약 2.3~2.6, 대표값 약 2.45.

### 1-1. 대학별 · 경희대학교 · 교과(지역균형) — 메인 프레임 데이터

정렬: 2027 70% 컷 오름차순. 다른 기준 행·준비 중 행은 맨 아래.

| 학과 | 2025 | 2026 | 2027 | 전년 대비 | 50% 컷(2027) | 경쟁률(2027) | 모집(2027) | 충원율(2027) | 기준 |
|---|---|---|---|---|---|---|---|---|---|
| 의예과 | 1.10 | 1.12 | 1.08 | ▼0.04 | 1.05 | 18.2:1 | 10 | 40% | 70% 컷 · 반영 교과 평균 |
| 약학과 | 1.28 | 1.31 | 1.25 | ▼0.06 | 1.20 | 15.6:1 | 8 | 63% | 70% 컷 · 반영 교과 평균 |
| 컴퓨터공학부 | 2.05 | 1.94 | 1.88 | ▼0.06 | 1.80 | 14.1:1 | 16 | 125% | 70% 컷 · 반영 교과 평균 |
| 간호학과 | 2.10 | 2.01 | 1.95 | ▼0.06 | 1.88 | 11.0:1 | 14 | 93% | 70% 컷 · 반영 교과 평균 |
| 소프트웨어융합학과 | — | 2.20 | 2.12 | ▼0.08 | 2.04 | 13.5:1 | 10 | 110% | 70% 컷 · 반영 교과 평균 (2025 모집 없음) |
| 경영학과 | 2.31 | 2.25 | 2.18 | ▼0.07 | 2.02 | 12.4:1 | 18 | 105% | 70% 컷 · 반영 교과 평균 |
| 기계공학과 | 2.41 | 2.28 | 2.30 | ▲0.02 | 2.21 | 9.8:1 | 15 | 87% | 70% 컷 · 반영 교과 평균 |
| 한약학과 | 2.22 | 2.40 | 2.35 | ▼0.05 | 2.26 | 8.9:1 | 6 | 50% | 70% 컷 · 반영 교과 평균 |
| 생물학과 | 2.50 | 2.55 | 2.44 | ▼0.11 | 2.36 | 10.2:1 | 9 | 100% | 70% 컷 · 반영 교과 평균 |
| 사학과 | 2.60 | 2.47 | 2.52 | ▲0.05 | 2.41 | 9.1:1 | 7 | 71% | 70% 컷 · 반영 교과 평균 |
| 국어국문학과 | 2.58 | 2.70 | 2.61 | ▼0.09 | 2.50 | 8.4:1 | 8 | 88% | 70% 컷 · 반영 교과 평균 |
| 자율전공학부 | 2.15 | 2.08 | 2.11 | ▲0.03 | — | 11.7:1 | 20 | 95% | 최종 등록자 평균 (좌표에 없음, D1) |
| 지리학과 | 준비 중 | 준비 중 | 준비 중 | — | — | — | — | — | 검수 전 |

경영학과 2026 경쟁률 10.8:1 · 모집 18 · 충원율 89% · 50% 컷 2.10 / 2025 경쟁률 9.6:1 · 모집 20 · 충원율 120% · 50% 컷 2.15 (말풍선·패널용).

가로축(D5): 데이터 1.08~2.70 + 내 위치 2.3~2.6 → 1.0~3.0.

### 1-2. 내 비교 · 전체 — 1440-내비교 프레임 데이터

| 대학·학과 | 전형 | 2025 | 2026 | 2027 | 기준 |
|---|---|---|---|---|---|
| 연세대 경영학과 | 교과(추천형) | 1.32 | 1.29 | 1.35 | 최종 등록자 평균 → 좌표에 없음 |
| 고려대 경영학과 | 교과(학교추천) / 종합(학업우수) | 1.45·1.41·1.38 / 1.92·2.05·1.98 | | | 70% 컷 |
| 성균관대 글로벌경영학과 | 교과(학교장추천) / 논술 | 1.38·1.42·1.36 / 4.20·4.05·4.31 | | | 70% 컷 |
| 한양대 컴퓨터소프트웨어학부 | 교과(추천형) / 종합(서류형) | 1.31·1.35·1.28 / 2.10·1.98·2.05 | | | 70% 컷 |
| 중앙대 경영학부 | 교과(지역균형) / 종합(CAU융합형) / 논술 | 1.95·2.05·2.01 / 2.60·2.48·2.55 / 3.90·4.12·4.05 | | | 70% 컷 |
| 경희대 경영학과 | 교과(지역균형) / 종합(네오르네상스) / 논술 | 2.31·2.25·2.18 / 2.85·2.70·2.92 / 3.80·4.10·3.95 | | | 70% 컷 |
| 강원대 컴퓨터공학과 | 교과(일반) / 종합(미래인재) | 2.60·2.48·2.52 / 3.20·3.05·3.12 | | | 70% 컷 |
| 강원대 간호학과 | — | 준비 중 | | | 출처 허락 확인 전 |
| 한림대 간호학과 | 교과 / 종합 | 2.95·2.88·2.91 / 3.30·3.15·3.25 | | | 70% 컷 |
| 광주과학기술원 기초교육학부 | 종합(일반) | 1.75·1.68·1.80 | | | 70% 컷 |

값은 2025·2026·2027 순서. 가로축: 1.0~4.5.

## 2. 모바일 390×844 — 대학별 · 교과 · 좌표 (frame admission-results/390)

앱 셸: `app-bar`(뒤로가기 없음, 가운데 제목 "수시 입결", 오른쪽 검색 아이콘 44×44 = 학교·학과 찾기) → `sub-nav`(대학 찾기 소분류 10개, **수시 입결** 선택, 0-1 U2) → 본문 → 하단 `tab-bar-pill`(대학 찾기 선택). 좌우 패딩 16, 요소 간격 12, 섹션 간격 {spacing.xl}.

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| M1 | 보기 범위 | `segmented-control`, `segmented-control-active` | "대학별 · 내 비교" 전체 폭 358, 높이 44. 대학별 선택. 내 비교 칸 옆 개수 "내 비교 3" [P6] |
| M2 | 대학 고르기 줄 | `univ-logo` (32) | 로고 32 + "경희대학교" {typography.heading-3} + 오른쪽 "바꾸기 ›" {typography.link}. 아래 캡션 "학과 13개 · 서울·국제캠퍼스" {typography.caption} {colors.text-muted}. 줄 전체 높이 56, 누르면 `bottom-sheet`(제목 "대학 고르기", 지역 `filter-chip` 전체 · 서울 · 강원 · 광주 + 9개 대학 목록 `univ-logo` 20 + 이름) [P6, L1] |
| M3 | 전형 유형 | `segmented-control`, `segmented-control-active` | "교과 · 종합 · 논술 · 기타 · 전체" 다섯 칸(각 약 71). 교과 선택 [P2] |
| M4 | 보기 전환 + 필터 | `segmented-control`(좌표 · 표, 폭 120) + `filter-chip` ×2 | 한 줄: 왼쪽 "좌표 · 표"(좌표 선택), 오른쪽 칩 "계열 전체 ▾" · "최근 3년 ▾". 칩 높이 32, 터치 영역 44. 칩을 누르면 `bottom-sheet` 선택지(계열: 전체 · 인문 · 자연 · 의약 · 예체능 / 연도: 최근 3년 · 2027 · 2026 · 2025) [P2, P3, P5, L9] |
| M5 | 리드 | 텍스트 | "경희대학교 학생부교과(지역균형) 최근 3년 70% 컷이에요. 점 하나가 한 해의 컷이에요." {typography.body-sm} {colors.text-muted}, 두 줄 이내 [P8] |
| M6 | 범례 | 텍스트 + 점 모양 | "● 2027학년도  ● 2026학년도  ● 2025학년도  ▮ 내 환산 범위" {typography.caption}. 점은 실제 점 모양(2027 {colors.ink} · 2026 {colors.year-prev} · 2025 {colors.year-old}, 0-1 U6·U7), 내 위치는 {colors.accent-soft} 작은 사각 + {colors.accent} 선 [P3, P7] |
| M7 | 입결 점 그래프 | cut-dot-plot | 3장 공통 규칙. 행 머리 128(학과 이름 {typography.body-sm} 한 줄) + 그래프 영역 230. 축 1.0~3.0, 눈금 1.0 · 1.5 · 2.0 · 2.5 · 3.0. 행 높이 40, 첫 화면에 행 8개(의예과~한약학과), 나머지는 세로 스크롤. 축 머리는 스크롤해도 위에 붙어 있어요. 내 위치 말풍선 "내 환산 범위 약 2.3~2.6"은 축 머리 위 [P1, P7, P11] |
| M8 | 표에만 있는 행 안내 | 텍스트 링크 | 그래프 아래 "다른 기준(최종 등록자 평균)으로 공개된 학과 1개는 표에서 볼 수 있어요 ›" {typography.body-sm}, 링크 부분 {colors.accent}. 누르면 표 보기로 바뀌어요(D1) |
| M9 | 출처 캡션 | 텍스트 | 오른쪽 정렬 "출처: 각 대학 공식 수시 입시결과 · 2025~2027학년도 · 70% 컷 · 데이터 기준일 2026-11-18" {typography.caption} {colors.text-muted} [P10, L2] |
| M10 | 될각 링크 | 텍스트 링크 | "내 성적으로 판정을 보려면 될각에서 확인해 주세요 ›" {typography.body-sm}. 판정 이름·색 없음 [P8] |
| M11 | 하단 고지 | `disclaimer-note` | 6장 고지 문구 [P10] |

마지막 요소 아래 여백 96(탭바에 가리지 않게).

## 3. cut-dot-plot 공통 규칙 (이 화면)

apply4.py 정의를 따르고, 아래를 덧붙여요.

- 축: 가로 = 9등급, 왼쪽이 1(작은 숫자). 범위는 D5. 눈금 0.5 간격 {typography.caption} {colors.ink} 고정폭, 세로 1px {colors.hairline-soft} 격자. 축 머리 오른쪽 끝 캡션 "1.0~3.0 구간" {colors.text-muted}. x = 그래프 왼쪽 + (값 − 축 시작) ÷ (축 끝 − 축 시작) × 그래프 폭.
- 행: 대학별 = 학과, 내 비교 = `univ-logo` 20 + "대학 학과". 행 구분 1px {colors.hairline-soft}. 행 머리 글자는 한 줄 우선(폭을 다시 나눔), 그래도 넘치면 단어 사이에서만 두 줄.
- 점: 학과·전형 하나의 한 해 70% 컷. 지름 11. 2027 = {colors.ink}, 2026 = {colors.year-prev}, 2025 = {colors.year-old}(같은 모양). 같은 학과·전형의 연도 점은 1px {colors.text-muted} 선으로 이어요(가장 작은 값 ~ 가장 큰 값). 점 옆 값 라벨은 늘 붙이지 않아요 [P1, P3].
- 전형 모양: 한 유형 탭에서는 모두 ● 원. 전체 탭에서는 교과 ● 채운 원 · 종합 ○ 빈 원(1.5px) · 논술 ◆ 채운 마름모 · 기타 ◇ 빈 마름모, 범례에 함께. 전체 탭은 행 안을 유형별 줄로 나눠요(행 높이 44 안에서 교과 −8 · 종합 0 · 논술/기타 +8 px), 연도 선이 서로 겹치지 않게 [P2].
- 겹침: 같은 줄에서 점이 4px 안으로 겹치면 나중 점을 세로로 3px 비켜 찍어요 [P11].
- 내 위치: 내 환산 범위(약 2.3~2.6)를 그래프 전체 높이 {colors.accent-soft} 세로 띠 + 대표값(약 2.45) 2px {colors.accent} 세로선 + 축 머리 위 말풍선 "내 환산 범위 약 2.3~2.6"(바탕 {colors.canvas} + 1px {colors.hairline}, 글자 {typography.label}, 숫자만 {colors.accent}). 말풍선 아래 작은 링크 "5 to 9에서 근거 보기 ›". 띠는 점·선 뒤에 깔아요 [P7].
- Route Blue는 그래프 안에서 내 위치 띠·선·말풍선 숫자에만. 고른 점·고른 행·전년 대비에는 쓰지 않아요.
- 고른 점: 지름 11 점 + 바깥 2px {colors.ink} 링(전체 15, 링과 점 사이 흰 1px), 그 x에 그래프 전체 높이 1px {colors.ink} 세로 안내선. 행 머리 글자는 SemiBold로 바뀌어요. 행 채움은 하지 않아요(띠와 헷갈리지 않게) [P4].
- 말풍선(점 누르면): 4장 상태 표 "390-dot-tooltip" 참조. {colors.canvas} + 1px {colors.ink} 테두리, 모서리 0, 그림자 없음(그림자 허용 목록에 말풍선이 없어요).
- 데이터 상태(NEVER-1): 검수 전·허락 미확인 행은 점·선 없이 행 끝에 `data-status-badge` "준비 중". 일부 연도 없음 = 있는 연도 점만, 말풍선·표에 "—". 신설 = 행 끝 캡션 "입결 없음(신설)". 다른 기준만 공개(D1) = 그래프 영역에 캡션 "70% 컷 미공개 · 표에서 볼 수 있어요" {colors.text-muted}. 내 환산 범위가 없거나 검수 전이면 띠를 그리지 않고 범례에서 "내 환산 범위"를 빼요.
- 판정 이름·판정 색은 어디에도 없어요.

## 4. PC 1440×900 — 대학별 · 교과 · 좌표 (frame admission-results/1440)

앱 셸: 왼쪽 `sidebar` 248, 맨 위 `brand-logo` 124. 대분류 행 `sidebar-group` 홈(접힘) · 성적(접힘) · **대학 찾기(펼침)** · 수시 전략(접힘). 대학 찾기 아래 `sidebar-item` 10개(0-1 U3), 그중 **수시 입결(선택 = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + {colors.ink})**, 들여쓰기 16. 머리 = `page-header`(0-1 U4): 경로 "대학 찾기 › 수시 입결" {typography.caption} {colors.text-muted}, 제목 "수시 입결" {typography.heading-1}, 오른쪽 `data-status-badge` "데이터 기준일 2026-11-18" + `mode-switch`(학생). 바탕 Page + 흰 카드(0-1 U5). 본문 = 가운데 832(좌우 패딩 32 → 내용 768) + 오른쪽 패널 360. 섹션 간격 {spacing.lg}(데이터 화면이라 촘촘하게).

### 4-1. 가운데 본문 (768)

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| P1 | 보기 범위 + 대학 고르기 | `segmented-control`(대학별 · 내 비교 3, 폭 240) + `univ-logo` (32) | 한 줄: 왼쪽 세그먼트, 오른쪽 로고 32 + "경희대학교" {typography.heading-3} + "바꾸기 ▾"(드롭다운: 지역 `filter-chip` + 9개 대학 목록) [P6, L12] |
| P2 | 전형 유형 + 보기 전환 | `segmented-control` ×2 | 왼쪽 "교과 · 종합 · 논술 · 기타 · 전체"(폭 400, 교과 선택), 오른쪽 끝 "좌표 · 표"(폭 160, 좌표 선택) [P2, P5] |
| P3 | 필터 | `filter-chip` ×2 | "계열 전체 ▾" · "최근 3년 ▾" (높이 32, 드롭다운) |
| P4 | 리드 + 범례 | 텍스트 | 왼쪽 리드 "경희대학교 학생부교과(지역균형) 최근 3년 70% 컷이에요. 점에 올리면 값이, 누르면 오른쪽에 자세한 값이 보여요." {typography.body-sm} {colors.text-muted}. 오른쪽 끝 범례(모바일 M6과 같음) |
| P5 | 입결 점 그래프 | cut-dot-plot | 3장 규칙. 행 머리 200 + 그래프 568, 축 1.0~3.0(1등급 = 284px). 행 높이 44, 행 12개 모두 보임(의예과~국어국문학과 11행 + 지리학과 준비 중 1행). 경영학과 2027 점이 고른 상태(세로 안내선 x = 2.18). 마우스를 올린 점에는 작은 말풍선(폭 220: "경영학과 · 2027 · 70% 컷 2.18") [P1, P4, L11] |
| P6 | 표에만 있는 행 안내 | 텍스트 링크 | 모바일 M8과 같음 |
| P7 | 출처 캡션 | 텍스트 | 모바일 M9와 같음, 그래프 아래 오른쪽 |
| P8 | 하단 고지 | `disclaimer-note` | 6장 고지 문구 |

### 4-2. 오른쪽 패널 (360, 고정) — 고른 점 상세

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| R1 | 머리 | `univ-logo` (20) + `interest-heart` | "고른 학과" {typography.caption} {colors.text-muted} → 로고 20 + "경희대학교 경영학과" {typography.heading-4} + 오른쪽 하트(44×44, 이미 담김 = {colors.heart} 채움). 아래 "학생부교과(지역균형) · 기준 70% 컷 · 반영 교과 평균" {typography.body-sm} {colors.text-muted} |
| R2 | 연도별 값 | `data-table` (6열) | 열 = 학년도 48 · 70% 컷 · 50% 컷 · 경쟁률 · 모집 · 충원율(각 약 52). 행 = 2027 · 2026 · 2025(2027 Bold). 값은 1-1 경영학과. 증감 색 없음(전년 대비는 가운데 표 보기에만) [P4, L1] |
| R3 | 링크 · 지원 준비 | 텍스트 링크 + `button-outline` | 표 바로 아래 "원문 보기 ›"(1440-detail-modal) · "될각에서 내 판정 보기 ›" {typography.link} {colors.accent} 한 줄, 그 아래 `button-outline` "지원 준비에 추가"(폭 전체, 높이 40, 1440-prepare-modal — 2026-11-24 상세화로 더함). 이 패널에 판정 이름·색 없음 [P8] |
| R4 | 내 비교 요약 | `univ-logo` (20) 목록 | "내 비교 3개" {typography.title} + 행 3개(로고 20 + "고려대 경영학과" 등, {typography.table}) + "내 비교로 보기 ›" 링크. 담긴 게 없으면 "하트로 담은 학과가 여기 모여요" {colors.text-muted} [P6] |

## 5. 상태 프레임 (03-draft.json의 states에 적어요, frames에는 넣지 않아요)

| 프레임 | 크기 | 무엇을 그리나 |
|---|---|---|
| admission-results/1440-table | 1440×900 | 대학별 · 경희대 · 교과 · **표**. 4장과 같은 셸·P1~P3(보기 전환 = 표 선택). P5 자리에 `data-table`(5-1). 오른쪽 패널은 경영학과 행 고른 상태(R1~R4 같음) |
| admission-results/1440-compare | 1440×900 | **내 비교** · **전체** · 좌표. P1 세그먼트 = 내 비교, 대학 고르기 대신 `button-outline` "학교·학과 추가". P3 칩 = "지역 전체 ▾" · "계열 전체 ▾" · "최근 3년 ▾". 그래프 = 1-2 데이터 10행, 행 머리 240, 축 1.0~4.5, 전체 탭 모양 범례. 연세대 행 = "70% 컷 미공개 · 표에서 볼 수 있어요", 강원대 간호학과 행 = `data-status-badge` "준비 중". 오른쪽 패널 = 5-2 |
| admission-results/390-table | 390×844 | 대학별 · 경희대 · 교과 · **표**. 2장과 같은 위쪽(M1~M5) + M7 자리에 `data-table`(5-1 모바일) |
| admission-results/390-dot-tooltip | 390×844 | 2장 프레임에서 경영학과 2027 점을 누른 상태(5-3) |
| admission-results/390-compare-empty | 390×844 | 내 비교 · 담은 학과 0개(5-4) |

#### 상세화로 더한 상태 프레임 (2026-11-24, 32장 — 모두 states에만)

앱 근거: [앱] = 앱에 있는 상태(파일 이름), [안전] = 앱에 없는 안전장치(앱에 더할 것). 위쪽 셸(`app-bar` · `sub-nav` · `tab-bar-pill` / `sidebar` · `page-header`)과 예시 데이터(1장)는 기본 프레임과 같고, 다른 곳만 적어요. 겹친 레이어(`bottom-sheet` · `modal`)는 뒤에 {colors.scrim}.

A. 불러오기 · 오류

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| admission-results/390-loading | 390×844 | [앱 UniversityResultOverview] M1~M4는 보이고, M5~M10 자리에 한 줄 "경희대학교 자료를 읽고 있어요." {typography.body-sm} {colors.text-muted}. 스켈레톤·진행 막대 없음. 대학 목록을 처음 읽을 때는 M2부터 같은 자리에 "대학별 입결 목록을 읽고 있어요."(문구만 다름, 따로 그리지 않음) |
| admission-results/1440-loading | 1440×900 | 1440과 같은 셸·P1~P3, 그래프 카드 안 한 줄 "경희대학교 자료를 읽고 있어요.". 오른쪽 패널은 R4(내 비교 요약)만 보이고 R1~R3 자리에 "학과를 고르면 연도별 값이 여기 보여요" {colors.text-muted} |
| admission-results/390-error | 390×844 | [앱] 그래프 자리에 화면 오류 줄(흰 카드): icon/triangle-alert 20 {colors.ink} + "경희대학교 자료를 불러오지 못했어요. 연결을 확인하고 다시 불러와 주세요." {typography.body} + `button-outline` "다시 불러오기". 판정 색 없음. M9 출처·M11 고지는 그대로 |
| admission-results/1440-error | 1440×900 | 같은 오류 줄을 그래프 카드 안에. 대학 목록 자체를 못 읽은 경우의 문구 "대학 목록을 불러오지 못했어요. 다시 불러와 주세요." + "목록 다시 불러오기"는 이 프레임 오른쪽에 주석으로만 적어요 |

B. 고르기 · 거르기

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| admission-results/390-univ-sheet | 390×844 | [앱 Modal "대학 바꾸기"] M2 "바꾸기 ›"를 누른 `bottom-sheet`(높이 화면의 약 75%): 손잡이 → 제목 "대학 고르기" {typography.heading-4} → `text-input`(size=md, 왼쪽 검색 아이콘, 빈 값 안내 "대학 이름으로 찾기") → 지역 `filter-chip` 전체(on) · 서울 · 강원 · 광주 → 상태 줄 "9개 대학" {typography.caption} → 단일 선택 목록(행 48: `univ-logo` 20 + 대학 이름 {typography.title}, 경희대학교 = Selected + 오른쪽 icon/check {colors.accent}). 고르면 바로 닫혀요. 검색 결과 0개면 목록 자리에 "검색한 대학이 없어요. 지금 고른 대학은 그대로예요."(같은 프레임 주석) |
| admission-results/1440-univ-dropdown | 1440×900 | P1 "바꾸기 ▾" 아래 4px에 떠 있는 목록(Overlay: {colors.canvas} + 1px {colors.hairline} + {shadow.overlay}, 폭 360): `text-input` size=sm 검색 → 지역 `filter-chip` 한 줄 → 대학 9행(행 40, 마우스 올린 행 {colors.canvas-soft}, 고른 행 Selected + icon/check). Esc·바깥 누름으로 닫혀요 |
| admission-results/390-program-sheet | 390×844 | [앱 "전형 선택" select] 종합 탭(경희대 네오르네상스 · 학교장추천 2개)에서 리드 위 `text-input` 변형 select "학생부종합(네오르네상스) ⌄"를 누른 `bottom-sheet` 단일 선택 목록: 행 = 전형 이름 {typography.title} + 설명 한 줄 "학과 22개 · 2025~2027" {typography.body-sm} {colors.text-muted}. 0-1 U10 |
| admission-results/390-filter-sheet | 390×844 | M4 "계열 전체 ▾"를 누른 `bottom-sheet` 단일 선택 목록: 전체(Selected) · 인문 · 자연 · 의약 · 예체능, 각 행 오른쪽 개수 "13" 고정폭 {colors.text-muted}. 고르면 바로 닫히고 칩이 on(예: "자연 ▾" {colors.accent-soft} + 1px {colors.accent})으로 바뀌어요. 연도 칩 시트도 같은 모양(따로 그리지 않음) |
| admission-results/390-search | 390×844 | [앱 "학과 검색"] `app-bar` 검색 아이콘을 누른 상태: 앱바 아래에 `text-input` size=md "컴퓨터" + 오른쪽 지우기 ✕(44×44), 아래 상태 줄 "학과 2개" {typography.caption} {colors.text-muted}(role=status). 그래프는 컴퓨터공학부 · 소프트웨어융합학과 2행만, 축은 그대로 1.0~3.0(검색으로 축이 바뀌지 않아요) |
| admission-results/390-search-empty | 390×844 | 검색어 "천문" → 그래프 자리 `empty-state`: 흑백 선 검색 아이콘 → "조건에 맞는 학과가 없어요" {typography.heading-4} → "학과 이름을 줄이거나 다른 전형 유형에서 찾아보세요." {typography.body-sm} → `button-primary` "검색어 지우기" |
| admission-results/1440-search-empty | 1440×900 | PC는 P3 칩 줄 오른쪽 끝에 `text-input` size=sm "학과 이름으로 찾기"(폭 240, on=card). 계열 "예체능" + 검색 "천문" → 그래프 카드 안 같은 `empty-state`, 버튼 "조건 지우기"(계열·검색어를 함께 되돌려요). 오른쪽 패널 R1~R3 자리는 1440-loading과 같은 안내 |
| admission-results/390-type-none | 390×844 | [앱 ResultBrowser "이 전형이 없어요"] 대학 = 광주과학기술원, 교과 탭. M5 이하 자리에 `empty-state`: "광주과학기술원은 학생부교과 전형이 없어요" {typography.heading-4} → "이 대학은 종합전형만 모집해요." → `button-primary` "종합 보기"(누르면 종합 탭). D9 |

C. 데이터 상태 (NEVER-1)

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| admission-results/390-partial | 390×844 | 그래프를 아래로 스크롤한 상태(자율전공학부 · 지리학과 · 소프트웨어융합학과 행이 보이게): 소프트웨어융합학과 = 2025 점 없이 2026·2027 점만, 행 끝 캡션 없음(말풍선·표에서 "—") · 자율전공학부 = 그래프 영역 캡션 "70% 컷 미공개 · 표에서 볼 수 있어요" {colors.text-muted} · 지리학과 = 점 없이 행 끝 `data-status-badge` "준비 중" · 예시로 1행 추가한 "AI융합학부" = 행 끝 캡션 "입결 없음(신설)". 그래프 아래 M8 링크. 준비 중이 3행 이상이면 행마다 붙이지 않고 묶음 위 한 줄 "준비 중인 학과 3개 — 검수가 끝나면 채워져요"(주석) |
| admission-results/390-no-plot | 390×844 | [앱 "그래프로 그릴 컷이 없어요"] 대학 = 연세대학교, 교과 탭(70% 컷 대신 최종 등록자 평균만 공개). M6 범례·M7 그래프 자리에 `empty-state`: "그래프로 그릴 70% 컷이 없어요" {typography.heading-4} → "이 전형은 70% 컷 대신 최종 등록자 평균만 발표했어요. 발표한 값은 표에서 그대로 볼 수 있어요." → `button-primary` "표로 보기"(누르면 좌표·표 = 표). D1 그대로 — 50% 컷으로 대신 찍지 않아요 |
| admission-results/390-no-position | 390×844 | [앱 ComparisonPanel] 내 환산 범위를 그리지 않는 상태(성적 없음 또는 비교 조건 확인 전): 그래프에 {colors.accent-soft} 띠·{colors.accent} 선·말풍선 없음, 범례에서 "▮ 내 환산 범위" 빠짐. 축 머리 위 말풍선 자리에 한 줄 "내 환산 범위를 같이 보려면 성적을 입력해 주세요 ›" {typography.body-sm}(링크 부분 {colors.accent}, 성적 입력으로). 성적은 있는데 비교 조건이 다르면 같은 자리 문구 "학년도·반영 교과가 같은지 확인 전이라 내 범위를 겹치지 않았어요 · 조건 보기 ›"(주석) |
| admission-results/1440-no-position | 1440×900 | PC는 그래프 띠 없음 + 오른쪽 패널 맨 위에 흰 카드 "내 환산 범위" {typography.title} → "—" {typography.numeric} → "아직 입력한 성적이 없어요." {typography.body-sm} {colors.text-muted} → 링크 "성적 입력하기 ›" {colors.accent}. 그 아래 R1~R4 그대로 |
| admission-results/390-conditions-sheet | 390×844 | [앱 Modal "비교 조건 자세히"] 390-no-position의 "조건 보기 ›"를 누른 `bottom-sheet`: 제목 "비교 조건을 먼저 확인해요" {typography.heading-4} → 두 줄 표(라벨 {typography.caption} / 값 {typography.body}): "내 성적 · 5 to 9 전 교과 추정 범위" / "입결 · 2025~2027학년도 70% 컷 · 9등급제 교과등급" → 원문 산출 기준 목록(학년도 · 지표 · 산출 기준 한 줄씩, {typography.body-sm}) → "조건이 같다고 확인되기 전에는 점수 차이를 보여 주지 않아요." {typography.body-sm} → `button-outline` "5 to 9에서 근거 보기" + `button-outline` "닫기". 판정 이름·색 없음 |
| admission-results/1440-conditions-modal | 1440×900 | 같은 내용을 `modal`(최대 폭 560, 가운데)로. 버튼은 오른쪽 정렬 |

D. 점 · 원문 상세

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| admission-results/390-detail-sheet | 390×844 | [앱 Modal wide "입결 원문 상세"] 390-dot-tooltip 아래 줄에 더한 "원문 보기 ›"를 누른 `bottom-sheet`(높이 약 85%, 안쪽 스크롤): 제목 "경영학과 · 2027학년도" {typography.heading-4} + `data-status-badge` "검수 전 참고자료" → 라벨/값 목록(행 사이 1px {colors.hairline-soft}): 전형 · 지표(교과등급) · 등급제(9등급) · 70% 컷 2.18 · 50% 컷 2.02 · 경쟁률 12.4:1 · 모집 18 · 충원율 105% · 산출 기준(반영 교과 평균) · 출처(대학 공식 입시결과 · 원문 12쪽) → `button-pill-soft` "원문 보기 ↗" → 맨 아래 `disclaimer-note`. 빈 값은 "—" |
| admission-results/1440-detail-modal | 1440×900 | 오른쪽 패널 R2 아래 링크 "원문 보기 ›"를 누른 `modal` size=wide(최대 960): 왼쪽 같은 라벨/값 목록, 오른쪽 같은 학과 3개 연도를 한 `data-table`로(열 = 학년도 · 지표 · 70% 컷 · 50% 컷 · 산출 기준 · 원문 쪽수). 머리 오른쪽 닫기 ✕ |

E. 내 비교 · 담기

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| admission-results/390-compare | 390×844 | 모바일 내 비교 기본(PC 1440-compare의 모바일판): M1 = 내 비교(선택) "내 비교 10" → 칩 줄 "지역 전체 ▾" · "계열 전체 ▾" · "최근 3년 ▾"(가로 스크롤) → M3 전형 유형 = 전체 → 범례(전형 모양 ●○◆◇ + 연도 + 내 범위, 두 줄) → `cut-dot-plot` 행 머리 150(`univ-logo` 20 + "고려대 경영학과" 한 줄, 넘치면 단어 사이 두 줄) + 그래프 208, 축 1.0~4.5, 첫 화면 6행 → 아래 `button-outline` "학교·학과 추가" → 출처 → `disclaimer-note` |
| admission-results/1440-compare-empty | 1440×900 | PC 내 비교 0개: 가운데 카드에 390-compare-empty와 같은 `empty-state`(주요 버튼 "학교·학과 추가"), 오른쪽 패널 C1 자리 "하트로 담은 학과가 여기 모여요" {colors.text-muted}만 |
| admission-results/390-compare-add-sheet | 390×844 | "학교·학과 추가"를 누른 `bottom-sheet`(높이 약 85%): 제목 "학교·학과 추가" + 상태 줄 "3 / 10개 담음" {typography.label} 고정폭 → `text-input` size=md "대학·학과 검색"(값 "간호") → 결과 목록(행 56: `univ-logo` 20 + "강원대학교 간호학과" {typography.title} + 전형 유형 {typography.body-sm} {colors.text-muted} + 오른쪽 `interest-heart` 44×44, 담긴 행은 {colors.heart} 채움) → 아래 고정 줄 `button-primary` "다 담았어요"(닫기). 검색 0개면 "검색한 학교·학과가 없어요. 이름을 줄여서 찾아보세요."(주석) |
| admission-results/1440-compare-add-modal | 1440×900 | 같은 내용을 `modal`(560)로, 왼쪽 9개 대학 단일 선택 목록 · 오른쪽 그 대학 학과 목록(하트)으로 나눠요. 아래 오른쪽 `button-primary` "다 담았어요" |
| admission-results/390-toast-removed | 390×844 | [안전] 390-compare에서 한림대 간호학과 하트를 끈 직후: 그 행이 그래프에서 빠지고 `tab-bar-pill` 위 {spacing.md}에 `toast` "내 비교에서 뺐어요" + 오른쪽 텍스트 버튼 "되돌리기"({colors.on-primary} SemiBold 밑줄, 44 높이). 4초 뒤 사라지고 그 전에 되돌리면 원래 자리로 돌아와요. 담을 때는 "내 비교에 담았어요 · 이 기기에만 저장돼요"(주석, 따로 그리지 않음) |
| admission-results/1440-toast-removed | 1440×900 | 1440-compare에서 C1 목록 하트를 끈 직후, 오른쪽 아래 `toast` 같은 문구 + "되돌리기" |
| admission-results/390-compare-full | 390×844 | [안전] 10개가 찬 상태에서 390-compare-add-sheet의 빈 하트를 누름: 하트는 켜지지 않고 시트 위 `toast` "내 비교는 10개까지 담을 수 있어요. 하나를 빼고 담아 주세요". 상태 줄 "10 / 10개 담음" |
| admission-results/390-heart-error | 390×844 | [앱 InterestButton "저장 오류"] 하트를 눌렀지만 기기 저장소를 열지 못함: 하트는 이전 상태 그대로, 그래프 위에 화면 오류 줄 "내 비교를 저장하지 못했어요. 브라우저 저장 권한을 확인하고 다시 눌러 주세요." + `button-outline` "다시 시도". 하트 옆 글자 "저장 오류"는 쓰지 않아요(오류 줄 한 곳에서 알려요) |

F. 지원 준비에 추가

| 프레임 | 크기 | 무엇을 보여 주나 |
|---|---|---|
| admission-results/390-prepare-sheet | 390×844 | [앱 PrepareProgram] 390-dot-tooltip 아래 줄의 `button-outline` "지원 준비에 추가"(5-3에 더함)를 누른 `bottom-sheet` 편집기: 제목 "지원 준비에 추가" → `warning-callout` tone=neutral "살펴본 입결은 2027학년도예요. 아래 학년도는 실제로 지원할 학년도로 확인해 주세요." → `text-input` select "학년도" 2028 → `text-input` "대학명" 경희대학교 → `text-input` "전형명" 학생부교과(지역균형) → `text-input` "모집단위(선택)" 경영학과 → `text-input` "모집요강 링크(선택)" 값 "kh.ac.kr/susi" = `text-input-error` "링크는 https://로 시작해야 해요. 주소를 확인해 주세요." → 캡션 "저장하면 원서·서류 체크리스트로 이동해요." → 아래 고정 줄 `button-outline` "취소" + `button-primary` "저장"(오류가 있으면 비활성) |
| admission-results/1440-prepare-modal | 1440×900 | 오른쪽 패널 R3 아래 `button-outline` "지원 준비에 추가"를 누른 `modal`(560), 내용은 390-prepare-sheet와 같고 오류 없는 상태(저장 켜짐). 버튼 오른쪽 정렬 |
| admission-results/390-prepare-leave-confirm | 390×844 | [안전] 편집기에 입력한 뒤 "취소"·바깥 누름: 확인 `bottom-sheet`(design.md 확인 창) 제목 "저장하지 않고 닫을까요?" {typography.heading-4} → "입력한 학년도·모집요강 링크가 사라져요." {typography.body} → `button-primary` "닫기" + `button-outline` "계속 쓰기" |
| admission-results/1440-prepare-leave-confirm | 1440×900 | 같은 확인 창을 1440-prepare-modal 위 `modal`(560)로, 버튼 오른쪽 정렬 |

앱과 다르게 그리는 점(앱을 고칠 것, 시안이 기준): ① 앱은 70% 컷이 없으면 50% 컷을 점으로 찍어요 → D1대로 찍지 않고 390-no-plot. ② 앱 대학별 그래프는 10학과씩 페이지를 나눠요 → 승인 시안대로 세로 스크롤(페이지 이동 줄 없음). ③ 앱은 점을 누르면 바로 원문 모달 → 시안은 말풍선(모바일)·오른쪽 패널(PC) 먼저, 원문은 "원문 보기"에서. ④ 앱 내 비교는 카드 목록 → 시안은 `cut-dot-plot`(390-compare). ⑤ 수집 자료 표 화면(view=collected, "이 전형의 전체 자료를 표로 보기")은 이 slug 프레임에 넣지 않고 표 보기(1440-table · 390-table)가 대신해요.

### 5-1. 표 보기 (data-table)

공통: 머리글 {colors.canvas-soft} {typography.table-head}, 머리글 고정, 첫 열 고정, 행 구분 1px {colors.hairline}, 숫자 고정폭·오른쪽 정렬, 2027 열 Bold. 정렬 = 2027 70% 컷 오름차순(정렬 화살표는 2027 열 머리에), 다른 기준·준비 중 행은 맨 아래. 표 위 캡션 "학생부교과(지역균형) · 70% 컷 기준(기준 열이 다른 행은 표에만 있어요)" {typography.caption} {colors.text-muted}(D7).

전년 대비(cell delta, 2027 − 2026): "▲0.02" {colors.delta-up} / "▼0.07" {colors.delta-down}, 반드시 기호 + 차이값. 값이 같으면 "0.00" {colors.ink}, 한쪽 연도가 없으면 "—". 표 바로 아래 방향 캡션(필수): "전년 대비는 2027 컷에서 2026 컷을 뺀 값이에요. 등급은 숫자가 작을수록 상위예요 — ▲는 컷 숫자가 커진 것, ▼는 작아진 것이에요." {typography.caption} {colors.text-muted}. 증감 색은 이 열에만 써요.

PC 1440(내용 768):

| 열 | 폭 | 내용 |
|---|---|---|
| 학과 | 160 | 대학별 = 학과 이름. 내 비교 = `univ-logo` 20 + "대학 학과"(폭 220, 나머지 열을 줄여요) |
| 전형 | 120 | 전체 탭에서만(D7) |
| 2025 · 2026 · 2027 | 56 · 56 · 64 | 70% 컷. 없음 "—", 검수 전 `data-status-badge` "준비 중"(세 칸 합쳐 한 번) |
| 전년 대비 | 64 | 위 규칙 |
| 경쟁률 | 64 | 2027 값 "12.4:1" |
| 모집인원 | 48 | 2027 값 "18" |
| 기준 | 80 | "70% 컷" 또는 "등록자 평균"(D1). 셀에 마우스를 올리면 "반영 교과 평균"까지 보여요 |
| 담기 | 44 | `interest-heart` |

경영학과 행 = 고른 행({colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대, Selected 규칙). 표 보기에는 내 위치 띠가 없어서 Route Blue가 고른 행과 겹치지 않아요. 행을 누르면 오른쪽 패널이 바뀌어요.

모바일 390(내용 358, 표 안 가로 스크롤):

| 열 | 폭 | 비고 |
|---|---|---|
| 학과 (고정) | 150 | {typography.table} 한 줄("소프트웨어융합학과"가 한 줄에 들어가는 폭) |
| 2025 · 2026 · 2027 | 50 · 50 · 50 | 숫자 열 좌우 패딩 8 |
| 전년 대비 | 56 | 여기까지 첫 화면 356 |
| 경쟁률 · 모집 · 기준 · 담기 | 64 · 48 · 80 · 44 | 가로 스크롤해서 봐요. 표 오른쪽 끝에 잘린 열이 살짝 보이게 해서 넘길 수 있음을 알려요 |

행 높이 44(밀도: 셀 패딩 {spacing.xs} 위아래, 글자 한 줄). 첫 화면에 행 9개. 행을 누르면 `bottom-sheet`로 5-3 말풍선과 같은 내용을 보여줘요. 방향 캡션은 표 바로 아래.

### 5-2. 1440-compare 오른쪽 패널 (360)

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| C1 | 내 비교 목록 | `univ-logo` (20) + `interest-heart` 행 10개 | 제목 "내 비교 10개 · 최대 10개" {typography.title}. 행 = 로고 20 + "대학 학과" {typography.table} 한 줄 + 오른쪽 하트(담김). 하트를 끄면 목록·그래프에서 빠지고 `toast` "내 비교에서 뺐어요 · 되돌리기". 고른 행(경희대 경영학과) = Selected 규칙 |
| C2 | 고른 점 상세 | `data-table` | 4-2 R1~R3과 같은 내용(경희대 경영학과 · 논술 2027 고른 상태: 70% 컷 3.95 · 기준 70% 컷 · 반영 교과 평균) |
| C3 | 추가 | `button-outline` | "학교·학과 추가". 누르면 `modal`(제목 "학교·학과 추가", `text-input` "대학·학과 검색" + 9개 대학 → 학과 목록, 행마다 `interest-heart`). 10개가 차면 하트를 켤 때 `toast` "내 비교는 10개까지 담을 수 있어요" |

### 5-3. 390-dot-tooltip (점 말풍선)

- 그래프는 2장과 같고, 경영학과 2027 점이 고른 상태(3장 "고른 점") + 세로 안내선.
- 말풍선: 경영학과 행 바로 아래, 폭 358(좌우 16), {colors.canvas} + 1px {colors.ink}, 모서리 0, 그림자 없음. 위쪽 가운데가 아닌 고른 점 x 위치에 작은 꼬리(삼각 8). 아래 행들을 가려요(말풍선 밖을 누르면 닫혀요).
- 내용(위 → 아래):
  1. "경희대학교 경영학과" {typography.title} + 오른쪽 `interest-heart`(44×44)
  2. "학생부교과(지역균형) · 기준 70% 컷 · 반영 교과 평균" {typography.caption} {colors.text-muted}
  3. 작은 표(머리글 {colors.canvas-soft}): 열 = 학년도 46 · 70% 컷 · 50% 컷 · 경쟁률 · 모집 · 충원율(각 약 57), 행 = 2027(Bold) · 2026 · 2025. 값은 1-1. 연도가 없으면 "—"
  4. 아래 줄: 왼쪽 "원문 보기 ›" {typography.link} {colors.accent}(390-detail-sheet), 오른쪽 "될각에서 보기 ›" {typography.link} {colors.accent}. 그 아래 캡션 "작년 입결 사실만 모았어요" {typography.caption} {colors.text-muted}
  5. 맨 아래 `button-outline` "지원 준비에 추가"(폭 전체, 높이 44, 390-prepare-sheet) — 2026-11-24 상세화로 더함(앱에 있는 동작)
- 판정 이름·판정 색·순위 문구 없음.

### 5-4. 390-compare-empty (내 비교 비어 있음)

- 위쪽: 2장 셸 + M1(내 비교 선택, "내 비교 0"). M2·M3·M4·M7은 숨겨요(볼 데이터가 없어서).
- 가운데 `empty-state`: 흑백 선 하트 아이콘 → "비교할 학교·학과를 담아 주세요" {typography.heading-4} → "하트로 담은 학과가 여기 모여요. 최대 10개까지 같은 그래프에서 볼 수 있어요." {typography.body-sm} {colors.text-muted} → `button-primary` "학교·학과 추가"(design.md empty-state 규칙: 주요 버튼 하나). 누르면 `bottom-sheet` 검색(5-2 C3과 같은 내용) [P6, L8]
- 아래 `disclaimer-note`는 그대로 둬요.

## 6. 문구

| 자리 | 문구 |
|---|---|
| 화면 제목 | 수시 입결 |
| 내 위치 말풍선 | 내 환산 범위 약 2.3~2.6 |
| 출처 캡션 | 출처: 각 대학 공식 수시 입시결과 · 2025~2027학년도 · 70% 컷 · 데이터 기준일 2026-11-18 |
| 하단 고지 (`disclaimer-note`) | ⓘ 각 대학이 공식 발표한 수시 입결을 모은 참고 자료예요 · 대학마다 컷 산출 기준이 달라 대학끼리 같은 축에서 바로 비교하기 어려워요 · 내 환산 범위는 5 to 9 추정값이에요 · 대학 공식 자료가 최종 기준이에요 · 시안의 대학·숫자는 예시예요 · 데이터 기준일 2026-11-18 |
| 검수 전 | 준비 중 |
| 다른 기준 | 70% 컷 미공개 · 표에서 볼 수 있어요 |
| 신설 | 입결 없음(신설) |
| 필터 결과 없음 | 고른 조건에 맞는 학과가 없어요. 계열이나 연도를 바꿔 보세요 |
| 추이 부족 | 공개된 연도가 1개뿐이라 추이 선이 없어요 |

문구 점검: 모두 해요체. 지난 입결 사실과 기준만 적고, 지원 결과를 예측·약속하는 말, 순위 문구("상위 n%"), 권유 말투는 쓰지 않았어요. 판정은 될각 링크로만 넘겨요.

## 7. 접근성

- 그래프 대체 텍스트(행마다 하나 + 전체 하나). 전체: "경희대학교 학생부교과 2027학년도 70% 컷, 의예과 1.08부터 국어국문학과 2.61까지 11개 학과. 내 환산 범위 약 2.3~2.6." 점: "경영학과 2027학년도 70% 컷 2.18, 2026학년도 2.25, 2025학년도 2.31".
- 같은 데이터가 표 보기에 있어서 표가 그래프의 대신 읽기 역할을 해요.
- 키보드: 그래프에 들어가면 방향키 위·아래 = 행, 왼쪽·오른쪽 = 같은 행의 점, Enter = 고르기(말풍선·패널), Esc = 닫기. 포커스 2px 잉크 링(점은 원형 링).
- 연도는 진하기 + 범례 글자로, 전형은 모양 + 범례로 구분해요(색만으로 구분하지 않아요). 전년 대비는 색 + ▲▼ + 숫자.
- 대비: 연도 점 색({colors.year-prev} 6.7:1 · {colors.year-old} 3.4:1)은 점에만 쓰고 글자에는 쓰지 않아요. {colors.text-faint}는 비활성 버튼 글자에만. {colors.accent-soft} 띠 위 글자는 {colors.ink}.
- 터치 영역: 점 하나의 누르는 영역은 지름 11이 아니라 32×40(행 높이)이에요. 겹치면 가장 가까운 점을 골라요. 모바일 모든 버튼·칩 44 이상, PC 표 안 컨트롤 32 이상.
- 보기 전환·말풍선 150ms, 시트·모달 240ms, prefers-reduced-motion이면 바로 보여줘요.

## 8. 디자이너 메모

- 03-draft.json frames = 정확히 2개: admission-results/390 (390×844), admission-results/1440 (1440×900). 5장 상태 프레임 37개(기존 5 + 상세화 32)는 같은 Figma 섹션에 그리고 states에만 적어요(frames에 넣으면 G3 실패).
- 레이어 이름 = 컴포넌트 이름: `app-bar`, `sub-nav`, `tab-bar-pill`, `sidebar`, `brand-logo`, `sidebar-group`, `sidebar-item`, `page-header`, `mode-switch`, `segmented-control`, `segmented-control-active`, `filter-chip`, `univ-logo`, `interest-heart`, `cut-dot-plot`, `data-table`, `data-status-badge`, `disclaimer-note`, `empty-state`, `button-primary`, `button-outline`, `button-pill-soft`, `bottom-sheet`, `modal`, `toast`, `text-input`, `text-input-error`, `warning-callout`. 리드·범례·출처·불러오는 중·오류 줄은 "lead"·"legend"·"source-caption"·"loading-line"·"error-line" 일반 레이어.
- 모서리 전부 0. ELLIPSE는 `cut-dot-plot` 원 점(●○)에만. 마름모(◆◇)는 45° 돌린 정사각형(모서리 0).
- 그림자: `bottom-sheet`·`modal`·`toast`·떠 있는 목록에만 {shadow.overlay}. 말풍선·그래프·패널·세그먼트·오류 줄에는 없음.
- 색: 모든 fill·stroke 팔레트 변수 바인딩. Route Blue = ① 내 위치 띠·선·말풍선 숫자 ② 선택 표시(세그먼트·`sub-nav`·`sidebar-item`·켜진 `filter-chip`·표 고른 행·목록 고른 행 + icon/check) ③ 링크. 증감 색은 표 "전년 대비" 열에만, 연도 색은 점에만, {colors.heart}는 담긴 하트에만, {colors.judge-risk}는 `text-input-error` 한 곳(390-prepare-sheet)에만. 판정 색·등급 색·일정 종류 색은 이 화면에 없어요. 오류 줄 아이콘은 {colors.ink}.
- `univ-logo`·`brand-logo`는 원본 색·비율 그대로(팔레트 예외, 레이어 이름 필수). 로고 파일이 없으면 `univ-monogram`.
- 글꼴 Pretendard(없으면 IBM Plex Sans KR) 300/400/600/700, 자간 0, 숫자 고정폭.
- 같은 `cut-dot-plot`이 five-to-nine 배치표 팝업에도 들어가요. 점 모양·말풍선·범례를 한 컴포넌트로 만들어 두 화면에서 같이 써요.

### 8-1. 상세화 그리는 순서 (2026-11-24)

Figma MCP 호출 한도가 있으니 한 번에 몰지 말고 아래 묶음 순서로, 묶음마다 기본 프레임을 복제해서 바뀌는 곳만 고쳐요.

1. 기본 프레임 바로잡기(0-1 U1~U7): admission-results/390 · 1440의 `sub-nav` 10탭, 사이드바 `brand-logo` 124 · 메뉴 10행, `page-header`, Page 바탕, 점 지름 11 · 연도 색 · 범례. 승인 레이아웃(자리·크기)은 그대로 두고 이것부터 끝내요(상태 프레임이 전부 이걸 복제해요).
2. 기존 상태 5장도 같은 기준으로 고쳐요: 1440-table · 1440-compare · 390-table · 390-dot-tooltip(아래 줄 "원문 보기 ›" + "지원 준비에 추가" 추가) · 390-compare-empty. 1440 오른쪽 패널 R3도 같이.
3. A 불러오기·오류 4장(390-loading → 1440-loading → 390-error → 1440-error) — 위쪽 셸 그대로, 그래프 자리만 바꿔요.
4. C 데이터 상태 6장(390-partial → 390-no-plot → 390-no-position → 1440-no-position → 390-conditions-sheet → 1440-conditions-modal).
5. B 고르기·거르기 8장(시트·떠 있는 목록부터: 390-univ-sheet → 1440-univ-dropdown → 390-program-sheet → 390-filter-sheet → 390-search → 390-search-empty → 1440-search-empty → 390-type-none).
6. D 원문 상세 2장(390-detail-sheet → 1440-detail-modal).
7. E 내 비교 8장: 390-compare를 먼저(1440-compare의 모바일판, 다른 프레임의 바탕) → 1440-compare-empty → 390-compare-add-sheet → 1440-compare-add-modal → 390-toast-removed → 1440-toast-removed → 390-compare-full → 390-heart-error.
8. F 지원 준비 4장(390-prepare-sheet → 1440-prepare-modal → 390-prepare-leave-confirm → 1440-prepare-leave-confirm).
9. 배치: 섹션 안에서 기본 2장 오른쪽에 묶음(A~F)별 한 줄, 같은 줄에 모바일 → PC 순서. 03-draft.json states에 37개 이름 = 노드 id를 모두 적어요.
10. 마지막 점검: 판정 이름·판정 색 0개, Route Blue 숫자 화면당 1~2개, 오류는 아이콘 + 글자, 문구 해요체, 예시 숫자는 1장 값만.

## 9. design.md 수정 제안 (만들지 않고 제안만)

1. ~~apply4.py 실행~~ → 반영됨(2026-11-24 확인: `cut-dot-plot` · `sub-nav` · `sidebar-group`이 rules에 있어요).
2. `cut-dot-plot` 축 자동 범위(D5): "데이터 + 내 위치를 0.5 단위로 감싼 구간, 최소 2등급 폭, 축 머리에 구간 캡션"을 정의에 추가.
3. `cut-dot-plot` 말풍선: 정의의 내용(대학·학과·전형·연도·컷·모집인원)에 50% 컷 · 경쟁률 · 충원율 · 기준 · "원문 보기" 링크를 추가하고, 모양(캔버스 + 1px 잉크, 그림자 없음)을 적어 주세요. 말풍선은 아직 컴포넌트 목록에 없어서 이 명세는 `cut-dot-plot` 안 레이어로 그려요.
4. `cut-dot-plot` 전체 탭 줄 나누기: 행 안을 전형 유형별 줄(−8/0/+8)로 나누는 규칙 추가.
5. ~~이전 연도 점 대비~~ → Year Ramp(year-prev · year-old)로 반영됨. 이 명세도 그 색으로 바꿨어요.
6. ~~증감 색 방향 캡션~~ → Delta 규칙에 반영됨.
7. 모바일 표 예외(five-to-nine v2-9 제안 2와 같음): 공통 원칙 "표는 모바일에서 카드 목록"에 "연도 비교 표는 첫 열 고정 + 표 안 가로 스크롤"을 허용.
8. Responsive Strategy에 "수시 입결" 행 추가: 모바일 "보기 범위 → 전형 탭 → 좌표/표 전환 → 점 그래프(축 자동 범위) → 출처 → 고지", PC "넓은 점 그래프 + 오른쪽 360 패널(고른 점 상세 · 내 비교)".
9. `univ-logo` 크기 단계(표·목록 20 / 머리 32) 정의(five-to-nine 제안 5와 같음).
10. `checkbox`는 생겼지만 이 화면은 하트로 내 비교를 켜고 꺼요. 그래프에 그릴 행만 따로 고르는 기능이 필요해지면 그때 `checkbox` 여러 개 고르는 목록을 써요(제안 아님, 기록).
11. (상세화) `toast` 행동 버튼 변형: 지금 정의는 글자 한 줄뿐이에요. "내 비교에서 뺐어요 · 되돌리기"처럼 되돌릴 수 있는 일 뒤에 오른쪽 텍스트 버튼 1개({colors.on-primary} SemiBold 밑줄, 누르는 영역 44, 4초 표시, 버튼이 있으면 6초)를 두는 변형을 추가해 주세요. 이 명세는 그 전까지 `toast` 안 텍스트 레이어 "되돌리기"로 그려요(390-toast-removed · 1440-toast-removed).
12. (상세화) 그래프 안 "내 범위 없음" 한 줄: 내 위치를 그릴 수 없을 때 축 머리 위 말풍선 자리에 안내 한 줄 + 링크를 두는 규칙을 `cut-dot-plot` 정의에 추가(390-no-position). 지금은 일반 텍스트 레이어로 그려요.
