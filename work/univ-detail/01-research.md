# 01-research — 대학 상세 (univ-detail)

> 대상: PRD 6-1 대학 상세 = 2028 전형 목록 + 전년 대비 주요 변경사항 요약. 5장 [전형계획] 대학 검색 → **대학 상세** → 전형 상세.
> 누구나(로그인 없음) 보는 공개 데이터 화면이다. 개인 성적이 없으므로 될각 판정 배지·judge 색은 쓰지 않는다.
> 기준: docs/design.md (흑백 + 의미 색만, 알약, 그림자 없음, 로고 대신 univ-monogram, data-status-badge 흑백).

## 검색 기록

| # | 도구 | 조건 | 결과 |
|---|---|---|---|
| 1 | search_ui_patterns | "상세", 교육&도서, MOBILE | 랭플릭스, 플랭, 틈틈잇 |
| 2 | search_ui_patterns | "상세", PC | 카카오페이지, 리블, 눈누 |
| 3 | search_components | 탭 × 상세, MOBILE | 워크온, 퍼그샵, 다글로 |
| 4 | search_ui_patterns | "목록", 교육&도서, PC | 리디(가로형), 리디(세로형) |
| 5 | search_by_ocr_text | "변경사항", MOBILE | 수퍼빈, 제페토, 도미노 |
| 6 | search_components | 테이블 × 상세, PC | 리블(전체화면), 모각작, 알파스퀘어 |

## 레퍼런스

- [L1] 랭플릭스 (MOBILE) — 레슨 상세: 상단 요약 카드(썸네일 + "추가된 표현 0개 >") 아래 2탭(코스·시청), 탭 안에 흰 카드 행 목록(아이콘 + 항목명 + 오른쪽 보조 동작) — https://uibowl.io/name/%EB%9E%AD%ED%94%8C%EB%A6%AD%EC%8A%A4?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EB%A0%88%EC%8A%A8-%EC%8B%9C%EC%B2%AD
- [L2] 워크온 (MOBILE) — 챌린지 상세: 앱바 제목 1줄 말줄임 + 2탭(안내·게시판), 본문은 굵은 섹션 제목 + 설명 문단, 화면 하단 고정 주요 버튼 1개 — https://uibowl.io/name/%EC%9B%8C%ED%81%AC%EC%98%A8?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&imgId=cmudxbiy1001gjv04kplu02bs
- [L3] 퍼그샵 (MOBILE) — 캠페인 상세: 3탭(캠페인 정보·미션 정보·유의사항) 아래 섹션 제목 + 리드 문장 + 가로 스크롤 알약 필터 줄, 하단 고정 주요 버튼 — https://uibowl.io/name/%ED%8D%BC%EA%B7%B8%EC%83%B5?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&imgId=cmq7exmdv0009l8040cofbk86
- [L4] 수퍼빈 (MOBILE) — 공지 상세(약관 개정 안내): 아코디언 펼침 안에 개정일자(공고일·시행일) → 개정 사유 → "주요 개정 내용(개정 전 → 개정 후)" 2열 비교 표 순서 — https://uibowl.io/name/%EC%88%98%ED%8D%BC%EB%B9%88?patterns=%EA%B3%B5%EC%A7%80%EC%82%AC%ED%95%AD&imgId=cmvop3n11000wl207o50f86rc
- [L5] 틈틈잇 (MOBILE) — 내 학습주제: 섹션 제목 + 오른쪽 "전체보기 >" 링크, 아래 외곽선 카드 안에 경로형 제목(디자인 > UI & UX > …)과 작은 메타 칩 — https://uibowl.io/name/%ED%8B%88%ED%8B%88%EC%9E%87?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EB%82%B4%20%ED%95%99%EC%8A%B5%EC%A3%BC%EC%A0%9C
- [L6] 카카오페이지 (PC) — 작품 상세: 왼쪽 고정 요약 컬럼(표지·제목·메타·주요 버튼) + 오른쪽 탭(회차·정보) 본문, 정보 탭에 줄거리 → 키워드 태그 → 관련 목록 — https://uibowl.io/website/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%8E%98%EC%9D%B4%EC%A7%80?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EC%9E%91%ED%92%88%20-%20%EC%A0%95%EB%B3%B4
- [L7] 리블 (PC) — 단지 상세: 왼쪽 촘촘한 목록 표(행마다 이름·수치 열), 행을 고르면 오른쪽 보조 패널에 선택 항목 요약·차트가 나란히 열림 — https://uibowl.io/website/%EB%A6%AC%EB%B8%94?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EB%8B%A8%EC%A7%80
- [L8] 눈누 (PC) — 폰트 상세: 왼쪽 큰 본문 영역 + 오른쪽 정보 패널(제목·메타·선택 드롭다운·주요 버튼), 하단에 라벨-값 2열 정보 표(제작사·라이선스 등) — https://uibowl.io/website/%EB%88%88%EB%88%84?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%ED%8F%B0%ED%8A%B8
- [L9] 리디 (PC, 교육&도서) — 목록 가로형: 행마다 썸네일 + 제목 + 저자·출판사 메타 + 짧은 설명 2줄, 오른쪽 위 정렬 알약 + 목록/격자 보기 전환 — https://uibowl.io/website/%EB%A6%AC%EB%94%94?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&patternName=%EA%B0%80%EB%A1%9C%ED%98%95%EC%9C%BC%EB%A1%9C%20%EB%B3%B4%EA%B8%B0
- [L10] 알파스퀘어 (PC) — 종목정보 상세: 본문 차트 + 오른쪽 패널 탭 안의 라벨-값 표(숫자 오른쪽 정렬), 기간별 비교 행 — https://uibowl.io/website/%EC%95%8C%ED%8C%8C%EC%8A%A4%ED%80%98%EC%96%B4?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&imgId=cmuw2vpvi002ijs04389zflom

