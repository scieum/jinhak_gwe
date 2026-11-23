# 02-spec — 최저로 찾기 (minimum-search, 학생)

작성일 2026-11-22 · 담당 planner (S2) · 개정 2026-11-24 (S2 상세화)
근거: 01-research.md(P1~P9, 미결 1~6), docs/design.md(2026-11-24 판: App Shell, 수능 최저 판정 배지 ▲·✕, stat-tile 변형 filter, univ-card, data-table, text-input 변형, bottom-sheet 단일 선택 목록, modal, toast, empty-state · 화면 오류 줄 · 불러오는 중, 확인 창 규칙, brand-logo, page-header, Voice), docs/prd.md(6-1 수능최저 구조화 조건식, 3-5 검수 뒤 공개, 6-12 판정 5종), docs/story-service.md NEVER-1/2.
겹치지 않게 본 것: work/minimum-board/02-spec.md(교사, 학생별 1순위 목표), work/mock-score/02-spec.md(가채점, 내 수시로 카드 최저 현황). 이 화면은 "내 등급 × 검수된 전체 수능 최저 전형"이에요.
위치: 학생 대분류 "대학 찾기" › 소분류 "최저로 찾기". 소분류 화면이라 뒤로가기 없음.
프레임: minimum-search/390 (390×844), minimum-search/1440 (1440×900) — 2026-11-23 승인(v2). 상태 프레임 35장은 5장.
필수 포함: `trace-accordion`, `disclaimer-note` (판정이 나오는 화면이라 design.md Do 규칙대로 넣어요).

앱 구현 확인(2026-11-24): app/src에 이 화면 구현이 없고 Placeholder 화면("준비 중이에요.")만 있어요. 그래서 상태 프레임은 같은 앱의 비슷한 부품 동작에서 가져왔어요 — `interest-heart` 담기·빼기 문구와 저장소 오류(app/src/components/InterestButton.tsx), 수시로 안(A·B·C안) 골라 담기와 "이미 담았어요"(app/src/screens/Susiro.tsx), "○○을 읽고 있어요." 불러오는 중 줄, 필터 결과 0건 `empty-state` + 초기화 버튼(app/src/components/PlacementExplorer.tsx), 판정 5종과 이유 문장(app/src/domain/minimum.ts). 앱에 없는 안전장치(수시로 담기 안 고르기 시트·모달, 담기·빼기 완료 `toast`)도 넣었어요.

## 0. 결정 (01-research 미결 정리)

| # | 미결 | 결정 | 이유 |
|---|---|---|---|
| D1 | 검수 전 기준을 목록에 넣을지 / 자료 부족에 셀지 | **둘 다 아니에요.** 검수 전 기준(교사 입력·모집요강 미반영·관리자 검수 대기)은 목록에 넣지 않고 판정도 하지 않아요. 자료 부족 개수에도 넣지 않아요. 충족 현황 아래에 개수만 따로 한 줄 "검수 전이라 판정하지 않은 전형 37개" + `data-status-badge` "준비 중"으로 알려요 | design.md 수능 최저 판정 배지(학생 화면 규칙)에 반영됐어요. 개수 세기는 계산이 아니라 목록 건수라서 NEVER-1에 걸리지 않아요 |
| D2 | 자료 부족의 뜻 | 검수된 기준은 있는데 **내 성적에 그 기준 영역이 없어서** 판정이 안 갈리는 전형만이에요(예: 한국사 미입력). 다른 조건에서 이미 기준 밖이면 미충족으로 셈 | minimum-board·mock-score의 자료 부족과 같은 뜻 |
| D3 | what-if 범위 | **한 번에 한 영역만, 1등급만** 올려 봐요(국어 · 수학 · 영어 · 탐구 4행). 여러 영역 동시 조절·스텝퍼는 두지 않아요. 이미 1등급인 영역은 "이미 1등급이에요"(상태 390-whatif-max) | 근접 정의와 같은 범위. 조합 조절은 "이렇게 하면 된다"로 읽힐 위험이 커요 |
| D4 | 판정에 쓸 등급 | 모의고사 실채점 = 그 등급 그대로. 가채점 = 예상 등급 범위의 불리한 쪽(큰 숫자, mock-score 규칙, 상태 390-gachae). 가채점 등급컷이 검수 전이면 판정하지 않아요(상태 390-nocut) | R-JDG-002 방향, NEVER-1 |
| D5 | 판정 표시 | 수능 최저 판정 배지(design.md 2026-11-23): 충족 = 안정 쌍 ● / 근접 = 적정 쌍 ▲(속이 찬 세모) / 미충족 = 위험 쌍 ✕ / 자료 부족 = 판정 없음 쌍, 아이콘 없이 이름만. 늘 색 + 아이콘 + 이름. "판정 불가"(대학 기준 없음)는 D1에 따라 이 화면에 없어요 | design.md, minimum-board·mock-score와 같은 정의 |
| D6 | 요약 타일 | **개정:** 충족 현황 타일 4개 = `stat-tile` 변형 filter(타일이 아래 목록을 걸러요). 값 앞에 판정 아이콘 + 판정 글자색(충족 ● 안정 글자색 · 근접 ▲ 적정 글자색 · 미충족 ✕ 위험 글자색 · 자료 부족 아이콘 없음 잉크). 고른 타일 1개 = Elevation Selected, 다시 누르면 풀려서 "전체". 비율 막대 없음 | design.md stat-tile 변형 filter, "목록을 거르지 않는 같은 무게 타일 3개 이상 금지" |
| D7 | 내 위치 표시(P8) | 범위 막대·점은 두지 않고 "기준 합 5 · 내 합 6"처럼 숫자로만 써요. Route Blue는 선택 표시·링크에만 써요 | 맞는 컴포넌트가 없고(cut-compare-bar는 입결 컷용), 숫자 두 개로 충분해요 |
| D8 | 정렬 | 기본 = 판정 순(충족 → 근접 → 미충족 → 자료 부족), 같은 판정 안에서는 대학 이름 가나다순. 여유(기준 − 내 합)로 줄 세우지 않아요 | 순위처럼 읽히지 않게 |
| D9 | 담기 | 카드·행마다 `interest-heart`(관심) + "수시로에 담기". **개정:** 수시로는 A·B·C안이 있어서 담기를 누르면 어느 안에 담을지 고르는 시트(모바일 `bottom-sheet`) · 모달(PC `modal`)이 먼저 떠요. 담은 뒤·뺀 뒤는 늘 `toast` | 앱 Susiro의 안 고르기 · "이미 담았어요" 동작, design.md 확인 창 "끝난 결과는 toast" |
| D10 | 내비 이름 | **개정:** 대학 찾기 소분류 = 전형계획 · 대학 지도 · 수시 입결 · 전국 배치표 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기 · 지원 자격 확인표 · 전형 비교(design.md App Shell 2026-11-24) | design.md App Shell |

