# 01-research — 전형 상세 (program-detail)

> 대상: PRD 6-1 "전형 상세" — 전형 유형·세부 유형, 모집인원, 전형요소와 비율(단계별), 지원자격, 수능최저(조건식), 교과 반영 방법 요약, 면접·논술 일정, 원문 출처·데이터 기준일, data-status-badge, 관심 담기.
> 디자인 기준: docs/design.md — 흑백 + 의미 색만, 누를 수 있는 요소는 알약, 카드·버튼에 그림자 없음, 읽는 화면 본문 최대 720px, "원문 보기 ↗"는 button-pill-soft, data-status-badge는 흑백 알약.
> 검색 일자: 2026-11-18, uibowl 무료 등급(검색당 3건). 검색어: 교육&도서 상세(MOBILE/PC), 금융 상품 상세(MOBILE/PC), 타임라인(MOBILE), 테이블×상세정보(PC), 그래프&차트×상세정보(MOBILE).

## 레퍼런스

- [L1] KB스타뱅킹 (MOBILE) — 상품 상세. 상품명 아래 흰 카드에 금리·기간·금액 3줄 라벨-값 요약, 그 아래 "상품정보 및 금리보기", "만기 예상 금액 계산해보기" 행 버튼(오른쪽 화살표)으로 세부 정보를 따로 엶 — https://uibowl.io/name/KB%EC%8A%A4%ED%83%80%EB%B1%85%ED%82%B9?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EC%83%81%ED%92%88%EC%83%81%EC%84%B8
- [L2] iM뱅크 (MOBILE) — 입출금 상품 상세. 히어로 아래 2칸 타일("가입대상 / 수수료 혜택")로 자격 조건을 한눈에 보여주고, 하단에 주요 버튼 하나 — https://uibowl.io/name/iM%EB%B1%85%ED%81%AC?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EC%83%81%ED%92%88-%EC%9E%85%EC%B6%9C%EA%B8%88
- [L3] 센디 (MOBILE) — 운송현황 상세. 왼쪽 회색 아이콘 칸 + 굵은 라벨 + 값의 세로 정보 목록, 출발지→경유지→도착지는 점·선으로 이은 세로 타임라인 — https://uibowl.io/name/%EC%84%BC%EB%94%94?patterns=%EB%82%B4%EC%97%AD&imgId=cmp6az7rg00lmjo04sn7eug0z
- [L4] 크몽 (MOBILE) — 서비스 상세의 리뷰 요약. 회색 박스 안에 "항목명 — 가로 막대 — 숫자" 3줄을 같은 폭으로 정렬 — https://uibowl.io/name/%ED%81%AC%EB%AA%BD?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&imgId=cmopqndip000flg04y794eha5
- [L5] 플랭 (MOBILE) — 맞춤 커리큘럼 상세. 상단 탭 + 단계(Get → Take)를 세로로 잇는 점선 타임라인, 단계마다 알약 라벨과 한 줄 설명 — https://uibowl.io/name/%ED%94%8C%EB%9E%AD?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EB%A7%9E%EC%B6%A4%20%EC%BB%A4%EB%A6%AC%ED%81%98%EB%9F%BC
- [L6] 서울국제도서전 (PC) — 저작권 센터 안내 및 신청. 제목 아래 버튼 2개(채움 1 + 외곽선 1), 리드 문단, "개요" 섹션을 라벨-값 행 표(행 구분선만)로 보여주는 좁은 본문 폭 — https://uibowl.io/website/%EC%84%9C%EC%9A%B8%EA%B5%AD%EC%A0%9C%EB%8F%84%EC%84%9C%EC%A0%84?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EC%A0%80%EC%9E%91%EA%B6%8C%20%EC%8B%A0%EC%B2%AD
- [L7] 삼성자산운용 (PC) — 펀드 상품 상세. 상품명 아래 핵심 숫자 4개(기준가·수익률·총보수·설정액)를 같은 크기 통계 타일로 한 줄 배치 — https://uibowl.io/website/%EC%82%BC%EC%84%B1%EC%9E%90%EC%82%B0%EC%9A%B4%EC%9A%A9?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EC%83%81%ED%92%88
- [L8] 알파스퀘어 (PC) — 종목 정보 상세. 차트 옆 칸에 라벨(왼쪽)-값(오른쪽 정렬) 촘촘한 정보 표, 섹션별로 묶어 세로로 나열 — https://uibowl.io/website/%EC%95%8C%ED%8C%8C%EC%8A%A4%ED%80%98%EC%96%B4?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&imgId=cmuw2vpvi002ijs04389zflom
- [L9] 리디 (PC) — 주문 상세. 왼쪽 사이드바 + 본문에 섹션 제목 → 표 → 라벨-값 정보 블록을 여백으로 구분 — https://uibowl.io/website/%EB%A6%AC%EB%94%94?patterns=%EB%82%B4%EC%97%AD&patternName=%EC%A3%BC%EB%AC%B8%20%EC%83%81%EC%84%B8
- [L10] 클래스 101 (PC) — 클래스 상세. 왼쪽 본문(캐러셀·후기), 오른쪽 고정 요약 패널(제목·핵심 정보·주요 버튼) 2단 구성 — https://uibowl.io/website/%ED%81%B4%EB%9E%98%EC%8A%A4%20101?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%ED%81%B4%EB%9E%98%EC%8A%A4