## 반영 포인트

- P1: PC 2단 구성 — 왼쪽 고정 대학 요약 컬럼(univ-monogram + 대학명 heading-1 + 지역·설립 유형·캠퍼스 caption + data-status-badge + 데이터 기준일 + button-primary "관심 대학 담기" 1개), 오른쪽은 전형 목록·변경사항 본문. 표지 이미지 자리는 모노그램으로 대체하고 그림자 없이 hairline-soft 외곽선만 쓴다. (PC) [근거: L6, L8]
- P2: 모바일은 앱바(대학명, 길면 본문 제목에서 두 줄로 흘림) → 대학 요약 카드 → segmented-control "전형 목록 · 변경사항" 2개 → 본문, 화면 하단 고정 button-primary "관심 대학 담기" 1개(탭바 위). (모바일) [근거: L1, L2, L3]
- P3: 전형 유형 필터 — 전체·교과·종합·논술·실기·정시를 가로 스크롤 알약(segmented-control 모양, 선택은 흰 알약)으로 목록 위에 둔다. 유형 구분에 색을 넣지 않는다(판정 색을 카테고리에 쓰지 않음). (모바일·PC 공통) [근거: L3, L9]
- P4: 전년 대비 변경사항 요약 — "항목 | 2027 → 2028" 2열 비교 행(모집인원, 전형요소 비율, 수능최저, 면접 유무 등)을 전형별로 묶고, 위에 변경 건수 요약 한 줄, 아래에 원문 출처(시행계획 페이지) button-pill-soft "원문 보기 ↗" + 데이터 기준일 caption. 변경 강조는 색 대신 굵기(700)와 화살표로만 한다. 문구는 사실 서술만("모집인원이 120명에서 98명으로 줄었어요") 쓰고 해석·전망 문구는 넣지 않는다. (모바일: 접이식 행 / PC: 오른쪽 탭 안 표) [근거: L4, L10]
- P5: PC 전형 목록은 data-table(전형명 · 유형 · 세부 유형 · 모집인원 · 수능최저 유무 · 면접 유무 · data-status-badge), 숫자 열 오른쪽 정렬·고정폭 숫자, 행 선택 시 1px 잉크 안쪽 테두리 + 오른쪽 보조 패널 360px에 전형 요약 미리보기와 "전형 상세 보기" 이동. (PC) [근거: L7, L10]
- P6: 모바일 전형 목록은 표 대신 카드 목록 — 흰 카드 + 1px hairline-soft, 전형명 heading-4, 유형·세부 유형·모집인원 body-sm muted, 아래 줄에 "수능최저 있음 / 면접 있음" 흑백 알약과 data-status-badge. 수시·정시 섹션 제목 옆에 개수와 "전체보기 >". 공개 화면이라 judge-badge·내 환산 숫자는 넣지 않는다. (모바일) [근거: L1, L5, L9]
- P7: 대학 기본 정보는 라벨-값 2열 블록(지역 · 설립 유형 · 캠퍼스 · 홈페이지 원문 링크)으로 요약 카드 아래에 둔다. 촘촘한 표 대신 여백으로 묶는다. (모바일·PC 공통) [근거: L8, L10]

## 가져오지 않는 것

- 표지·썸네일 이미지(L6, L9): 대학 로고·사진 금지 → univ-monogram.
- 노랑·주황 CTA(L3, L6)와 그라데이션·그림자 카드(L1, L2): 흑백 + 그림자 없음 원칙과 충돌.
- 수치 차트·빨강/파랑 등락 색(L7, L10): 전형계획은 판정·내 위치가 없으므로 의미 색을 쓸 근거가 없다. 표 구조만 가져온다.
- 유불리·전망 같은 해석 문구: NEVER-2 위험. 변경사항은 사실 비교만 쓴다.
