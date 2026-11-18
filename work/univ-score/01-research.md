# 01-research — 대학별 환산 (univ-score)

> 근거 문서: docs/prd.md 6-4, docs/design.md(data-table · trace-accordion · data-status-badge · disclaimer-note · Responsive Strategy "대학별 환산" 행), docs/story-service.md(NEVER-1, NEVER-2)
> 출처: uibowl 검색 (무료 등급, 1회 최대 3건). 날짜 2026-11-18.

## 검색 기록

| # | 도구 | 조건 | 결과 |
|---|---|---|---|
| 1 | search_ui_patterns | "상세 내역" + 아코디언, MOBILE | L1, L2 채택 |
| 2 | search_ui_patterns | "비교하기", MOBILE | L3, L4 채택 |
| 3 | search_by_ocr_text | "준비중" + 배지, MOBILE | L5 채택 |
| 4 | search_components | 테이블, PC | L6, L8 채택 |
| 5 | search_ui_patterns | "비교하기" + 테이블, PC | L7, L9 채택 |
| 6 | search_ui_patterns | 대시보드 + 테이블, PC | 관련 낮음, 미채택 |
| 7 | search_by_ocr_text | "준비 중", MOBILE | 마케팅 문구만 나와서 미채택 |
| 8 | search_ui_patterns | "비교" + 표 / 대시보드 + 사이드 패널 | 0건 (지원하지 않는 검색어) |

## 레퍼런스 목록

- [L1] 네이버플러스 스토어 (MOBILE) — 주문 상세: 상단 "영수증" 보조 버튼, "주문상품" 섹션 머리의 펼침 화살표로 상세 내역을 접고 펼침 — https://uibowl.io/name/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%94%8C%EB%9F%AC%EC%8A%A4%20%EC%8A%A4%ED%86%A0%EC%96%B4?patterns=%EB%82%B4%EC%97%AD&patternName=%EC%A3%BC%EB%AC%B8%20%EC%83%81%EC%84%B8
- [L2] 골프존 (MOBILE) — 마켓 주문 상세: "주문 금액 42,000원" 같은 합계 행 옆 화살표를 누르면 바로 아래 회색 상자에 하위 항목(상품 금액·배송비)이 펼쳐지고, 숫자는 모두 오른쪽 정렬 — https://uibowl.io/name/%EA%B3%A8%ED%94%84%EC%A1%B4?patterns=%EB%82%B4%EC%97%AD&patternName=%EA%B3%A8%ED%94%84%EC%A1%B4%EB%A7%88%EC%BC%93%20%EC%A3%BC%EB%AC%B8%20%EC%83%81%EC%84%B8
- [L3] iM뱅크 (MOBILE) — 상품 비교: 위에 비교 대상 2칸, 아래로 비교 항목(연회비·브랜드·교통구분)을 회색 라벨 막대로 나누고 그 아래 대상별 값을 나란히 둔 모바일형 비교 표 — https://uibowl.io/name/iM%EB%B1%85%ED%81%AC?patterns=%EB%B9%84%EA%B5%90%ED%95%98%EA%B8%B0&patternName=%EC%83%81%ED%92%88%EB%B9%84%EA%B5%90
- [L4] 앳플리 (MOBILE) — 기록 비교: 비교할 대상이 없을 때 "+" 빈 칸 2개와 안내 문장, 비활성 하단 버튼으로 시작하는 빈 상태 — https://uibowl.io/name/%EC%95%B3%ED%94%8C%EB%A6%AC?patterns=%EB%B9%84%EA%B5%90%ED%95%98%EA%B8%B0&patternName=%EA%B8%B0%EB%A1%9D%EB%B9%84%EA%B5%90
- [L5] 마감히어로 (MOBILE) — 가게 목록: 아직 열지 않은 가게도 목록에서 빼지 않고 "오픈 준비중" 배지 + "픽업: 아직 픽업 불가" 문구로 같은 카드 모양을 유지함 — https://uibowl.io/name/%EB%A7%88%EA%B0%90%ED%9E%88%EC%96%B4%EB%A1%9C?patterns=%EB%A9%94%EC%9D%B8&imgId=cmmcunt5x0006k004mf6bkidu
- [L6] 리블 (PC) — 지역 통계: 가운데 표(행 목록)와 오른쪽 고정 패널(선택한 항목의 큰 숫자 + 세부 차트)을 나란히 둬서, 목록을 보면서 상세를 함께 확인 — https://uibowl.io/website/%EB%A6%AC%EB%B8%94?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmuc28b20000jl204mwrn3vkl
- [L7] Npay 증권 (PC) — 종목 분석 비교: 지표를 행, 비교 대상(연도)을 열로 둔 촘촘한 숫자 표 여러 개. 숫자는 오른쪽 정렬, 머리글은 옅은 회색 — https://uibowl.io/website/Npay%20%EC%A6%9D%EA%B6%8C?patterns=%EB%B9%84%EA%B5%90%ED%95%98%EA%B8%B0&patternName=%EC%A2%85%EB%AA%A9%EB%B6%84%EC%84%9D
- [L8] 클로브 AI (PC) — 자금현황: 위에 요약 숫자 타일 한 줄 → 계좌별 표 → 아래 "상세 내역" 영역에서 항목별 금액과 합계를 줄 단위로 보여줌 — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=%EB%82%B4%EC%97%AD&imgId=cmw0i5f2y001hgw073xu2xyym
- [L9] 카드고릴라 (PC) — 카드 비교: 비교 대상을 아직 고르지 않았을 때 "+" 빈 칸 3개 + "카드 선택 후 비교할 수 있어요" 안내 — https://uibowl.io/website/%EC%B9%B4%EB%93%9C%EA%B3%A0%EB%A6%B4%EB%9D%BC?patterns=%EB%B9%84%EA%B5%90%ED%95%98%EA%B8%B0&patternName=%EC%B9%B4%EB%93%9C%20%EB%B9%84%EA%B5%90

