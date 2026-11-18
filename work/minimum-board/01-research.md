# 01-research — 수능 최저 판정 (minimum-board, 교사용)

조사일 2026-11-18 · 담당 researcher (S1)
근거 문서: docs/prd.md 6-9·6-10·R-JDG-004, docs/design.md(judge-badge, data-table, stat-tile), work/_ref/schs_lms-homeroom.md 3(d)
화면 문구 원칙: 요약·제목은 "충족 현황"으로 쓴다. 예측·가능성으로 읽히는 말은 쓰지 않는다(NEVER-2).

## 화면이 담을 것 (요약)
- 반 학생 × 1순위 목표의 판정 표. 상태 5종: 충족 / 근접 / 미충족 / 자료 부족 / 판정 불가. 판정은 항상 색 + 아이콘 + 이름.
- 요약 타일(판정 대상 · 충족 · 미충족(근접 포함) · 자료 부족(판정 불가 포함)), 시험 고르기, 검색("학생·대학 검색"), "미충족만 보기"(미충족 + 근접).
- 기준 관리: 관리자 검수 기준이 기본, 교사가 넣은 기준에는 "교사 입력·미검수" 배지.
- 규칙으로 만든 상담 명단(근접 = 우선 1 → 자료 부족 = 우선 2 → 여러 과목 = 우선 3), 확인 후 저장.
- xlsx 내보내기(1~3순위 전부: 번호·이름·과목 등급·순위·목표·기준·판정·설명).
- 판정 화면이라 하단에 disclaimer-note(데이터 기준일 + 대학 공식 자료가 최종 기준).

## 레퍼런스 (uibowl, 11건: PC 6 · MOBILE 5)

검색어: 대시보드+테이블(PC), 테이블(PC), OCR "내보내기"(PC), 체크박스+테이블(PC), OCR "미충족"(MOBILE), 토글&스위치+리스트(MOBILE), 체크박스+리스트+버튼(MOBILE), 리포트(MOBILE, 쓸 결과 없음), 필터(MOBILE, 0건)

