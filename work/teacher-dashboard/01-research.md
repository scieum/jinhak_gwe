# 01 리서치 — 우리 반 홈 (teacher-dashboard)

조사일 2026-11-18 · 출처 uibowl (MOBILE 5건, PC 5건) · 참고: work/_ref/schs_lms-homeroom.md 2-1, docs/prd.md 6-10, docs/design.md Responsive Strategy "교사 대시보드" 행

대상 화면 내용(PRD 6-12 예정): 숫자 타일 4개(학생 수 · 카드 제출 · 최저 미충족 · 상담 필요), 우리 반 브리핑(먼저 볼 학생, 규칙으로 고름), 학생 한눈에 목록(번호 · 별칭 · 환산 범위 · 카드 · 경고).
적용할 새 디자인 규칙: 모서리 0, 흑백 바탕에 판정색과 Route Blue(선택 표시 · 핵심 숫자 1~2개)만 씀.

## 검색 기록
1. search_ui_patterns "대시보드" (PC) → 92건 중 3건
2. search_ui_patterns "관리자 홈" (PC) → 2건
3. search_ui_patterns "대시보드" (MOBILE) → 1건 (설정 화면이라 제외)
4. search_ui_patterns "교육 관리" (MOBILE) → 0건
5. search_ui_patterns "통계·리포트" (MOBILE) → 252건 중 3건
6. search_ui_patterns "메인" + category 교육&도서 (MOBILE) → 55건 중 3건
7. search_ui_patterns "알림" + component 리스트 (MOBILE) → 68건 중 3건
8. search_components "테이블, 태그" (PC) → 24건 중 3건

## 레퍼런스

- [L1] 당근 비즈니스 (PC) — 관리자 홈. 맨 위 카드에 할 일 한 줄과 잉크색 버튼 하나, 아래에 "최근 7일 통계" 숫자 타일 4개가 한 줄로 있음. 선택된 첫 타일은 옅은 파랑으로 채워지고 아래에 차트가 붙음 — https://uibowl.io/website/%EB%8B%B9%EA%B7%BC%20%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C&patternName=%EA%B4%80%EB%A6%AC%EC%9E%90%20%ED%99%88
- [L2] 사방넷 (PC) — 메인 대시보드. 계정 머리 아래에 "N 건" 숫자 타일 여러 개가 한 줄로 있고, 그 아래에 공지 · 상품 현황 · CS 현황 · 주요 통계 카드가 여러 열로 빽빽하게 놓임. 왼쪽에는 아이콘 사이드바가 있음 — https://uibowl.io/website/%EC%82%AC%EB%B0%A9%EB%84%B7?patterns=%EB%A9%94%EC%9D%B8&patternName=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- [L3] 클로브 AI (PC) — 경영 실적 대시보드. 왼쪽 사이드바에 그룹 이름과 메뉴 행, 가운데에 AI 대화, 오른쪽 카드에 라벨 → 큰 숫자 → 회색 보조 설명 순서의 숫자 2개와 회색조 막대 차트가 있음. 화면 거의 전체가 흑백 — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=AI&patternName=%EA%B2%BD%EC%98%81%20%EC%8B%A4%EC%A0%81%20%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- [L4] Google 애널리틱스 (PC) — 관리자 홈. 흰 카드 2열이고, 카드마다 제목과 짧은 설명 아래에 "아이콘 + 항목 이름 + ›" 행을 나열함. 1px 선만 쓰고 그림자는 거의 없음 — https://uibowl.io/website/Google%20%EC%95%A0%EB%84%90%EB%A6%AC%ED%8B%B1%EC%8A%A4?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C&patternName=%EA%B4%80%EB%A6%AC%EC%9E%90%20%ED%99%88
- [L5] 사방넷 (PC) — 운송장 송신 현황 표. 위에 검색 조건 패널, 아래에 첫 열이 번호인 촘촘한 표가 있고, 행마다 상태 태그와 버튼이 들어감. 행 구분선으로 읽기 쉽게 만듦 — https://uibowl.io/website/%EC%82%AC%EB%B0%A9%EB%84%B7?patterns=%EC%A1%B0%ED%9A%8C%ED%95%98%EA%B8%B0&imgId=cmu4rqmoa000el1045m5z22yf
- [L6] 세모 (MOBILE) — 교육 앱 홈. 인사 제목 → 요약 카드(라벨 → 큰 숫자 % → 진행 막대) → 탭 2개("최다 오답 단원 / 최다 오답 유형")와 오른쪽 "전체 보기 ›" → 빈 상태 카드 → 하단 탭바 순서 — https://uibowl.io/name/%EC%84%B8%EB%AA%A8?patterns=%EB%A9%94%EC%9D%B8&patternName=%ED%99%88
- [L7] 미니스탁 (MOBILE) — 실현손익 목록. 맨 위에 세그먼트(미국 · 한국), 행마다 왼쪽 로고와 이름, 오른쪽 정렬 숫자가 있고 맨 아래에 "기간별 합계" 줄이 고정됨 — https://uibowl.io/name/%EB%AF%B8%EB%8B%88%EC%8A%A4%ED%83%81?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EC%8B%A4%ED%98%84%EC%86%90%EC%9D%B5%20%EB%B0%8F%20%EB%B0%B0%EB%8B%B9
- [L8] 오일나우 (MOBILE) — 연비 리포트. 맨 위 문장 하나에 핵심 숫자를 넣고 그 숫자만 파랑으로 칠함. 아래에 "평균연비 / 누적주행거리" 2칸 숫자 타일이 있음 — https://uibowl.io/name/%EC%98%A4%EC%9D%BC%EB%82%98%EC%9A%B0?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EC%97%B0%EB%B9%84%EB%A6%AC%ED%8F%AC%ED%8A%B8
- [L9] 코오롱몰 (MOBILE) — 알림 목록. 탭 "전체 / 관심 브랜드 / 배송 / 재입고"에서 선택된 탭은 굵은 글자와 아래 막대로 표시. 아래는 회색 카드 목록(제목 · 한 줄 내용 · 날짜) — https://uibowl.io/name/%EC%BD%94%EC%98%A4%EB%A1%B1%EB%AA%B0?patterns=%EC%95%8C%EB%A6%BC
- [L10] 석가머니 (MOBILE) — 알림함 빈 상태. 화면 가운데에 회색 한 줄 "아직 알림이 없어요"만 둠 — https://uibowl.io/name/%EC%84%9D%EA%B0%80%EB%A8%B8%EB%8B%88?patterns=%EC%95%8C%EB%A6%BC&patternName=%EC%95%8C%EB%A6%BC%ED%95%A8

