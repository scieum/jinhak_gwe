# 01-research — 내 성적 추이 (score-trend)

대상: 학생 모바일 중심 + PC. 내신 학기별 평균 등급 추이 + 모의고사 회차별 영역 등급 추이(선 차트, 1등급이 위) + 목표 대학 수능 최저 충족 현황.
기준 문서: docs/prd.md 6-2(성적 요약 카드: 학기별 추이), 6-9(가채점: 최저 충족/미충족/경계 판정), docs/design.md, work/_ref/schs_lms-homeroom.md 2-12·3(c)·3(d).
조사일: 2026-11-18 · uibowl 무료 등급(검색당 3건) · 검색 8회(0건 3회 포함).

## 검색 기록
| # | 도구 | 검색어 / 조건 | 플랫폼 | 결과 |
|---|---|---|---|---|
| 1 | search_ui_patterns | 성적 그래프 | MOBILE | 0건 |
| 2 | search_components | 차트 | MOBILE | 3건 (차트 형태 약함, 1건 채택) |
| 3 | search_ui_patterns | 자산 변화 | PC | 0건 |
| 4 | search_ui_patterns | 리포트 | PC | 3건 |
| 5 | search_ui_patterns | 통계·리포트 + 운동&건강 | MOBILE | 3건 (1건 채택) |
| 6 | search_ui_patterns | 통계·리포트 + 교육&도서 | MOBILE | 3건 (1건 채택) |
| 7 | search_ui_patterns | 대시보드 + 그래프&차트 | PC | 3건 |
| 8 | search_by_ocr_text | "목표" + 통계·리포트 + 그래프&차트 (재시도 전 "목표 추이" 0건) | MOBILE | 3건 |

## 레퍼런스

- [L1] 달다방 (MOBILE) — 주기 리포트: 맨 위 "최근 6회 기준" 캡션 + 요약 숫자 2칸(평균 기간 / 평균 주기) → 꺾은선 그래프(회차마다 점, 가로 보조선, x축 날짜) → 그래프 아래 상태 판정 카드. 점과 선만으로 회차 추이를 보여 줘요 — https://uibowl.io/name/%EB%8B%AC%EB%8B%A4%EB%B0%A9?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EC%A3%BC%EA%B8%B0
- [L2] 닥터다이어리 (MOBILE) — 걸음 분석: 비교 대상 평균은 회색 막대, "나의 걸음"만 파란 막대 + 파란 라벨. 위에 결론 문장 한 줄("…평균이 내 걸음보다 더 많은 수치예요"), 아래 "주간 목표 — 지난 7일 중 0일 달성" 문장 — https://uibowl.io/name/%EB%8B%A5%ED%84%B0%EB%8B%A4%EC%9D%B4%EC%96%B4%EB%A6%AC?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmr7eb3kz008kle04ne22oynp
- [L3] 오늘의 루틴 (MOBILE) — 진행 현황 "목표치 그래프": 최근 · 전체 세그먼트 → 기간 캡션 + 요약 문장("최근 7일 총 54잔 달성 · 평균 7.7잔") → 막대 위 값 라벨, 가장 최근 날짜만 x축 라벨 강조 — https://uibowl.io/name/%EC%98%A4%EB%8A%98%EC%9D%98%20%EB%A3%A8%ED%8B%B4?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmqj75bpx00cgi304xkidjb7h
- [L4] 라이프캐치 (MOBILE) — 건강 현황: 큰 숫자 "4,763" + 회색 "/ 10,000 걸음"(지금 값 / 기준 값) + 진행 막대, 아래 보조 지표 3칸(칼로리·걸은 시간·걸은 거리) — https://uibowl.io/name/%EB%9D%BC%EC%9D%B4%ED%94%84%EC%BA%90%EC%B9%98?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmqzba53l00bgjz0403irf7ab
- [L5] 세모 (MOBILE) — 단원별 분석 그래프 빈 상태: 탭(단원별 · 유형별) 아래 가운데 흑백 차트 아이콘 + "아직 분석을 진행 중이에요. 문제를 더 풀수록 그래프가 완성돼요" 두 줄 — https://uibowl.io/name/%EC%84%B8%EB%AA%A8?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EA%B7%B8%EB%9E%98%ED%94%84
- [L6] KB스타뱅킹 (MOBILE) — 자산 분석: 상단 탭 3개(자산배분 분석 · 펀드자산 분석 · 투자 건강검진, 선택 탭 아래 막대) → 핵심 숫자 1개 크게 → 분류 카드 4칸(선택 카드 외곽선) → 선택한 분류의 상세 행 — https://uibowl.io/name/KB%EC%8A%A4%ED%83%80%EB%B1%85%ED%82%B9?patterns=%EC%B6%94%EC%B2%9C&imgId=cmvym52wu00adil08oiz5b3bi
- [L7] 당근 비즈니스 (PC) — 관리자 홈 "최근 7일 통계": 숫자 타일 4개 가로 배치(첫 타일 선택 테두리) → 바로 아래 넓은 꺾은선 차트. 타일을 고르면 차트 지표가 바뀌는 구조 — https://uibowl.io/website/%EB%8B%B9%EA%B7%BC%20%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C&patternName=%EA%B4%80%EB%A6%AC%EC%9E%90%20%ED%99%88
- [L8] 당근 비즈니스 (PC) — 통계·리포트: 왼쪽 사이드바 + 탭 → 기간 드롭다운 + 기간 캡션 → 카드마다 "지표명 · 숫자 → 꺾은선 차트(가로 보조선, x축 날짜) → 마우스 올리면 툴팁"을 세로로 쌓음 — https://uibowl.io/website/%EB%8B%B9%EA%B7%BC%20%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8
- [L9] 클로브 AI (PC) — 경영 실적 대시보드: 사이드바 + 본문 카드 머리에 핵심 숫자 2개(나란히) → 아래 "매출 비중 추이" 막대 차트를 검정·회색 단계만으로 구분(유채색 없음) — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=AI&patternName=%EA%B2%BD%EC%98%81%20%EC%8B%A4%EC%A0%81%20%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- [L10] 알파스퀘어 (PC) — 시장 요약: 왼쪽 넓은 메인 시계열 차트 + 오른쪽 좁은 보조 패널(작은 추이 차트 + 목록). 본문과 나란히 보는 요약을 오른쪽에 둠 — https://uibowl.io/website/%EC%95%8C%ED%8C%8C%EC%8A%A4%ED%80%98%EC%96%B4?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EC%8B%9C%EC%9E%A5%20%EC%9A%94%EC%95%BD