- [L1] 클로브 AI (PC) — 경영 실적 대시보드: 왼쪽 사이드바, 본문 위에 라벨 → 큰 숫자 요약 카드가 나란히 있고 아래로 차트·표가 이어져요 — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=AI&patternName=%EA%B2%BD%EC%98%81%20%EC%8B%A4%EC%A0%81%20%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- [L2] 클로브 AI (PC) — 자금현황: 숫자 타일 4개를 한 줄로 두고, 바로 아래 표의 머리 오른쪽에 동작 버튼을 모았어요. 숫자 열은 오른쪽 정렬 — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=%EB%82%B4%EC%97%AD&imgId=cmw0i5f2y001hgw073xu2xyym
- [L3] 마이크로소프트 클래리티 (PC) — 사용자 불편 신호 대시보드: 맨 위 숫자 타일 줄 → 아래 신호별 카드·표, 드롭다운·체크박스로 범위를 좁혀요 — https://uibowl.io/website/%EB%A7%88%EC%9D%B4%ED%81%AC%EB%A1%9C%EC%86%8C%ED%94%84%ED%8A%B8%20%ED%81%B4%EB%9E%98%EB%A6%AC%ED%8B%B0%20(Microsoft%20Clarity)?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C&patternName=%EC%82%AC%EC%9A%A9%EC%9E%90%20%EB%B6%88%ED%8E%B8%20%EC%8B%A0%ED%98%B8
- [L4] 아치캘린더 (PC) — 시간 분석 리포트: 제목 아래 필터 줄, 그 오른쪽 끝에 "내보내기" 버튼 하나, 아래로 요약 카드 — https://uibowl.io/website/%EC%95%84%EC%B9%98%EC%BA%98%EB%A6%B0%EB%8D%94?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmw8tx69u0010jj07glhax9sq
- [L5] 피처링 (PC) — 인플루언서 목록 표: 행마다 체크박스, 이름 칸 옆에 작은 상태 태그 칩, 숫자 열 오른쪽 정렬, 표 위에 필터 칩 줄 — https://uibowl.io/website/%ED%94%BC%EC%B2%98%EB%A7%81?patterns=%EA%B2%80%EC%83%89&imgId=cmuz1du1q0003jw04saqauwj8
- [L6] 채널톡 (PC) — 고객 목록 표: 맨 위 검색칸, 표 위 안내 한 줄(배너), 첫 열 = 이름(아바타 + 이름) 고정, 오른쪽 위 개수·보기 설정 — https://uibowl.io/website/%EC%B1%84%EB%84%90%ED%86%A1?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&imgId=cmudq4ko40041jx04pjl68ftt
- [L7] iM뱅크 (MOBILE) — 계좌연결: 탭 이름 옆 개수("은행 23"), 목록 위 오른쪽 "추천 기관만 보기" 토글, 행마다 작은 "추천" 태그 + 체크박스, "전체선택", 하단 고정 버튼에 고른 개수("연결 기관 49개") — https://uibowl.io/name/iM%EB%B1%85%ED%81%AC?patterns=%EA%B3%84%EC%A2%8C&imgId=cmp0ug99f00txjw04u3nz6cfd
- [L8] 코인원 (MOBILE) — 입출금 자산 목록: 검색칸 바로 아래 "보유 자산만 보기" 체크 토글, 각 행 이름 아래 작은 상태 태그(입금중지 등), 오른쪽 숫자 — https://uibowl.io/name/%EC%BD%94%EC%9D%B8%EC%9B%90?patterns=%EA%B3%84%EC%A2%8C&imgId=cmwil9txb004tjs083c4x54xz
- [L9] 신한 슈퍼SOL (MOBILE) — 적금 이자율 적용현황: 조건 행마다 상태 라벨("미적용") + 조건 이름, 펼치면 조건 설명과 오른쪽 끝 "미충족" 글자로 결과를 같이 보여줘요 — https://uibowl.io/name/%EC%8B%A0%ED%95%9C%20%EC%8A%88%ED%8D%BCSOL?patterns=%EC%A1%B0%ED%9A%8C%ED%95%98%EA%B8%B0&imgId=cmsmmijgp00galb0491m8su6q
- [L10] 제타 (MOBILE) — 설정집 연결: 체크박스 목록에서 고르면 하단에 고른 항목 칩이 쌓이고, 주요 버튼에 개수("연결하기 (2/5)") — https://uibowl.io/name/%EC%A0%9C%ED%83%80?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&imgId=cmvhfwa5h001ml9085hzsxsg9
- [L11] 도미노 (MOBILE) — 연동 기관 고르기: 체크 목록 + 오른쪽 위 "전체 해제", 하단 고른 칩 줄, 주요 버튼 "36개 연동하기" — https://uibowl.io/name/%EB%8F%84%EB%AF%B8%EB%85%B8?patterns=%EA%B2%80%EC%83%89&imgId=cmue0hwl4000nkw0466x8i1ft

## 반영 포인트