### 0-1. 최신 design.md와 맞춘 점 (2026-11-24, 승인 레이아웃은 그대로)

| # | 바뀐 점 | 기존 설명 → 바로잡음 |
|---|---|---|
| C1 | 근접·미충족 아이콘 | 근접 ◐ → **▲**(적정 쌍, 속이 찬 세모), 미충족 ■ → **✕**(위험 쌍). 범례·배지·타일·근거 마지막 줄 모두 |
| C2 | 충족 현황 타일 | 잉크 숫자 4개(거르지 않음) → `stat-tile` 변형 filter(D6). 그래서 모바일 M6 · PC P4의 판정 `filter-chip` 4개는 빼요(타일이 같은 일을 해요). 자리·크기는 그대로 |
| C3 | 대학 카드 | 판정 배지를 이름 줄 오른쪽 → **첫 줄 `judge-badge` size=lg**, 둘째 줄 로고 + 대학명(univ-card v2) |
| C4 | PC 결과 표 판정 칸 | 152행이라 `judge-badge` compact(채움 없이 글자색 아이콘 + 이름). 미충족 행은 첫 칸 앞에 ✕ 아이콘(주의 행 규칙) |
| C5 | PC 머리 | 상단 바 → `page-header`(경로 "대학 찾기" caption → 제목 heading-1, 오른쪽 데이터 기준일 `data-status-badge` + `mode-switch` + 잠금). 사이드바 맨 위 `brand-logo` 폭 124(U:NAVI 로고 원본). 글자 워드마크 "진학 내비" 없음 |
| C6 | 메뉴 | `sub-nav` · `sidebar-item` 소분류를 D10의 10개로. 모바일 `tab-bar-pill` = 홈 · 성적 · 대학 찾기 · 수시 전략 · 더보기 |
| C7 | 바탕·카드 | 화면 바탕 Page {colors.canvas-soft}, 카드·표 묶음은 테두리 없는 흰 카드. Page 위에 바로 놓이는 `segmented-control` 트랙 · `text-input`(on=page) · `data-status-badge` · `button-pill-soft`는 {colors.canvas} 채움 |
| C8 | 입력칸 | PC 검색 = `text-input` on=card, size=sm 40, 왼쪽 icon/search 20 |
| C9 | 이 화면에 쓰지 않는 것 | `promo-banner` · 길콩 · 일정 종류 색 · 증감 색 · 등급 색 · `checkbox`(필터는 칩으로 골라요) · data-table 변형 expand·link 없음 |

## 1. 시안 데이터 (가상)

대학명은 실제, 기준·등급·개수는 모두 시안용 예시예요(실제 모집요강 아님). 학생은 "나".

기준 성적: 10월 모의고사(고3) 실채점. 판정에 쓴 등급 = 국어 3 · 수학 2 · 영어 2 · 탐구 2(상위 1과목, 2과목 평균 2.5) · 한국사 미입력.

충족 현황(검수된 수능 최저 전형 152개 기준): 충족 48 · 근접 21 · 미충족 71 · 자료 부족 12 (합 152). 검수 전이라 판정하지 않은 전형 37개(D1).

what-if(한 영역만 1등급 오르면, 충족 전형 수):

| 영역 | 지금 → 바꾼 등급 | 충족 전형 지금 → 바꾼 뒤 | 차이 |
|---|---|---|---|
| 국어 | 3 → 2 | 48 → 63 | +15개 |
| 수학 | 2 → 1 | 48 → 57 | +9개 |
| 영어 | 2 → 1 | 48 → 60 | +12개 |
| 탐구 | 2 → 1 | 48 → 55 | +7개 |

한 전형이 여러 영역에서 같이 셀 수 있어서 차이를 더하면(43) 근접 21개보다 커요. 캡션으로 알려요.

상태 프레임용 보조 예시(같은 152개 기준, 시안 예시):
- 9월 모의고사 실채점: 국어 3 · 수학 2 · 영어 1 · 탐구 2 · 한국사 미입력 → 충족 52 · 근접 19 · 미충족 69 · 자료 부족 12. what-if 국어 3 → 2 52 → 66 +14개 · 수학 2 → 1 52 → 60 +8개 · 영어 "이미 1등급이에요" · 탐구 2 → 1 52 → 58 +6개.
- 가채점(등급컷 관리자 검수 2026-11-20): 예상 등급 국어 2~3 · 수학 2 · 영어 2 · 탐구 2~3 → 판정에 쓴 등급 국어 3 · 수학 2 · 영어 2 · 탐구 3 → 충족 41 · 근접 24 · 미충족 75 · 자료 부족 12. what-if 국어 3 → 2 41 → 55 +14개 · 수학 2 → 1 41 → 49 +8개 · 영어 2 → 1 41 → 52 +11개 · 탐구 3 → 2 41 → 50 +9개.
- 필터 시트에서 계열 "의약" + 지역 "강원"을 고르면 충족 전형 3개.
- 수시로 안: A안 담긴 카드 4 / 6 · B안 이 전형이 이미 담겨 있음 · C안 6 / 6.

결과 목록 예시(로고 파일 있는 대학만: 연세대 · 고려대 · 성균관대 · 한양대 · 중앙대 · 경희대 · 강원대 · 한림대):

| 대학 · 모집단위 | 전형 | 기준(검수 완료) | 기준 합 | 내 합 | 판정 | 한 줄 |
|---|---|---|---|---|---|---|
| 강원대학교 간호학과 | 교과(일반) | 국·수·영·탐 중 2개 합 6 이내 | 6 | 4 | 충족 ● | 수학 2 + 영어 2 = 4 |
| 경희대학교 경영학과 | 교과(지역균형) | 국·수·영·탐 중 2개 합 5 이내 | 5 | 4 | 충족 ● | 수학 2 + 영어 2 = 4 |
| 성균관대학교 글로벌경영학과 | 교과(학교장추천) | 국·수·영·탐 중 3개 합 7 이내 | 7 | 6 | 충족 ● | 수학 2 + 영어 2 + 탐구 2 = 6 |
| 중앙대학교 경영학부 | 교과(지역균형) | 국·수·영·탐 중 3개 합 5 이내 | 5 | 6 | 근접 ▲ | 수학·영어·탐구 중 하나가 1등급이면 기준 안이에요 |
| 한양대학교 컴퓨터소프트웨어학부 | 교과(추천형) | 수학 포함 2개 합 3 이내 | 3 | 4 | 근접 ▲ | 수학이나 영어가 1등급이면 기준 안이에요 |
| 연세대학교 경영학과 | 교과(추천형) | 국·수 포함 3개 합 5 이내 | 5 | 7 | 미충족 ✕ | 기준보다 합이 2 커요 |
| 고려대학교 경영학과 | 교과(학교추천) | 국·수·영·탐 4개 합 7 이내 | 7 | 9 | 미충족 ✕ | 기준보다 합이 2 커요 |
| 한림대학교 간호학과 | 교과 | 국·수·영·탐 중 3개 합 7 이내 · 한국사 4 이내 | 7 | 6 | 자료 부족 | 한국사 성적을 넣으면 볼 수 있어요 |

