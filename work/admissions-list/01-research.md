# 01-research — 전형계획 목록 (admissions-list)

> 대상: PRD 5장 [전형계획] "대학 검색 → 대학 상세 → 전형 상세"의 첫 화면, 6-1 "대학 검색: 이름, 지역(강원/수도권/권역), 설립 유형, 캠퍼스" + "관심 대학·전형 담기(학생 기기에 저장)". 15장 핵심 화면 "전형계획 목록".
> 2028 전형계획을 대학·전형 단위로 찾고(검색), 거르고(필터·정렬), 관심 담기(interest-heart) 하는 목록이다. 행을 누르면 대학 상세(univ-detail) 또는 전형 상세(program-detail)로 간다.
> 누구나(로그인 없음) 보는 공개 데이터 화면이다. 개인 성적이 없으므로 judge-badge·내 환산 숫자·Route Blue 내 위치는 쓰지 않는다.
> 기준: docs/design.md — 흑백 + 의미 색, 모서리 0, 그림자는 bottom-sheet·modal·toast·드롭다운만, univ-logo(없으면 univ-monogram), filter-chip on = accent-soft + 1px accent 테두리, interest-heart 담김만 {colors.heart}.
> 겹침 정리: univ-detail(대학 한 곳 안의 전형 목록·변경사항)·program-detail(전형 한 건의 상세)과 달리, 이 화면은 **전국 대학·전형을 가로질러 거르는 큰 목록**이다. 그래서 레퍼런스도 상세 화면이 아니라 다속성 목록(부동산·여행·모빌리티·채용·골프 예약)의 필터·정렬·찜·빈 결과를 본다.

## 검색 기록 (2026-11-18, uibowl 무료 등급 — 검색당 3건)

| # | 도구 | 조건 | 결과 |
|---|---|---|---|
| 1 | search_ui_patterns | "필터", 부동산, MOBILE | 집지켜, 자리톡, 직방 |
| 2 | search_components | 바텀시트 × 필터, MOBILE | 골프존, 겟차, 카카오골프예약 |
| 3 | search_components | 빈 화면 × 검색, MOBILE | 오일나우, 헬로우봇, 페이워크 |
| 4 | search_ui_patterns | "목록", 채용, PC | 디맨드 ×3 |
| 5 | search_components | "찜" × 목록 | 0건 → 6번으로 재검색 |
| 6 | search_ui_patterns | "북마크·위시리스트", MOBILE | 트립스토어, 잼페이스, 차봇 |
| 7 | search_ui_patterns | "정렬", 여행, MOBILE | 여기어때, 스테이폴리오 |
| 8 | search_components | 테이블 × 목록 (PLP), PC | 레뷰(REVU), 채널톡, 피처링 |
| 9 | search_components | 칩 × 목록 (PLP), MOBILE | 워크온, 런드리고, 렌트카 카모아 |

## 레퍼런스