- P1: 요약 타일 4개를 본문 맨 위 한 줄에 둔다(stat-tile: 라벨 caption → 값 numeric → 보조 설명). 묶음 제목은 "충족 현황". 타일은 판정 대상 / 충족 / 미충족(근접 포함) / 자료 부족(판정 불가 포함). Route Blue 숫자는 판정 대상 1개까지만. 모바일은 2×2. [근거: L1, L2, L3]
- P2: 내보내기는 타일 안이 아니라 상단 바·필터 줄 오른쪽 끝에 button-outline "xlsx 내보내기" 하나로 둔다(주요 버튼은 상담 명단 저장에 남겨 둠). 모바일은 앱바 보조 동작 1개. [근거: L4, L2]
- P3: PC 판정 표는 data-table — 첫 열(학생: 번호·이름) 고정, 머리글 고정, 국·수·영·탐 등급 열은 고정폭 숫자 오른쪽 정렬(등급에 색 없음), 마지막 판정 열에 judge-badge(색 + 아이콘 + 이름). 행을 고르면 1px 잉크 안쪽 테두리 + 오른쪽 보조 패널에 이유 줄. [근거: L5, L6, L2]
- P4: 검색칸과 "미충족만 보기"를 표 바로 위 한 줄에 함께 둔다(왼쪽 text-input "학생·대학 검색", 오른쪽 필터). 필터 이름 옆에 해당 인원 수를 붙인다. 켜진 상태는 선택 표시 규칙(Route Blue Soft 채움 + 표시 막대)으로만 보이고 판정 색을 쓰지 않는다. [근거: L7, L8, L6]
- P5: 모바일은 표 대신 student-row-card 목록 — 1줄 이름·번호 + 오른쪽 judge-badge, 2줄 "목표 · 기준", 3줄 "국 2 · 수 3 · 영 2 · 탐 2.5". 판정 이름 옆에 이유 한 줄(예: "수학 1등급만 올리면 충족")을 같이 써서 색 없이도 읽히게 한다. [근거: L9, L8]
- P6: 상담 명단은 고르는 목록으로 만든다 — 행마다 선택 + 우선 순위 태그(우선 1/2/3, 흑백) + 이유 한 줄, 목록 머리에 "전체 선택", 아래 고정 주요 버튼에 고른 수("명단 저장 (N명)"). 블록 머리에 "규칙으로 고름" 흑백 라벨. [근거: L7, L10, L11, L5]
- P7: 기준 관리 목록은 기준 행마다 흑백 data-status-badge로 출처를 표시한다 — 기본 "관리자 검수", 교사가 넣은 기준은 "교사 입력·미검수". 이 배지는 판정 표의 기준 칸에도 똑같이 붙여 어느 판정이 미검수 기준에서 나왔는지 보이게 한다. [근거: L7, L8, L5]

## S2(planner)에 넘길 미결

1. judge-badge 상태 불일치: design.md judge-badge는 안정·적정·소신·위험·경계·판정 없음만 정의한다. 충족·근접·미충족·자료 부족·판정 불가의 색 쌍과 아이콘은 design.md에 없다. 토큰을 새로 만들지 말고 대응표를 정하거나 "design.md 수정 제안"으로 멈출 것. 참고: design.md는 수능최저 미충족 경고에 소신 색 쌍을, 판정 없음에 회색 쌍을 쓰라고 적고 있다.
2. 체크박스·토글 컴포넌트가 design.md components 목록에 없다(P4·P6). 쓸 수 있는 대안: 미충족만 보기 → segmented-control("전체 · 미충족만"), 명단 선택 → data-table 선택 행(Level 3) 또는 design.md 수정 제안.
3. NEVER-1 범위 확인: "교사 입력·미검수" 기준으로 판정을 보여줘도 되는지. NEVER-1은 환산 규칙(R-CALC-002) 대상이고, 수능최저 기준은 PRD 8장 csat_minimum(전형 데이터)이다. 판정을 보여준다면 배지(P7)와 disclaimer-note가 필수.
4. 참고 저장소(_ref)는 판정 태그에 아이콘이 없고, 홈 타일 이름이 예측처럼 읽힌다. 이 화면은 아이콘을 넣고, 요약 문구는 "충족 현황"으로 쓴다.
5. PRD 6-10은 가채점 수합 → "최저 충족 현황표"이고, 6-9는 충족/미충족/경계 3종이다. _ref의 5종(근접·자료 부족·판정 불가 포함)을 쓸지는 planner가 PRD와 맞춰 정한다.
6. design.md 공통 원칙상 교사용 넓은 표는 모바일에서 억지로 줄이지 않는다 → 모바일 390 프레임은 보기 전용 요약 + "PC에서 열면 전체 기능을 쓸 수 있어요" 안내를 함께 검토.