MOBILE 5건 (L1~L5) / PC 4건 (L6~L9) / 합계 9건

## 반영 포인트

- P1: 산출 근거를 "합계 행 아래에서 펼치는 회색 상자"로 보여준다. 합계(교과·출결·총점) 줄을 누르면 바로 아래 `trace-accordion`({colors.canvas-soft}, {rounded.sm}, 제목 "어떻게 계산했나요?")이 펼쳐지고, 단계 이름은 왼쪽 muted, 값·수식은 오른쪽 정렬 고정폭 숫자, 마지막 줄 최종값 굵게 + 위 1px {colors.hairline}. 맨 아래에 `disclaimer-note`. 골프존의 파란 "적립 예정" 강조나 네이버의 초록 버튼처럼 색을 쓰는 부분은 가져오지 않는다. (모바일) [근거: L2, L1]
- P2: PC는 `data-table`(대학·전형·교과·출결·합계·순위 차이) + 행을 고르면 오른쪽 360px 보조 패널에 그 행의 산출 근거를 띄운다. 표는 가리지 않고 그대로 두고, 선택 행은 1px 잉크 안쪽 테두리로 표시한다(design.md Elevation 3). 리블의 차트 패널은 근거 단계 목록으로 바꾼다. (PC) [근거: L6, L8]
- P3: 대학 간 유불리 비교 표는 비교 대상을 열이 아닌 행(대학)으로 두고, "단순 평균 기준 순위"와 "이 대학 환산 기준 순위"를 나란히 놓은 뒤 "순위 차이" 열을 덧붙인다. 숫자 열 오른쪽 정렬, 머리글 {colors.canvas-soft}, 머리글 고정, 정렬 화살표. 표 위에는 요약 `stat-tile` 한 줄(관심 대학 수, 계산 완료 수, 준비 중 수)을 둔다. 순위 차이에 판정 색은 쓰지 않는다(흑백 + "+2"/"−1" 텍스트). (PC) [근거: L7, L8]
- P4: 모바일에서는 표를 `univ-card` 목록으로 바꾸고, 카드 안 교과·출결·합계를 "라벨 → 값" 줄로 쌓는다. 유불리 비교는 카드 안 한 줄 문장으로 쓴다(예: "단순 평균 기준 4위 → 이 대학 환산 기준 2위"). 카드를 누르면 전체 화면 상세 + P1 아코디언. (모바일) [근거: L3, L1]
- P5: 규칙이 없거나 검수 전인 전형도 목록에서 빼지 않고 같은 카드/행 모양을 유지하되, 점수 자리에는 숫자를 비우고 흑백 `data-status-badge` "환산 규칙 준비 중" + "검수가 끝나면 계산해요" 한 줄만 둔다. 산출 근거 펼치기와 순위 열은 비활성("—"), 정렬하면 맨 아래로 간다. 추정 숫자·임시 점수는 절대 표시하지 않는다(NEVER-1). 마감히어로의 이미지 위 진한 배지 색은 가져오지 않는다. (모바일/PC) [근거: L5]
- P6: 관심 대학이 0개일 때는 `empty-state`(흑백 선 아이콘 + heading-4 + body-sm + `button-primary` "관심 대학 담기" 하나)로, 1개뿐이라 비교가 안 될 때는 비교 표 자리에 "대학을 2개 이상 담으면 유불리를 비교할 수 있어요" 안내를 둔다. 빈 "+" 칸은 `susi-slot`의 점선 빈 칸과 같은 모양으로 맞춘다. (모바일/PC) [근거: L4, L9]

## 가져오지 않는 것 (design.md·NEVER 충돌)

- 레퍼런스들의 브랜드 색 버튼·강조 문구(초록·파랑·주황): design.md는 주요 버튼을 잉크 알약으로 고정하고, Route Blue는 "내 위치"에만 허용.
- 카드·패널 그림자: 그림자는 떠 있는 레이어에만 허용.
- 차트 중심의 오른쪽 패널(L6): 산출 근거는 수식/값 줄로 보여주는 것이 PRD 6-4·R-CALC-003 요구.
- "수익률", "가능성" 같은 결과 예측성 문구: NEVER-2(합격 확률·보장으로 읽힐 표현 금지). 비교 표에는 "유불리", "순위 차이"만 쓴다.
