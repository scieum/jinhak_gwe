# 01-research — 수시로 (수시 6장 보드)

- 대상: PRD 6-7 수시 6장 보드, 9장 R-CARD-001~005, 7-2(학생 모드·기기 저장), 8장 ApplicationBoard
- 디자인 기준: design.md susi-slot, warning-callout, scenario-tabs, share-sheet, Responsive Strategy "수시로" 행
  - 모바일: 6칸 세로 목록 + 상단 고정 경고 요약 바, 길게 눌러 순서 변경
  - PC: 3×2 카드 그리드 + 오른쪽 경고 패널, 끌어서 순서 변경, A·B·C안 탭
- 검색 (uibowl, 무료 3건씩): 비교(MOBILE), 비교(PC), 장바구니×빈 화면(MOBILE), QR(MOBILE), 대시보드(PC), 탭(PC), OCR "순서 변경"(MOBILE), OCR "주의"×배너(PC, 관련 결과 없어 제외)

## 레퍼런스

- [L1] 럽맘 (MOBILE) — 비교함: 헤더 오른쪽 "0/3 선택" 개수 표시, 항목마다 체크박스와 X 삭제, 2개 이상 고를 때까지 하단 버튼 비활성("2개 이상 선택해주세요") — https://uibowl.io/name/%EB%9F%BD%EB%A7%98?patterns=%EB%B9%84%EA%B5%90%ED%95%98%EA%B8%B0&patternName=%EC%97%85%EC%B2%B4%20%EB%B9%84%EA%B5%90
- [L2] 앳플리 (MOBILE) — 기록 비교: 빈 슬롯 2개를 세로로 쌓은 큰 회색 카드, 가운데 "+"만 있고, 위에 "버튼을 눌러 비교할 기록을 선택해 주세요" 안내 — https://uibowl.io/name/%EC%95%B3%ED%94%8C%EB%A6%AC?patterns=%EB%B9%84%EA%B5%90%ED%95%98%EA%B8%B0&patternName=%EA%B8%B0%EB%A1%9D%EB%B9%84%EA%B5%90
- [L3] iM뱅크 (MOBILE) — 상품 비교: 빈 슬롯 2칸("선택하기") 아래에 항목별 비교 행(연회비·브랜드 등)을 미리 깔아 두고 "비교할 상품을 선택해주세요" 자리 문구로 채움 — https://uibowl.io/name/iM%EB%B1%85%ED%81%AC?patterns=%EB%B9%84%EA%B5%90%ED%95%98%EA%B8%B0&patternName=%EC%83%81%ED%92%88%EB%B9%84%EA%B5%90
- [L4] 하나원큐 (MOBILE) — QR 결제: 상단 알약 세그먼트(바코드 결제 · QR 결제)로 표시 방식 전환, 가운데 큰 QR, 아래 보조 정보 — https://uibowl.io/name/%ED%95%98%EB%82%98%EC%9B%90%ED%81%90?patterns=%EA%B0%84%ED%8E%B8%EA%B2%B0%EC%A0%9C&patternName=QR%EA%B2%B0%EC%A0%9C
- [L5] 메가MGC커피 (MOBILE) — 단골매장 순서변경: 목록 위 "순서변경" 텍스트 버튼 → 바텀시트 안 행마다 오른쪽 정렬 핸들, 하단 "적용하기" 한 개 — https://uibowl.io/name/%EB%A9%94%EA%B0%80MCG%EC%BB%A4%ED%94%BC?patterns=%EB%B6%81%EB%A7%88%ED%81%AC%C2%B7%EC%9C%84%EC%8B%9C%EB%A6%AC%EC%8A%A4%ED%8A%B8&imgId=cmt6mkzj5000wl8048xdrve8j
- [L6] 신한 SOL페이 (MOBILE) — 즐겨찾기 설정: 상단 "8/10" 개수 표시, 고른 항목 칩 줄 위에 툴팁 "꾹 눌러서 순서를 변경할 수 있어요", 하단 초기화 · 저장하기 — https://uibowl.io/name/%EC%8B%A0%ED%95%9C%20SOL%ED%8E%98%EC%9D%B4?patterns=%EC%84%A4%EC%A0%95&imgId=cmv54xnm4001pk1060ooiidxd
- [L7] 차란 (MOBILE) — 빈 장바구니: 가운데 선 일러스트 + 제목 + 한 줄 설명 + 버튼 하나, 하단 주문 버튼은 "0원 주문하기"로 비활성 — https://uibowl.io/name/%EC%B0%A8%EB%9E%80?patterns=%EC%9E%A5%EB%B0%94%EA%B5%AC%EB%8B%88&imgId=cmtwj39y8004hl704vovglr1v
- [L8] 카드고릴라 (PC) — 카드 비교: 가로로 나란한 빈 슬롯 3개(원형 + 아이콘 + "카드를 선택해 주세요"), 위에 "카드 선택 후 비교할 수 있어요" 안내 — https://uibowl.io/website/%EC%B9%B4%EB%93%9C%EA%B3%A0%EB%A6%B4%EB%9D%BC?patterns=%EB%B9%84%EA%B5%90%ED%95%98%EA%B8%B0&patternName=%EC%B9%B4%EB%93%9C%20%EB%B9%84%EA%B5%90
- [L9] 겟차 (PC) — 구매방식 비교: 왼쪽 본문, 오른쪽 고정 요약 패널(선택값 + 옵션 + 하단 주요 버튼), 스크롤해도 패널 유지 — https://uibowl.io/website/%EA%B2%9F%EC%B0%A8?patterns=%EC%A1%B0%ED%9A%8C%ED%95%98%EA%B8%B0&patternName=%EA%B5%AC%EB%A7%A4%EB%B0%A9%EC%8B%9D%20%EB%B9%84%EA%B5%90
- [L10] Npay 증권 (PC) — 글로벌 증시 랭킹: 상단 텍스트 탭 아래 알약 필터 줄로 같은 표의 기준을 전환 — https://uibowl.io/website/Npay%20%EC%A6%9D%EA%B6%8C?patterns=%EB%9E%AD%ED%82%B9&imgId=cmvg2h7hm0003l00663rlue4p
- [L11] 사방넷 (PC) — 대시보드: 상단에 상태별 숫자 타일 줄, 아래 카드 그리드, 왼쪽 사이드 내비게이션 — https://uibowl.io/website/%EC%82%AC%EB%B0%A9%EB%84%B7?patterns=%EB%A9%94%EC%9D%B8&patternName=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- [L12] 클로브 AI (PC) — 경영 실적 대시보드: 왼쪽 사이드바 + 본문 상단 탭 + 숫자 카드, 본문과 나란한 보조 패널 — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=AI&patternName=%EA%B2%BD%EC%98%81%20%EC%8B%A4%EC%A0%81%20%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C