## 2. 모바일 390×844 (frame minimum-search/390)

앱 셸: Page {colors.canvas-soft} 바탕. `app-bar`(뒤로가기 없음, 가운데 "최저로 찾기", 오른쪽 보조 동작 없음) → `sub-nav`(D10 10개, "최저로 찾기"가 보이게 민 상태, 선택 = 잉크 SemiBold + 아래 2px {colors.accent}) → 본문 → 하단 `tab-bar-pill`(대학 찾기 선택). 좌우 패딩 16(콘텐츠 358), 요소 간격 12, 섹션 간격 {spacing.xl}. 마지막 요소 아래 여백 96.

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| M1 | 기준 성적 고르기 | `segmented-control`, `segmented-control-active` | 4칸 "10월 · 9월 · 6월 · 가채점"(각 약 89, 높이 44), 10월 선택. Page 위라 트랙 {colors.canvas} [P7] |
| M2 | 내 등급 줄 | 텍스트 | "국 3 · 수 2 · 영 2 · 탐 2 · 한국사 –" {typography.table} 고정폭, 색 없음. 오른쪽 "성적 바꾸기 ›" {typography.link} {colors.accent}(성적 입력으로). 아래 캡션 "10월 모의고사 실채점 · 탐구는 상위 1과목" {typography.caption} {colors.text-muted} |
| M3 | 충족 현황 | `stat-tile` 변형 filter ×4 (2×2) | 제목 "충족 현황" {typography.heading-4}. 타일: 라벨 caption → 값(아이콘 + 숫자 {typography.numeric}) → 설명 body-sm. 충족 "● 48개" "지금 등급으로 기준 안" / 근접 "▲ 21개" "한 영역 1등급이면 기준 안" / 미충족 "✕ 71개" / 자료 부족 "12개" "내 성적에 없는 영역이 있어요". 기본 프레임은 충족 타일 선택(Selected). 타일 아래 캡션 "검수된 수능 최저 전형 152개 기준이에요" + 다음 줄 "검수 전이라 판정하지 않은 전형 37개" + `data-status-badge` "준비 중" [P3, D1, D6] |
| M4 | 한 영역만 1등급 오르면 | 행 목록(텍스트) | 흰 카드. 제목 "한 영역만 1등급 오르면" {typography.heading-4}. 행 4개(높이 52, 행 구분 1px {colors.hairline}): 왼쪽 "국어 3 → 2" {typography.title}, 가운데 "충족 48 → 63" {typography.table}, 오른쪽 "+15개" {typography.title} 고정폭 {colors.ink}. 차이에 색 없음. 행을 누르면 선택 행(Selected)이 되고 목록이 "국어 1등급 오르면 새로 충족 15개"로 바뀌어요(상태 390-whatif). 행 아래 캡션 "한 번에 한 영역만 바꿔 봐요 · 한 전형이 여러 영역에서 같이 셀 수 있어서 더하면 근접 수보다 커요" [P2, P4, D3] |
| M5 | 판정 범례 | 텍스트 + `judge-badge` 축소 | 한 줄(넘치면 두 줄): "● 충족 기준 안 · ▲ 근접 한 영역 1등급이면 기준 안 · ✕ 미충족 · 자료 부족" {typography.caption}. 아이콘 + 이름 + 판정 색을 배지 모양 그대로 [P6] |
| M6 | 조건 칩 줄 | `filter-chip` ×3 | 가로 스크롤 칩 "계열 전체 ▾" · "지역 전체 ▾" · "전형 유형 전체 ▾"(높이 32, 터치 44). 누르면 필터 `bottom-sheet`(상태 390-filter)가 그 묶음 위치로 열려요. 칩에 판정 색 없음. 판정 칩은 C2로 빠졌어요 [P5] |
| M7 | 결과 개수 줄 | 텍스트 | "충족 48개 · 대학 이름 순" {typography.body-sm} {colors.text-muted} [P1, D8] |
| M8 | 결과 목록 | `univ-card` 목록 | 카드 한 장(흰 카드, 패딩 16, 카드 사이 8): 1줄 `judge-badge` size=lg "● 충족" + 오른쪽 위 `interest-heart`(44×44) / 2줄 `univ-logo` 32 + "경희대학교" {typography.heading-3} / 3줄 "경영학과 · 교과(지역균형)" {typography.body-sm} {colors.text-muted} / 4줄 기준 "국·수·영·탐 중 2개 합 5 이내" {typography.body-sm} / 5줄 "기준 합 5 · 내 합 4" {typography.table} 고정폭 / 6줄 한 줄 설명 "수학 2 + 영어 2 = 4" {typography.body-sm} {colors.ink} / 아래 `trace-accordion` 접힘 "어떻게 계산했나요?" + `button-pill-soft` "수시로에 담기". 아코디언은 한 번에 한 카드만 펼쳐요. 프레임에는 충족 카드 2장(강원대학교 · 경희대학교)까지 보이고 나머지는 스크롤 [P8, D7, D9] |
| M9 | 하단 고지 | `disclaimer-note` | 6장 고지 문구 |

모바일 Route Blue: `sub-nav` 선택 막대, `segmented-control-active`, 고른 `stat-tile`(Selected), 켜진 `filter-chip`, what-if 선택 행, "성적 바꾸기 ›" 링크, `tab-bar-pill` 선택 아이콘. 숫자에는 쓰지 않아요.

## 3. PC 1440×900 (frame minimum-search/1440)