- [L1] 집지켜 (MOBILE, 부동산) — 공고 필터: 목록 위 상태 탭(접수전 3건·접수중 0건…)에 개수, 그 아래 "공급주체 ∨ · 상태 ∨" 드롭다운형 칩. 칩을 누르면 바텀시트가 열리고 시트 안 2탭(공급주체·상태), 오른쪽 위 "선택 초기화", 체크 목록, 하단 전체 폭 "적용하기" — https://uibowl.io/name/%EC%A7%91%EC%A7%80%EC%BC%9C?patterns=%ED%95%84%ED%84%B0&patternName=%EA%B3%B5%EA%B3%A0
- [L2] 직방 (MOBILE, 부동산) — 검색 필터 전체 화면: 맨 위에 지금 걸린 조건 요약 칩 줄(원룸·투룸+… / 월세·전세·매매 / 보증금…), 본문은 섹션 제목(건물유형·거래유형·매매가·보증금) + 다중 선택 토글 칩 묶음, 하단 고정 "닫기 + 적용하기" 2버튼 — https://uibowl.io/name/%EC%A7%81%EB%B0%A9?patterns=%ED%95%84%ED%84%B0&patternName=%EA%B2%80%EC%83%89
- [L3] 자리톡 (MOBILE, 부동산) — 매물 필터: 상단에 필터 묶음 전환 탭 2개(전월세/매매·금액 | 구조·면적), 거래유형 4칸 단일 선택, 범위 슬라이더, 토글 한 줄, 하단 "초기화(외곽선) + 적용하기(채움)" — https://uibowl.io/name/%EC%9E%90%EB%A6%AC%ED%86%A1?patterns=%ED%95%84%ED%84%B0&patternName=%EB%A7%A4%EB%AC%BC
- [L4] 카카오골프예약 (MOBILE, 운동&건강) — 조인 목록 조건 필터: 목록 맨 위 지역 칩 가로 스크롤(서울/경기·강원·충청·경상…), 그 아래 "필터" 버튼 + "모집 완료 제외" 체크 + "빈자리순" 정렬. 필터 바텀시트는 섹션(시간대·빈자리·성별)별 외곽선 칩 묶음, 아래 체크 한 줄 "참여 가능한 조인만 보기", 하단 "조건 초기화 + 적용하기" — https://uibowl.io/name/%EC%B9%B4%EC%B9%B4%EC%98%A4%EA%B3%A8%ED%94%84%EC%98%88%EC%95%BD?patterns=%ED%95%84%ED%84%B0&imgId=cmtwlv9y9002eky04rfw0ikms
- [L5] 골프존 (MOBILE, 운동&건강) — 지역별 티타임: 지역 탭 줄 → 드롭다운 칩(시간대 ∨, 이벤트 CC) + 오른쪽 끝 필터 아이콘 → 결과 개수 줄 "골프장(119) | 티타임(1190)" 왼쪽 + "티타임 많은 순 ∨" 정렬 오른쪽. 시간대 칩을 누르면 바텀시트에 체크박스 목록(전체·새벽·오전…) + "초기화 + 적용" — https://uibowl.io/name/%EA%B3%A8%ED%94%84%EC%A1%B4?patterns=%ED%95%84%ED%84%B0&imgId=cmunkg9u700a8jq047traf8ao
- [L6] 여기어때 (MOBILE, 여행) — 검색 정렬: 목록 위 "예약가능" 체크 + "정렬"·"필터" 보조 버튼 2개, 카드 이미지 오른쪽 위 하트. 정렬은 바텀시트 라디오 목록(추천순·거리순·평점높은순·리뷰많은순·가격순) — https://uibowl.io/name/%EC%97%AC%EA%B8%B0%EC%96%B4%EB%95%8C?patterns=%ED%95%84%ED%84%B0&patternName=%EA%B2%80%EC%83%89%EC%A0%95%EB%A0%AC
- [L7] 스테이폴리오 (MOBILE, 여행) — 정렬: 목록 오른쪽 위 "인기순 ∨" 텍스트 트리거, 바텀시트 제목 "정렬" + 닫기, 선택지 6개 중 선택된 것만 굵은 글자 + 오른쪽 체크. 카드 오른쪽 위 북마크 아이콘 — https://uibowl.io/name/%EC%8A%A4%ED%85%8C%EC%9D%B4%ED%8F%B4%EB%A6%AC%EC%98%A4?patterns=%ED%95%84%ED%84%B0&patternName=%EC%A0%95%EB%A0%AC
- [L8] 트립스토어 (MOBILE, 여행) — 찜한 여행: 2탭(해외여행·국내숙소), "1개의 찜" 개수 + 오른쪽 "편집", 썸네일 위 채운 하트, 아래 화면 하단에 떠 있는 "여행 비교하기" 버튼 — https://uibowl.io/name/%ED%8A%B8%EB%A6%BD%EC%8A%A4%ED%86%A0%EC%96%B4?patterns=%EB%B6%81%EB%A7%88%ED%81%AC%C2%B7%EC%9C%84%EC%8B%9C%EB%A6%AC%EC%8A%A4%ED%8A%B8&patternName=%EA%B3%B5%EC%9C%A0%ED%95%98%EA%B8%B0
- [L9] 오일나우 (MOBILE, 모빌리티) — 검색 결과 없음: 검색창에 검색어 유지, 화면 가운데 선 아이콘 + "'와이퍼'에 대한 검색 결과가 없어요. 다른 검색어를 입력해 주세요." 2줄 + 외곽선 버튼 1개 — https://uibowl.io/name/%EC%98%A4%EC%9D%BC%EB%82%98%EC%9A%B0?patterns=%EA%B2%80%EC%83%89&imgId=cmtpnvoci000rlh04frsnnhkt
- [L10] 디맨드 (PC, 채용) — 채용공고 목록: 상단 탭(알바공고·일반공고) → 드롭다운 필터 2개(학력 전체 ∨ · 경력 전체 ∨) → 왼쪽 총 개수 + 오른쪽 정렬 → 2열 카드(로고·회사·공고명·태그, 오른쪽 위 북마크) — https://uibowl.io/website/%EB%94%94%EB%A7%A8%EB%93%9C?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&patternName=%EC%B1%84%EC%9A%A9%EA%B3%B5%EA%B3%A0
- [L11] 레뷰 REVU (PC, 비즈니스툴) — 캠페인 리스트: 왼쪽 사이드바 + 본문 위 필터 패널(행마다 왼쪽 라벨 + 오른쪽 선택지 알약 여러 개, 기간 입력), 가운데 "검색" 버튼, 아래 상태 탭(개수 포함) → 표(썸네일·캠페인명·열 여러 개, 숫자 열) — https://uibowl.io/website/%EB%A0%88%EB%B7%B0%20(REVU)?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&imgId=cmvepnpe5002jl906yu0400m3
- [L12] 렌트카 카모아 (MOBILE, 모빌리티) — 검색 리스트: 상단 "가격순 ∨" 정렬 + "필터" 버튼 + 토글 칩 2개(배달비 포함·배달가능 업체), 그 아래 차종 칩 가로 스크롤(전체·전기·경형·준중형…, 선택은 채움), 카드 세로 목록 — https://uibowl.io/name/%EB%A0%8C%ED%8A%B8%EC%B9%B4%20%EC%B9%B4%EB%AA%A8%EC%95%84?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&imgId=cmwirvnq60021lh08lrlkjrk9
- [L13] 워크온 (MOBILE, 운동&건강) — 내 챌린지 목록: 제목 아래 상태 칩 한 줄(전체·참여중·예약중·종료), 선택 칩은 파란 1px 테두리 + 파란 글자, 나머지는 회색 외곽선 — https://uibowl.io/name/%EC%9B%8C%ED%81%AC%EC%98%A8?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&imgId=cmudxbgnp000cjv04ewvc4qva