MOBILE 7건 (L1~L7) / PC 5건 (L8~L12)

## 반영 포인트

- P1: 빈 칸은 미리 깔아 둔 슬롯으로 보여준다. 6칸을 처음부터 모두 그리고 빈 칸 가운데 "+ 대학 담기"만 둔다. 슬롯 자리에서 바로 담기를 시작한다. 모양은 design.md susi-slot을 따른다(1px 점선 hairline + rounded.md + text-muted). L2의 회색 채움, L8의 색 아이콘은 가져오지 않는다. (모바일/PC) [근거: L2, L3, L8]
- P2: 개수 표시와 조건부 버튼. 보드 머리에 "6회 제한 4/6장" 같은 개수 표시(고정폭 숫자)를 두고, 6장이 차면 담기를 막는다(R-CARD-001). "6회 제외" 칸은 따로 센다. 상담카드 보내기 button-primary는 1장 이상 담았을 때만 켠다. 꺼져 있을 때는 이유를 문구로 보여준다(예: "1장 이상 담아야 보낼 수 있어요"). (모바일/PC) [근거: L1, L6]
- P3: 모바일 순서 변경. 처음 한 번만 툴팁으로 "길게 눌러 순서를 바꿀 수 있어요"를 안내하고, 칸 오른쪽에 정렬 핸들을 둔다. 길게 누르기가 어려운 사용자와 키보드 사용자를 위해 앱바 보조 동작 "순서 변경"을 두고, 이를 누르면 bottom-sheet 목록(핸들 + 위/아래 버튼)과 "적용하기"가 열린다. 움직임은 칸이 자리를 바꾸는 애니메이션만 쓴다. (모바일) [근거: L6, L5]
- P4: 상담카드 공유. share-sheet 위쪽에 segmented-control로 "QR로 보여주기 · 파일로 저장"을 두고, QR 모드에서는 큰 QR 한 장과 "1/3" 남은 장수를 보여준다. 결제 화면의 그라데이션 테두리, 타이머 색, 브랜드 컬러는 가져오지 않는다(흑백 + 잉크). (모바일 바텀시트 / PC 모달) [근거: L4]
- P5: PC 오른쪽 고정 경고 패널(360px). 본문 3×2 그리드는 스크롤되고, 오른쪽 패널은 고정한다. 패널은 위에서부터 warning-callout 목록, 전형 유형 분포 요약, 맨 아래 button-primary "상담카드 보내기" 순서로 둔다. 경고를 누르면 관련 칸에 1px 잉크 테두리를 친다. L9의 빨간 CTA 색은 쓰지 않는다. (PC) [근거: L9, L12]
- P6: 시나리오 탭. 그리드 바로 위에 scenario-tabs(A안 · B안 · C안 알약 세그먼트)를 두고 오른쪽 끝에 "+ 새 안" button-pill-soft를 둔다. 탭을 바꿔도 보드 레이아웃은 그대로 두고 내용만 바꾼다. (PC 우선, 모바일은 경고 요약 바 아래 같은 세그먼트) [근거: L10, L12]
- P7: 보드 상단 요약 타일. 그리드 위에 stat-tile 한 줄(교과 n · 종합 n · 논술 n · 6회 제외 n)을 둔다. 판정 분포는 judge-badge(색 + 아이콘 + 이름)로 개수만 보여준다. 타일 자체는 흑백이다. (PC, 모바일은 경고 요약 바 안 한 줄 요약) [근거: L11, L12]
- P8: 빈 보드 empty-state. 0장일 때는 6칸 빈 슬롯을 그대로 보여주고, 그 위에 흑백 선 아이콘 + "아직 담은 대학이 없어요" + button-primary "될각에서 대학 담기" 하나를 둔다. 보내기 버튼은 비활성으로 둔다. (모바일/PC) [근거: L7, L2]

## 가져오지 않는 것 (design.md·PRD 충돌)

- 레퍼런스의 브랜드 컬러 CTA(주황 L2, 초록 L8, 빨강 L9)와 그라데이션(L4): 주요 버튼은 잉크 알약만 쓴다.
- 카드 그림자, 로고 이미지: 대학은 univ-monogram으로 표시한다.
- "합격 가능", "합격 확률" 같은 문구: 경고는 "입결과 비교하면", "쏠림" 같은 표현만 쓴다(NEVER-2).