링크 수: 10 (MOBILE 5 / PC 5)

## 반영 포인트

- P1: 화면 머리 요약 블록 — 대학·전형명(heading-3/4) 바로 아래 data-status-badge(흑백 알약)를 붙이고, 흰 카드(1px hairline-soft) 안에 "전형 유형 · 모집인원 · 수능최저 있음/없음 · 단계 수" 3~4줄 라벨-값 요약을 둔다. 자격 조건 2개(재학생 한정 여부, 학교장 추천 인원)는 2칸 타일로 나란히. 원본의 컬러 배경·일러스트는 가져오지 않는다. (모바일) [근거: L1, L2]
- P2: 같은 요약을 PC에서는 stat-tile 4개 한 줄(모집인원 / 단계 / 수능최저 / 면접일)로 펼친다. 값은 numeric 고정폭 숫자, 색 없음(내 위치 값이 아니므로 Route Blue 금지). (PC) [근거: L7]
- P3: 전형요소와 비율 — "교과 · 서류 · 면접" 항목명 / 가로 막대 / 비율 숫자를 같은 열에 정렬한다. 막대는 canvas-soft 트랙 + ink 채움, 모서리는 rounded.full, 숫자는 tabular-nums 오른쪽 정렬. 단계별 선발(1단계·2단계)은 단계마다 같은 묶음을 반복. 색은 쓰지 않고, 같은 내용을 문장으로 읽는 대체 텍스트를 붙인다. S2에서 design.md 기존 컴포넌트(data-table 셀 표현 등)로 이름을 매핑해야 함. (모바일·PC 공통) [근거: L4]
- P4: 면접·논술·발표 일정 — 세로 타임라인(잉크 점 + hairline 선, 날짜 caption 고정폭)으로 원서 접수 → 고사일 → 결과 발표 순서를 보여준다. design.md의 counsel-timeline 모양을 재사용하고 판정 색은 넣지 않는다. (모바일·PC 공통) [근거: L3, L5]
- P5: 지원자격·교과 반영 방법 요약은 "왼쪽 라벨 / 오른쪽 값" 정보 행으로 나열하고, 수능최저 조건식 원문처럼 긴 내용은 행을 눌러 펼치는 아코디언 행(rounded.sm, canvas-soft)으로 접는다. 행 구분은 1px hairline, 섹션 사이는 여백(모바일 32px / PC 48px)만. (모바일·PC 공통) [근거: L1, L3, L8, L9]
- P6: PC 읽는 화면 구성 — 본문은 최대 720px, 제목 아래에 버튼 2개를 나란히 둔다: "원문 보기 ↗"(button-pill-soft) + "관심 담기"(button-outline). 주요 버튼(button-primary)은 화면에 하나만 두는 규칙 때문에 상단은 보조 버튼만 쓰고, 그 아래 "개요" 라벨-값 표로 이어간다. 원문 출처(시행계획/모집요강 페이지)와 데이터 기준일은 섹션 끝 caption + disclaimer-note로 둔다. (PC) [근거: L6, L9]
- P7: PC 오른쪽 보조 패널(360px, 선택) — 본문 720px 옆에 요약(전형 유형·모집인원·data-status-badge) + "관심 담기" button-primary 하나를 고정한다. 패널은 canvas-soft 채움, 그림자 없음. 원본의 색 버튼·후기 별점은 가져오지 않는다. 모바일에서는 이 패널 대신 화면 아래 "관심 담기" 버튼 하나. (PC, 모바일 대응 포함) [근거: L10, L2]

## 가져오지 않는 것 (design.md 충돌)

- L1·L2·L7의 브랜드 컬러 배경, 일러스트, 컬러 수치 강조 → 흑백 원칙 위반.
- L4의 별점, L10의 분홍 주요 버튼 → 의미 없는 색.
- L5의 3D 원형 버튼·그림자 → 그림자는 오버레이에만 허용.
- 요약 문구에 지원 결과를 약속하거나 가능성을 수치로 단정하는 표현은 넣지 않는다(NEVER-2). 전형 상세는 사실 정보(모집인원·비율·일정·출처)만 보여준다.