링크 수: 13 (MOBILE 11 / PC 2)

## 반영 포인트

- P1: 모바일 목록 머리 순서 — app-bar("전형계획") → 대학명 검색 text-input → 전형 유형 빠른 칩 한 줄(전체·교과·종합·논술·실기·정시, 단일 선택 filter-chip, 가로 스크롤) → 조건 줄(드롭다운형 filter-chip "지역 ∨ · 설립 유형 ∨ · 계열 ∨" + 맨 끝 button-pill-soft "필터 n") → 결과 개수 줄("전형 1,234개" 왼쪽, 정렬 트리거 오른쪽) → univ-card 세로 목록. 조건이 걸린 칩은 filter-chip on(accent-soft + 1px accent 테두리)으로만 표시하고, 유형별 색은 넣지 않는다(판정 색을 카테고리에 쓰지 않음). (모바일) [근거: L4, L5, L12, L13]
- P2: 필터 bottom-sheet — 손잡이 + 제목 "필터" + 오른쪽 "초기화" 텍스트 버튼, 본문은 섹션 제목(heading-4) + filter-chip 다중 선택 묶음: 지역(강원·서울·경기/인천·충청·…) / 설립 유형(국립·공립·사립) / 전형 유형 / 계열 / 조건(수능최저 있음·면접 있음·재학생 한정 — 체크 행). 하단 고정 줄은 button-outline "초기화" + button-primary "전형 n개 보기"(적용 결과 개수를 버튼에 미리 보여줌, 주요 버튼은 1개). 섹션이 많아 길어지면 시트 안을 스크롤하고 하단 줄은 고정. 칩 하나만 바꾸는 드롭다운형 칩(지역 ∨)은 그 섹션만 담은 짧은 시트로 연다. (모바일) [근거: L1, L2, L3, L4, L5]
- P3: 정렬 — 개수 줄 오른쪽 "가나다순 ∨" 텍스트 트리거(typography.link) → 짧은 bottom-sheet(모바일)/드롭다운(PC) 단일 선택 목록: 가나다순 · 모집인원 많은 순 · 지역순 · 최근 변경순. 선택된 줄은 accent-soft 채움 + 오른쪽 체크 아이콘 + 굵은 글자. "인기순·추천순"처럼 대학 서열이나 선호로 읽히는 정렬은 넣지 않는다(NEVER-2 방향). (모바일·PC 공통) [근거: L5, L6, L7]
- P4: 관심 담기 — univ-card 오른쪽 위 interest-heart(터치 44×44, 안 담김 = 잉크 선 하트, 담김 = {colors.heart} 채운 하트). 누르면 toast "관심 전형에 담았어요"(모바일 탭바 위 / PC 오른쪽 아래). 결과 개수 줄 앞에 filter-chip "관심만 보기 n"을 두어 담은 것만 거를 수 있게 한다. 원본의 별점·할인가·광고 배지는 가져오지 않는다. 트립스토어식 "비교하기" 떠 있는 버튼은 PRD 전형계획 범위 밖이라 넣지 않는다. (모바일·PC 공통) [근거: L6, L7, L8, L10]
- P5: PC 구성 — sidebar(전형계획 선택) + 상단 바(제목·데이터 기준일 배지) 아래, 본문 위 필터 패널을 "왼쪽 라벨 / 오른쪽 filter-chip 줄" 행으로 펼쳐 둔다(지역·설립 유형·전형 유형·계열·조건, 각 1행, 바텀시트 없이 바로 클릭). 그 아래 왼쪽 "전형 n개" + 오른쪽 정렬 드롭다운 + segmented-control "목록 · 표" 전환. 표 보기는 data-table(대학 | 전형명 | 유형 | 세부 유형 | 모집인원(오른쪽 정렬·고정폭) | 수능최저 | 면접 | data-status-badge | 하트), 첫 열·머리글 고정, 정렬 가능한 열에 화살표. 목록 보기는 univ-card 2열 그리드. 행/카드를 누르면 전형 상세, 대학명을 누르면 대학 상세. (PC) [근거: L10, L11]
- P6: 빈 결과 — empty-state(가운데 흑백 선 아이콘 + heading-4 "조건에 맞는 전형이 없어요" + body-sm에 지금 걸린 조건 요약 "강원 · 종합 · 면접 있음"), button-primary "필터 초기화" 1개. 검색어로 0건이면 검색창에 검색어를 그대로 두고 "'○○'에 맞는 대학이 없어요. 대학 이름을 다시 확인해 주세요."처럼 무엇을 고치면 되는지 함께 쓴다. 이때 필터 칩 줄은 그대로 보여서 바로 풀 수 있게 한다. (모바일·PC 공통) [근거: L9, L1]
- P7: 상태 탭에 개수 붙이기 — 빠른 칩(전형 유형)과 탭 이름 옆에 해당 개수를 고정폭 숫자로 붙여("종합 412") 누르기 전에 결과 규모를 알 수 있게 한다. 개수는 caption 굵기·색 차이로만 표시하고 배지 색은 쓰지 않는다. (모바일·PC 공통) [근거: L1, L5, L11]