## 반영 포인트

- P1: 맨 위에 stat-tile 4개를 한 줄로 둠(PC 4열, 모바일 2×2). 모양은 라벨 → 고정폭 큰 숫자 → 보조 설명. 흑백 카드에 모서리 0, 1px hairline-soft 선. Route Blue 글자는 핵심 숫자 1개(상담 필요 N명)에만 쓰고, 최저 미충족 타일은 숫자 옆에 위험 판정색 + ■ 아이콘 + 이름을 같이 둠. 숫자만 칠하지 않음 [근거: L1, L2, L3, L8]
- P2: 우리 반 브리핑은 타일 바로 아래에 전체 폭 카드 한 장. 규칙 문장 한 줄("먼저 볼 학생 3명 · 상담 필요 N명 · 카드 미제출 N명")과 button-outline 하나를 둠. 펼치면 학생 3행(번호 · 별칭 · 신호 태그 최대 2개 · 이유 한 줄)이 나옴. 머리에 "규칙으로 고름" 흑백 칩을 붙여 AI가 아닌 규칙 결과라는 걸 밝힘 [근거: L1, L9]
- P3: PC 학생 한눈에는 data-table로 만듦. 열은 번호(고정 첫 열) · 별칭 · 환산 9등급 범위(약 a~b, 고정폭, 오른쪽 정렬) · 카드 제출 칩 · 경고 개수. 행 구분 1px hairline으로 촘촘하게 두고, 위험 경고가 있는 학생을 먼저 정렬함. 경고 칸은 판정색 + 아이콘 + 이름 [근거: L5, L2]
- P4: 표 위 필터는 탭 `전체 N / 최저 미충족 N / 상담 필요 N`. 선택된 탭만 Route Blue 아래 2px 막대 + accent-soft 채움을 쓰고, 나머지는 muted 글자 [근거: L9, L6, L1]
- P5: PC 앱 셸은 왼쪽 sidebar(canvas-soft, 교사 그룹 "학급 대시보드" 선택 = 왼쪽 3px Route Blue 막대)와 본문 2단(왼쪽 넓게: 브리핑 + 학생 표 / 오른쪽 360px: 카드 수합 · 이번 주 일정 같은 "항목 + ›" 목록 카드)으로 구성함. 카드에는 그림자 없이 1px 선만 씀 [근거: L3, L4, L2]
- P6: 모바일은 보기 전용 요약. 타일 2×2 → 브리핑 한 줄 → student-row-card 6행(왼쪽 번호 · 별칭, 오른쪽 정렬 환산 범위 · 카드 칩 · 경고 배지) → "N명 전체 보기 ›" 순서. 맨 아래에 "PC에서 열면 전체 기능을 쓸 수 있어요" 안내를 둠 [근거: L6, L7, L8]
- P7: 빈 상태는 카드 안 가운데에 회색 한 줄 ("아직 불러온 학생이 없어요", "지금 먼저 챙길 학생이 없어요")과 필요할 때만 버튼 하나를 둠 [근거: L10, L6]