앱 셸: 왼쪽 `sidebar` 248(맨 위 `brand-logo` 폭 124), `sidebar-group` 홈(접힘) · 성적(접힘) · **대학 찾기(펼침)** · 수시 전략(접힘), 대학 찾기 아래 `sidebar-item` 10개(D10) 중 **최저로 찾기 선택 = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + {colors.ink}**, 들여쓰기 16. 맨 아래 데이터 기준일 + `button-pill-soft` "백업".
머리: `page-header` — 경로 "대학 찾기" {typography.caption} {colors.text-muted} → 제목 "최저로 찾기" {typography.heading-1}, 오른쪽 `data-status-badge` "데이터 기준일 2026-11-18" + `mode-switch`(학생) + 잠금 아이콘. 주요 버튼 없음(주요 버튼은 R3 하나).
본문: Page 바탕, 가운데 832(좌우 패딩 32 → 내용 768) + 오른쪽 보조 패널 360. 섹션 간격 {spacing.lg}(데이터 화면).

### 3-1. 가운데 본문 (768)

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| P1 | 기준 성적 줄 | `segmented-control`, `segmented-control-active` + 텍스트 | 왼쪽 "10월 모의고사 · 9월 모의고사 · 6월 모의고사 · 가채점"(폭 440, 10월 선택). 오른쪽 내 등급 "국 3 · 수 2 · 영 2 · 탐 2 · 한국사 –" {typography.table} + "성적 바꾸기 ›" {typography.link} {colors.accent}. 아래 캡션은 M2와 같음 [P7] |
| P2 | 충족 현황 | `stat-tile` 변형 filter ×4 (한 줄) | 제목 "충족 현황" {typography.heading-4}. 타일 각 174, 사이 24, 흰 카드. 내용은 M3와 같음(아이콘 + 판정 글자색 값). 기본 프레임은 타일 선택 없음 = "전체 152개". 타일 아래 같은 캡션 + `data-status-badge` "준비 중" [P3, D1, D6] |
| P3 | 한 영역만 1등급 오르면 | `data-table` (4열) | 제목 "한 영역만 1등급 오르면" {typography.heading-4} + 오른쪽 캡션 "한 번에 한 영역만 바꿔 봐요". 열(폭): 영역 160 · 지금 → 바꾼 등급 200 · 충족 전형 지금 → 바꾼 뒤 248 · 차이 160. 행 = 1절 what-if 4행, 높이 44. 숫자 고정폭 오른쪽 정렬, 차이는 "+15개" 부호 + 숫자만(증감 색·판정 색 없음). 행을 누르면 선택 행 + 결과 표가 "새로 충족" 목록으로 바뀌어요(상태 1440-whatif). 표 아래 캡션 "한 전형이 여러 영역에서 같이 셀 수 있어서 더하면 근접 수보다 커요" [P2, P4, D3] |
| P4 | 범례 + 조건 | 텍스트 + `filter-chip` + `text-input` | 1줄: 범례(M5와 같음). 2줄: 드롭다운 칩 "계열 전체 ▾" · "지역 전체 ▾" · "전형 유형 전체 ▾"(높이 32, 누르면 칩 아래 4px 떠 있는 목록, 상태 1440-dropdown), 오른쪽 끝 `text-input`(on=card, size=sm 40, 폭 200) "대학·학과 검색" + icon/search [P1, P5, P6] |
| P5 | 결과 표 | `data-table` | 제목 줄 "전체 152개" {typography.title} + 오른쪽 캡션 "판정 순 · 대학 이름 순". 열(폭): 대학 · 모집단위 232(`univ-logo` 20 + 두 줄) · 전형 112 · 기준 176(두 줄까지) · 기준 합 56 · 내 합 56 · 판정 96(`judge-badge` compact) · 담기 40(`interest-heart`) = 768. 머리글 {colors.canvas-soft} 고정, 첫 열 고정, 판정 열에 정렬 화살표. 행 높이 56. 1절 목록 8행(판정 4종이 한 화면에 보이게). 미충족 행은 첫 칸 앞 ✕ 아이콘. 중앙대학교 경영학부 행이 선택 행({colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + 아래 1px {colors.hairline}). 넘치면 표 안 세로 스크롤 [P8, D8] |
| P6 | 하단 고지 | `disclaimer-note` | 6장 고지 문구 |

### 3-2. 오른쪽 보조 패널 (360, 패딩 24 → 안쪽 312, 흰 바탕 + 왼쪽 1px {colors.hairline-soft})

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| R1 | 고른 전형 머리 | `univ-logo` (32) + `interest-heart` + `judge-badge` | 캡션 "고른 전형" {colors.text-muted} → 로고 32 + "중앙대학교 경영학부" {typography.heading-4} + 오른쪽 하트. 아래 "교과(지역균형) · 기준 합 5 · 내 합 6" {typography.body-sm} {colors.text-muted}. 다음 줄 `judge-badge` "▲ 근접" + "수학·영어·탐구 중 하나가 1등급이면 기준 안이에요" {typography.body-sm} |
| R2 | 산출 근거 | `trace-accordion` (펼침) | 제목 "어떻게 계산했나요?". 단계(이름 {typography.body-sm} {colors.text-muted} → 값 {typography.table}): ① 기준 출처 → 2028 모집요강 · 관리자 검수 2026-11-12 ② 기준 → 국·수·영·탐 중 3개 합 5 이내(탐구 상위 1과목) ③ 판정에 쓴 등급 → 10월 모의고사 실채점: 국 3 · 수 2 · 영 2 · 탐 2 ④ 고른 영역 → 수학 2 + 영어 2 + 탐구 2 = 6 ⑤ 기준과 비교 → 6 / 기준 5, 1 커요 ⑥ 판정 규칙 → 한 영역만 1등급 좋아지면 기준 안이라서 근접. 마지막 줄(위 1px {colors.hairline}, 굵게) "▲ 근접 — 수학·영어·탐구 중 하나가 1등급이면 기준 안이에요". 맨 아래 `disclaimer-note` "수능 최저 기준은 대학 모집요강이 최종 기준이에요 · 데이터 기준일 2026-11-18" |
| R3 | 담기 | `button-primary` | "수시로에 담기"(폭 312, 높이 44). 이 화면의 주요 버튼은 이것 하나. 누르면 안 고르기 `modal`(상태 1440-susiro-modal) |

PC Route Blue: `sidebar-item` 선택, `segmented-control-active`, 고른 `stat-tile`, 켜진 `filter-chip`, 표 선택 행, 링크. 숫자·판정 배지·버튼 채움에는 쓰지 않아요.

## 4. 판정·계산 규칙 (디자인 시안 숫자의 근거)

- 기준은 관리자 검수 완료 csat_minimum 조건식만 읽어요(D1). 조건식 해석은 검수된 규칙 그대로이고 이 화면이 새 환산을 만들지 않아요.
- 충족 = 모든 조건이 기준 안. 근접 = 한 영역만 1등급 좋아지면 모든 조건이 기준 안. 미충족 = 그 밖. 자료 부족 = 내 성적에 없는 영역 때문에 갈리지 않음(D2).
- what-if = 영역 하나의 판정용 등급을 1 줄였을 때 충족이 되는 전형 수. 미충족·자료 부족 전형은 what-if로 충족이 되면 "새로 충족"에 들어가요(근접 정의상 대부분 근접에서 와요). 이미 1등급인 영역은 계산하지 않아요.
- 가채점: 판정용 등급 = 범위의 큰 숫자 쪽(D4). 등급컷 검수 전이면 판정·what-if 모두 하지 않아요.

## 5. 상태 프레임 (03-draft.json states에만 적고 frames에는 넣지 않아요)

모두 35장(모바일 18 · PC 17). 기존 7장(390-noscore · 390-nodata · 390-nocut · 390-zero · 390-filter · 390-trace · 1440-whatif)은 C1~C9에 맞춰 다시 그리고, 나머지 28장은 새로 그려요. 말하지 않은 부분은 기본 프레임과 같아요. 떠 있는 레이어(`bottom-sheet` · `modal` · `toast` · 떠 있는 목록)만 그림자, 뒤는 {colors.scrim}(목록·toast는 scrim 없음).

### 5-1. 모바일 (390×844)

| 프레임 | 무엇을 그리나 |
|---|---|
| minimum-search/390-loading | **불러오는 중.** 셸 + M1(10월 선택) 아래 본문 자리에 "검수된 수능 최저 기준을 읽고 있어요." {typography.body-sm} {colors.text-muted} 한 줄만. 타일·what-if·목록·스켈레톤 없음 |
| minimum-search/390-error | **기준을 읽지 못함.** M1·M2 아래 흰 카드 화면 오류 줄: icon/triangle-alert 20 {colors.ink} + "수능 최저 기준을 읽지 못했어요. 인터넷 연결을 확인하고 다시 읽어 주세요." {typography.body} + `button-outline` "다시 읽기". 판정 색 없음. 타일·목록 없음, `disclaimer-note`는 그대로 |
| minimum-search/390-noscore | **성적 없음.** 셸 + M1(칸 모두 비활성, {colors.text-faint}) 아래 `empty-state`: 흑백 선 아이콘 icon/clipboard → "아직 넣은 모의고사 성적이 없어요" {typography.heading-4} → "모의고사 등급을 넣으면 검수된 수능 최저 기준과 맞춰 충족 현황을 보여 드려요" {typography.body-sm} → `button-primary` "성적 입력하기". 타일·what-if·목록 없음. `disclaimer-note`는 그대로 |
| minimum-search/390-nodata | **검수 자료 없음**(검수된 수능 최저 기준 0개). M1·M2는 그대로, 아래 `empty-state`: "검수된 수능 최저 기준이 아직 없어요" → "관리자 검수가 끝난 기준부터 보여 드려요. 지금은 37개가 검수 전이에요" + `data-status-badge` "준비 중" → `button-primary` "전형계획 보기". 판정·개수·what-if는 하나도 보여 주지 않아요(NEVER-1) |
| minimum-search/390-nocut | **가채점 등급컷 검수 전.** M1 = 가채점 선택. M2 자리에 `data-status-badge` "등급컷 준비 중" + body-sm "이 시험의 예상 등급컷이 아직 검수되지 않았어요. 등급컷이 올라오면 충족 현황을 보여 드려요". 타일·what-if·목록 없음 |
| minimum-search/390-gachae | **가채점 판정.** M1 = 가채점 선택. M2 = "예상 등급 국 2~3 · 수 2 · 영 2 · 탐 2~3" + 다음 줄 "판정에 쓴 등급 국 3 · 수 2 · 영 2 · 탐 3" {typography.table} + 캡션 "가채점은 예상 등급 범위의 큰 숫자로 판정해요 · 등급컷 검수 2026-11-20". 타일 ● 41 · ▲ 24 · ✕ 75 · 12, what-if 4행은 1절 가채점 예시(탐구 행은 "탐구 3 → 2"). 등급컷이 검수된 경우에만 이 상태예요(아니면 390-nocut) |
| minimum-search/390-tile-near | **근접 타일 고름.** M3 근접 타일 Selected, 충족 타일은 흰 카드로. M7 "근접 21개 · 대학 이름 순". M8 첫 카드 = 중앙대학교 경영학부(`judge-badge` size=lg "▲ 근접", "기준 합 5 · 내 합 6", 한 줄 "수학·영어·탐구 중 하나가 1등급이면 기준 안이에요"), 둘째 = 한양대학교 컴퓨터소프트웨어학부 |
| minimum-search/390-tile-lack | **자료 부족 타일 고름.** 자료 부족 타일 Selected. M7 "자료 부족 12개". 목록 위 흰 카드 한 줄 안내 "한국사 성적이 없어서 판정하지 않은 전형이에요" {typography.body-sm} + `button-pill-soft` "한국사 성적 넣기 ›". 첫 카드 = 한림대학교 간호학과(`judge-badge` size=lg "자료 부족"(판정 없음 쌍, 아이콘 없음), "기준 합 7 · 내 합 6", 한 줄 "한국사 성적을 넣으면 볼 수 있어요") |
| minimum-search/390-whatif | **what-if 고름.** M4 국어 행 Selected. M6 앞에 켜진 `filter-chip` "국어 1등급 오르면 ✕"(✕로 끔). 타일 선택은 풀려요. M7 "국어 1등급 오르면 새로 충족 15개". 카드 판정 배지는 지금 판정 그대로(▲ 근접 등) + 배지 옆 caption "국어 2등급이면 → 충족". 목록 위 캡션 "국어 3 → 2로 바꿔서 본 개수예요 · 지금 판정은 그대로예요" |
| minimum-search/390-whatif-max | **이미 1등급인 영역.** M1 = 9월 선택, M2 "국 3 · 수 2 · 영 1 · 탐 2 · 한국사 –". 타일 ● 52 · ▲ 19 · ✕ 69 · 12. M4로 스크롤한 상태: 영어 행만 글자 {colors.text-faint} "영어 1 → –" + 오른쪽 "이미 1등급이에요" {typography.body-sm} {colors.text-muted}, 누를 수 없음. 나머지 3행은 1절 9월 예시(+14개 · +8개 · +6개) |
| minimum-search/390-filter | **필터 시트.** `bottom-sheet`(손잡이, 그림자, 뒤 scrim): 제목 "필터" + 오른쪽 "초기화" {typography.link}. 묶음 3개, 각 `filter-chip` 줄: 계열(전체 · 인문 · 사회 · 자연 · 공학 · 의약 · 예체능) / 지역(전체 · 강원 · 서울 · 경기·인천 · 그 밖) / 전형 유형(전체 · 교과 · 종합 · 논술). 모두 "전체" on. 아래 고정 `button-outline` "취소" + `button-primary` "충족 전형 48개 보기"(고른 조건과 고른 타일에 따라 개수가 바로 바뀌어요) [P1, P5] |
| minimum-search/390-filter-picked | **필터 고르는 중.** 390-filter에서 계열 "의약" · 지역 "강원" on("전체"는 off). "초기화" 링크 켜짐. 주요 버튼 "충족 전형 3개 보기". 시트를 닫으면 M6 칩이 "계열 의약 ▾" · "지역 강원 ▾"로 on |
| minimum-search/390-zero | **결과 0건.** 필터 시트로 "예체능 · 강원"을 고르고 근접 타일을 고른 상태. M7 "근접 0개", 목록 자리에 `empty-state` "고른 조건에 맞는 전형이 없어요" → "계열·지역을 넓히거나 다른 판정을 골라 보세요" → `button-primary` "조건 초기화" |
| minimum-search/390-trace | **근거 펼침.** 근접 타일을 고른 목록에서 중앙대학교 경영학부 카드의 `trace-accordion`을 펼친 상태. 내용은 3-2 R2와 같음(마지막 줄 ▲ 근접), 맨 아래 `disclaimer-note` |
| minimum-search/390-heart-saved | **관심 담음.** 경희대학교 카드 `interest-heart` 담김({colors.heart} 채운 하트). 탭바 위 `toast` "관심 전형에 담았어요. 이 기기에만 저장돼요." 다시 누르면 빈 하트 + `toast` "관심 전형에서 뺐어요."(같은 프레임 오른쪽 주석으로 문구만 적어요) |
| minimum-search/390-heart-error | **관심 저장소 오류.** 목록 위 흰 카드 화면 오류 줄: icon/triangle-alert 20 {colors.ink} + "관심 전형 저장소를 열지 못했어요. 브라우저 저장 권한을 확인해 주세요." {typography.body}(다시 할 버튼 없음). 카드 하트는 비활성({colors.text-faint} 선 하트). 판정 색 없음 |
| minimum-search/390-susiro-sheet | **수시로 안 고르기.** 경희대학교 카드 "수시로에 담기"를 누른 뒤 `bottom-sheet`(scrim): 제목 "어느 안에 담을까요?" {typography.heading-4} + 한 줄 "경희대학교 경영학과 · 교과(지역균형)" {typography.body}. 단일 선택 목록(행 높이 48): A안 "담긴 카드 4 / 6"(고른 행 = Selected + 오른쪽 icon/check {colors.accent}) · B안 "이미 담았어요" · C안 "6칸이 다 찼어요"(B·C안은 글자 {colors.text-faint}, 고를 수 없음, 설명 줄 {colors.text-muted}). 아래 고정 `button-outline` "취소" + `button-primary` "A안에 담기" |
| minimum-search/390-susiro-done | **담은 뒤.** 시트가 닫히고 카드 버튼이 `button-pill-soft` "A안에 담았어요 · 수시로 보기 ›"로 바뀜. 탭바 위 `toast` "A안에 경희대학교 경영학과를 담았어요" |

### 5-2. PC (1440×900)

| 프레임 | 무엇을 그리나 |
|---|---|
| minimum-search/1440-loading | **불러오는 중.** 셸 + `page-header` + P1. 가운데 본문 자리에 "검수된 수능 최저 기준을 읽고 있어요." 한 줄만. 오른쪽 패널 없음(가운데 본문 1104 폭) |
| minimum-search/1440-error | **기준을 읽지 못함.** P1 아래 흰 카드 화면 오류 줄(390-error 문구) + `button-outline` "다시 읽기". 오른쪽 패널 없음. `disclaimer-note` 그대로 |
| minimum-search/1440-noscore | **성적 없음.** P1 세그먼트 비활성. 가운데 흰 카드 안 `empty-state`(390-noscore 문구) + `button-primary` "성적 입력하기"(높이 44). 오른쪽 패널 없음 |
| minimum-search/1440-nodata | **검수 자료 없음.** 390-nodata와 같은 `empty-state` + `data-status-badge` "준비 중" + `button-primary` "전형계획 보기". 오른쪽 패널 없음 |
| minimum-search/1440-nocut | **가채점 등급컷 검수 전.** P1 가채점 선택, 내 등급 자리에 `data-status-badge` "등급컷 준비 중" + body-sm(390-nocut 문구). 타일·표·패널 없음 |
| minimum-search/1440-gachae | **가채점 판정.** P1 가채점 선택 + "예상 등급 국 2~3 · 수 2 · 영 2 · 탐 2~3 → 판정에 쓴 등급 국 3 · 수 2 · 영 2 · 탐 3" + 캡션(390-gachae와 같음). P2 ● 41 · ▲ 24 · ✕ 75 · 12. 오른쪽 패널 ③ 단계 = "가채점 예상 등급의 큰 숫자: 국 3 · 수 2 · 영 2 · 탐 3" |
| minimum-search/1440-whatif | **what-if 고른 상태.** P3에서 국어 행 선택. P4 칩 줄 맨 앞에 켜진 `filter-chip` "국어 1등급 오르면 ✕". P5 제목 "국어 1등급 오르면 새로 충족 15개", 행은 지금 판정 배지 그대로(▲ 근접 등) + 판정 열 옆 캡션 "→ 충족". 오른쪽 패널 = 첫 행 근거, ④~⑥ 단계에 "국어 3 → 2로 바꿔서 봤어요" 한 줄을 더해요 |
| minimum-search/1440-whatif-max | **이미 1등급인 영역.** P1 9월 선택, P2 ● 52 · ▲ 19 · ✕ 69 · 12. P3 영어 행: 지금 → 바꾼 등급 "1 → –", 충족 칸 "이미 1등급이에요" {colors.text-muted}, 행 글자 {colors.text-faint}, 선택 안 됨. 나머지 3행은 1절 9월 예시 |
| minimum-search/1440-tile-near | **근접 타일 고름.** P2 근접 타일 Selected. P5 제목 "근접 21개", 첫 행 중앙대학교 경영학부(선택 행) · 둘째 한양대학교. 오른쪽 패널 = 기본과 같은 중앙대 근거 |
| minimum-search/1440-dropdown | **조건 목록 열림.** P4 "계열 전체 ▾" 아래 4px 떠 있는 목록(Overlay: {colors.canvas} + 1px {colors.hairline} + 그림자, 폭 240, 행 40): 전체(고른 행 = Selected + 오른쪽 icon/check {colors.accent}) · 인문 · 사회 · 자연 · 공학 · 의약 · 예체능. 마우스 올린 행 {colors.canvas-soft}. 행을 고르면 바로 닫혀요 |
| minimum-search/1440-zero | **결과 0건.** P4 "계열 예체능 ▾" · "지역 강원 ▾" on + 검색칸 "한의" 입력, 근접 타일 Selected. P5 표 자리에 흰 카드 `empty-state` "고른 조건에 맞는 전형이 없어요" → "계열·지역·검색어를 넓히거나 다른 판정을 골라 보세요" → `button-primary` "조건 초기화". 오른쪽 패널 = 고른 전형 없음: 가운데 "왼쪽 표에서 전형을 고르면 계산 근거를 보여 드려요" {typography.body-sm} {colors.text-muted}, R3 버튼 없음 |
| minimum-search/1440-row-unmet | **미충족 행 고름.** P5 연세대학교 경영학과 행 선택(첫 칸 앞 ✕). 오른쪽 패널 R1 `judge-badge` "✕ 미충족" + "기준보다 합이 2 커요". R2 ② 국·수 포함 3개 합 5 이내 ④ 국어 3 + 수학 2 + 영어 2 = 7 ⑤ 7 / 기준 5, 2 커요 ⑥ 한 영역 1등급으로는 기준 안이 아니라서 미충족. 마지막 줄 "✕ 미충족 — 기준보다 합이 2 커요" |
| minimum-search/1440-row-lack | **자료 부족 행 고름.** P5 한림대학교 간호학과 행 선택. R1 `judge-badge` "자료 부족" + "한국사 성적을 넣으면 볼 수 있어요" + `button-pill-soft` "한국사 성적 넣기 ›". R2 ① ② 국·수·영·탐 중 3개 합 7 이내 · 한국사 4 이내 ③ 한국사 – ④ 수학 2 + 영어 2 + 탐구 2 = 6 ⑤ 합은 기준 안, 한국사는 성적이 없어요 ⑥ 한국사 성적이 없어서 판정하지 않았어요. 마지막 줄 "자료 부족 — 한국사 성적을 넣으면 볼 수 있어요" |
| minimum-search/1440-heart-saved | **관심 담음.** 패널 R1 하트 담김({colors.heart}) + 표 해당 행 하트 담김. 오른쪽 아래 `toast` "관심 전형에 담았어요. 이 기기에만 저장돼요." |
| minimum-search/1440-heart-error | **관심 저장소 오류.** P5 표 위 흰 카드 화면 오류 줄(390-heart-error 문구). 표 담기 열·패널 하트 비활성({colors.text-faint}) |
| minimum-search/1440-susiro-modal | **수시로 안 고르기.** R3을 누른 뒤 `modal`(최대 폭 560, scrim): 제목 "어느 안에 담을까요?" {typography.heading-4} + "중앙대학교 경영학부 · 교과(지역균형)" {typography.body}. 단일 선택 목록(행 높이 40, 390-susiro-sheet와 같은 A안 · B안 · C안 · 고를 수 없는 행 규칙). 아래 오른쪽 정렬 `button-outline` "취소" + `button-primary` "A안에 담기" |
| minimum-search/1440-susiro-done | **담은 뒤.** 모달이 닫히고 R3이 비활성 모양 `button-primary` "A안에 담았어요"({colors.canvas-soft} 채움 + {colors.text-faint}) + 아래 링크 "수시로 보기 ›" {typography.link} {colors.accent}. 오른쪽 아래 `toast` "A안에 중앙대학교 경영학부를 담았어요" |

## 6. 문구

| 자리 | 문구 |
|---|---|
| 화면 제목 | 최저로 찾기 |
| 요약 제목 | 충족 현황 |
| what-if 제목 | 한 영역만 1등급 오르면 |
| what-if 행 | 국어 3 → 2 · 충족 48 → 63 · +15개 / 이미 1등급이에요 |
| 검수 전 개수 | 검수 전이라 판정하지 않은 전형 37개 |
| 이유 문장 | 충족 "수학 2 + 영어 2 = 4" / 근접 "○○이나 ○○가 1등급이면 기준 안이에요" / 미충족 "기준보다 합이 2 커요", "한국사 5등급(기준 4 이내)" / 자료 부족 "한국사 성적을 넣으면 볼 수 있어요" |
| 불러오는 중 | 검수된 수능 최저 기준을 읽고 있어요. |
| 오류 | 수능 최저 기준을 읽지 못했어요. 인터넷 연결을 확인하고 다시 읽어 주세요. / 관심 전형 저장소를 열지 못했어요. 브라우저 저장 권한을 확인해 주세요. |
| 수시로 담기 | 어느 안에 담을까요? / 담긴 카드 4 / 6 / 이미 담았어요 / 6칸이 다 찼어요 / A안에 담기 |
| toast | 관심 전형에 담았어요. 이 기기에만 저장돼요. / 관심 전형에서 뺐어요. / A안에 ○○을 담았어요 |
| 하단 고지 (`disclaimer-note`) | ⓘ 관리자가 검수한 수능 최저 기준만 판정했어요 · 검수 전 기준은 판정하지 않아요 · 대학 모집요강이 최종 기준이에요 · 모의고사 등급으로 본 충족 현황이라 실제 수능 결과와 다를 수 있어요 · 시안의 기준·숫자는 예시예요 · 데이터 기준일 2026-11-18 |
| 빈 상태 | 5장 상태 프레임 문구 |

문구 점검: 모두 해요체. "충족 현황", "기준 안", "1등급 오르면 충족 전형 +n개"처럼 기준과 내 등급의 사실만 적어요. 지원 결과를 예측·약속하는 말, 퍼센트, "이렇게 하세요" 같은 권유는 쓰지 않아요. what-if는 "바꿔 보면 몇 개가 바뀌는지"만 보여 줘요.

## 7. 접근성

- 판정은 색 + 아이콘 + 이름(자료 부족은 판정 없음 쌍 + 이름). 범례·타일에도 같이.
- what-if 차이는 부호 + 숫자 + "개", 색 없음. 행 대체 텍스트 "국어를 3등급에서 2등급으로 바꾸면 충족 전형이 48개에서 63개로 15개 늘어요". 이미 1등급 행은 "영어는 이미 1등급이라 바꿔 볼 수 없어요".
- 숫자 전부 고정폭. {colors.text-faint}는 비활성 칸·고를 수 없는 행·비활성 하트에만.
- 모바일 칩·행·버튼·타일 44 이상, PC 표 안 컨트롤 32 이상. 키보드: 타일·what-if 표·결과 표 방향키 이동, Enter = 고르기, 시트·모달·떠 있는 목록은 Esc로 닫기, 포커스 2px 잉크 링.
- 불러오는 중 줄·toast·오류 줄은 화면 읽기 도구에 바로 읽혀요(status / alert).
- 시트·모달 240ms, 목록 개수 갱신 150ms, prefers-reduced-motion이면 바로.

## 8. 디자이너 메모

- 03-draft.json frames = 정확히 2개: minimum-search/390, minimum-search/1440. 5장 상태 프레임 35장은 같은 섹션(346:131096)에 그리고 states에만 적어요.
- **이번 상세화 그리는 순서** (Figma 호출 한도가 있어서 한 번에 몇 장씩 묶어 그려요):
  1. 기본 프레임 2장을 0-1(C1~C9)대로 고쳐요: ▲·✕ 아이콘, 충족 현황 `stat-tile` 변형 filter, 판정 칩 빼기, 카드 첫 줄 `judge-badge` size=lg, PC 표 compact + ✕ 행 표시, `page-header` · `brand-logo` 124, 소분류 10개 메뉴, Page 바탕 위 채움. 레이아웃 자리·크기는 그대로.
  2. 기본 프레임을 복제해 바로 만들 수 있는 본문 변형부터: 390-tile-near → 390-tile-lack → 390-whatif → 390-whatif-max → 390-gachae → 390-trace, 그다음 1440-tile-near → 1440-whatif → 1440-whatif-max → 1440-gachae → 1440-row-unmet → 1440-row-lack.
  3. 빈·불러오는 중·오류 상태: 390-loading · 390-error · 390-noscore · 390-nodata · 390-nocut, 1440-loading · 1440-error · 1440-noscore · 1440-nodata · 1440-nocut (오른쪽 패널 없는 PC 틀 하나 만들어 돌려 써요).
  4. 필터·0건: 390-filter → 390-filter-picked → 390-zero, 1440-dropdown → 1440-zero.
  5. 떠 있는 레이어: 390-susiro-sheet → 390-susiro-done → 390-heart-saved → 390-heart-error, 1440-susiro-modal → 1440-susiro-done → 1440-heart-saved → 1440-heart-error.
  6. 프레임 이름·states 목록을 03-draft.json에 적고 05-build.json states에 노드 id를 채워요.
- 레이어 이름 = 컴포넌트 이름: `app-bar`, `sub-nav`, `tab-bar-pill`, `sidebar`, `sidebar-group`, `sidebar-item`, `brand-logo`, `page-header`, `mode-switch`, `segmented-control`, `segmented-control-active`, `stat-tile`, `data-status-badge`, `filter-chip`, `text-input`, `data-table`, `univ-card`, `univ-logo`, `interest-heart`, `judge-badge`, `trace-accordion`, `disclaimer-note`, `button-primary`, `button-outline`, `button-pill-soft`, `bottom-sheet`, `modal`, `empty-state`, `toast`. 모바일 what-if 행 목록·범례·내 등급 줄·화면 오류 줄·불러오는 중 줄·PC 떠 있는 목록은 "whatif-rows"·"legend"·"my-grades"·"error-line"·"loading-line"·"dropdown-list" 일반 레이어.
- 모서리 전부 0. ELLIPSE는 판정 아이콘 ●에만(▲·✕는 벡터). 그림자는 `bottom-sheet`·`modal`·`toast`·떠 있는 목록에만.
- 색: 판정 쌍은 `judge-badge`와 `stat-tile` 변형 filter 값 안에만. 등급 색·증감 색·연도 색·일정 종류 색은 이 화면에 없어요. {colors.heart}는 담긴 하트에만. 모든 fill·stroke 변수 바인딩.
- 로고: 1절 8개 대학은 `univ-logo` 원본 색·비율. 파일 없는 대학이 생기면 `univ-monogram`. `brand-logo`도 원본 그대로(변수 연결 안 함).
- 상태 프레임 숫자는 1절(보조 예시 포함)에 있는 것만 써요. 없는 숫자가 필요하면 새로 만들지 말고 planner에게 물어 주세요.

## 9. design.md 수정 제안 (만들지 않고 제안만)

반영된 것(지난 제안): 내비 "최저로 찾기" 추가 · rules 등록(screens · requires_trace_accordion · requires_disclaimer_note) · 검수 전 기준 학생 화면 규칙(D1) — 더 제안할 것 없어요.

1. 모바일 what-if를 3~4행 짧은 비교 목록(표 아님)으로 그렸어요. 이 패턴을 쓰려면 design.md에 "짧은 비교 행 목록" 예시를 적어 두면 좋아요.
2. `sidebar-item` 소분류 아이콘: design.md에 "최저로 찾기" 아이콘이 없어요. 지금은 승인 시안 아이콘을 그대로 두고, 대학 찾기의 다른 소분류 아이콘과 겹치지 않는 하나(예: icon/list-filter)를 정해 적어 주세요.
3. `stat-tile` 변형 filter의 "선택 없음 = 전체" 상태: 지금 정의는 "선택된 타일 1개"만 있어요. 고른 타일을 다시 누르면 풀려서 전체를 보여 주는 상태를 적어 주세요(이 화면 PC 기본 프레임이 그 상태예요).
4. `bottom-sheet` 단일 선택 목록의 고를 수 없는 행: 여러 개 고르는 목록에만 "고를 수 없는 행 = {colors.text-faint} + 이유" 규칙이 있어요. 단일 선택 목록에도 같은 규칙(글자 {colors.text-faint} + 설명 줄에 이유)을 적어 주세요(수시로 안 고르기의 "이미 담았어요" · "6칸이 다 찼어요"). 그때까지는 이 규칙을 빌려 그려요.
5. PC 오른쪽 보조 패널의 "고른 항목 없음" 상태(가운데 안내 한 줄, 버튼 없음)를 공통 모양으로 적어 두면 다른 화면도 같게 쓸 수 있어요.