링크 10개 (MOBILE 6: L1~L6 / PC 4: L7~L10)

## 반영 포인트

- P1: 추이는 꺾은선 + 회차별 점 + 가로 보조선으로 그리고, 세로축은 1등급이 위(뒤집힌 축)로 둔다. 선·점·보조선은 흑백(잉크, hairline)으로만 그리고, 가장 최근 회차의 점과 값 라벨만 Route Blue로 표시해 "지금 나는 여기"를 가리킨다. x축은 "1-1, 1-2…"(내신) / "3월, 6월…"(모의고사) 캡션, 차트 위에 "최근 N회 기준" 캡션 [근거: L1, L3, L8]
- P2: 비교 대상(지난 회차, 다른 영역)은 회색 단계로 낮추고 내 최신 값만 Route Blue로 띄운다. 영역 4개(국·수·영·탐)를 한 차트에 겹칠 때는 색 대신 잉크/회색 단계 + 선 끝 영역 이름 라벨로 구분한다(등급에 색 금지 규칙과 맞춤). Route Blue 숫자는 화면 전체 1~2개만 [근거: L2, L9]
- P3: 차트 위에는 규칙으로 만든 요약 문장 한 줄(예: "최근 3회 평균 등급 범위 2.1~2.6, 수학 흐름이 가장 컸어요")을 두고, 단일 숫자 대신 "범위 + 회차 수"로 말한다. 요약 숫자는 stat-tile 2~4칸(최근 평균 / 최고~최저 범위 / 회차 수)으로 [근거: L1, L3, L2]
- P4: 영역 전환은 segmented-control(평균 · 국어 · 수학 · 영어 · 탐구)로, 내신 · 모의고사 전환도 같은 segmented-control로 한다. 모바일은 차트 위 세그먼트, PC는 stat-tile 줄을 눌러 아래 차트 지표를 바꾸는 방식 [근거: L3, L6, L7]
- P5: 목표 대학 최저 충족 현황은 "지금 값 / 기준 값" 표기(예: 등급 합 "6 / 기준 5")를 큰 숫자 + 회색 기준으로 보여 주고, 판정은 judge-badge(색 + 아이콘 + 이름)로 붙인다. 근접처럼 판정 이름이 design.md에 없는 상태는 planner가 design.md 판정 목록(안정·적정·소신·위험·경계·판정 없음)에 맞춰 매핑 [근거: L4, L2]
- P6: 시험이 2회 미만이거나 내신이 없을 때는 차트 자리에 empty-state(흑백 선 아이콘 + 두 줄 설명 + button-primary 하나)를 둔다. 문구 예: "모의고사가 두 번 이상 있어야 추이를 볼 수 있어요" [근거: L5]
- P7: PC는 왼쪽 넓은 본문(내신 추이 카드, 모의고사 추이 카드를 세로로 쌓음) + 오른쪽 360px 보조 패널(목표 대학 최저 충족 현황 + trace-accordion "어떻게 계산했나요?" + disclaimer-note). 모바일은 같은 순서를 한 열로 쌓고 보조 패널은 아코디언으로 [근거: L10, L8, L7]

## planner에게 넘길 메모
- design.md 컴포넌트 목록에 꺾은선 추이 차트가 없어요(range-bar-5to9, cut-compare-bar만 있음). S2에서 기존 컴포넌트 조합으로 풀 수 없으면 "design.md 수정 제안"으로 멈춰야 해요.
- rules/design-rules.json `screens`에 score-trend가 없어요. gate.py가 slug를 검사한다면 오케스트레이터 확인이 필요해요.
- 참고 저장소(schs_lms)는 모의고사 추이를 세로 막대(1등급이 가장 긴 막대)로, 내신을 목록으로 그렸어요. 이번 화면은 선 차트로 바꾸되 1등급이 위라는 방향은 유지해요.
- 레퍼런스 앱의 유채색(주황·초록·보라)과 둥근 모서리는 가져오지 않아요. 가져오는 것은 배치·위계·표기 방식뿐이에요.