## 카드 내용 메모 (S2 참고, 레퍼런스 근거 아님)

- univ-card(공개 목록용): univ-logo(없으면 univ-monogram) · 대학명 heading-3 · 전형명 + 유형·세부 유형 body-sm muted · 지역·캠퍼스 caption · 모집인원 고정폭 숫자 · "수능최저 있음 / 면접 있음" 흑백 칩 · data-status-badge · 오른쪽 위 interest-heart. judge-badge·내 환산·"수시로에 담기"는 공개 목록에서 빼는 방향(성적 없는 방문자 화면).
- 목록 맨 위 또는 끝에 disclaimer-note "대학 공식 자료가 최종 기준이에요 · 데이터 기준일 YYYY-MM-DD"(데이터 기준일은 PRD 6-1·13장 필수).
- 미결: 목록 단위를 "전형 1행"으로 할지 "대학 1행 + 전형 접기"로 할지 S2에서 결정. 대학 단위를 고르면 segmented-control "대학 · 전형" 전환이 필요하다.
- sub-nav(대학 찾기 대분류의 소분류 전환)는 design.md에 아직 없다 → S2에서 쓰려면 "design.md 수정 제안"으로 멈춘다. 그 전까지는 app-bar 제목 / sidebar-item 선택으로 대신한다.

## 가져오지 않는 것 (design.md 충돌)

- 파랑·주황·초록 채움 주요 버튼(L1·L2·L3·L4·L5) → 주요 버튼은 잉크 채움, Route Blue는 선택 표시에만.
- 둥근 칩·둥근 시트 모서리(L2·L4·L13) → 모든 모서리 0.
- 카드 사진·썸네일·광고 배너·할인가·별점(L6·L8·L12) → 대학 사진 금지, 의미 없는 색 금지.
- 가격 약속형 광고 배지(L12)와 "인기순·추천순" 정렬(L6·L7) → 대학 서열·결과를 암시할 수 있어 NEVER-2 방향으로 제외.
- 칩·카드 그림자 → 그림자는 bottom-sheet·드롭다운·toast에만.
