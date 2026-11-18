# 01-research — result-summary (결과 집계)

대상: 교사 모드 "결과 집계" — 반의 수시 지원·실제 결과(1단계/최종: 합격·불합격·충원합격·미등록) 입력과 가채점 수합(최저 충족 현황)을 표·요약으로 보고 xlsx로 내보내는 화면 (PRD 6-10 가채점 수합·수시 결과 집계, 8장 AdmissionOutcome).
제약: NEVER-2 — 실제 결과 기록만, 예측·확률 표현 금지. 학생은 번호·별칭만(R-PRIV-003). 데이터 화면이라 PC는 화면 폭 전체, 모바일은 보기 전용 요약.

검색(uibowl, 2026-11-18, 무료 등급 3건/회): PC "대시보드" 패턴 / PC 테이블 컴포넌트 / PC OCR "엑셀 다운로드" / PC 드롭다운 / PC 빈 화면 / 필터(0건 → "칩, 테이블"로 재검색) / PC "드롭다운, 테이블" / PC 통계·리포트 + 테이블 / OCR "합격 불합격".

## 레퍼런스

[L1] 사방넷 — 대시보드: 상단 가로 한 줄 숫자 타일(현황 건수) 아래 상태별 목록 패널을 나란히 배치 — https://uibowl.io/website/%EC%82%AC%EB%B0%A9%EB%84%B7?patterns=%EB%A9%94%EC%9D%B8&patternName=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
[L2] 클로브 AI — 경영 실적 대시보드: 큰 숫자 타일 2개(라벨 → 값) 아래 기간별 막대 차트, 흑백 위주 카드 — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=AI&patternName=%EA%B2%BD%EC%98%81%20%EC%8B%A4%EC%A0%81%20%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
[L3] 클로브 AI — 자금현황: 상단 합계 숫자 4칸 한 줄(구분선으로 나눔) + 아래 그룹(계좌)별 합계 테이블, 표 오른쪽 위에 보조 버튼 묶음 — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=%EB%82%B4%EC%97%AD&imgId=cmw0i5f2y001hgw073xu2xyym
[L4] 리블 — 통계·리포트/지역: 지역(그룹)별 행 × 지표 열 집계 테이블, 숫자 열 오른쪽 정렬 — https://uibowl.io/website/%EB%A6%AC%EB%B8%94?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmuc28b20000jl204mwrn3vkl
[L5] Npay 증권 — 통계·리포트/종목분석: 기간 드롭다운 + 차트 + 아래 연도×항목 매트릭스 테이블(차트와 같은 값) — https://uibowl.io/website/Npay%20%EC%A6%9D%EA%B6%8C?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EC%A2%85%EB%AA%A9%EB%B6%84%EC%84%9D
[L6] 뿌리오 — 발송 결과 내역서: 상단 탭 + 필터 행(드롭다운·기간) + 결과 테이블, 표 오른쪽 위 "엑셀 다운로드" 테두리 버튼 — https://uibowl.io/website/%EB%BF%8C%EB%A6%AC%EC%98%A4?patterns=%EB%82%B4%EC%97%AD&imgId=cmu1vvu9l000vjv04jiybtxr8
[L7] 레뷰 (REVU) — 애드센터 캠페인 목록: 표 위 칩 필터 줄(상태·기간 등) + 조회 버튼, 상태 탭에 "전체 n" 개수 표시, 아래 테이블 — https://uibowl.io/website/%EB%A0%88%EB%B7%B0%20(REVU)?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&imgId=cmvepnpe5002jl906yu0400m3
[L8] 뿌리오 — 주소록(문자 발송): 테이블 행 위에서 드롭다운 메뉴가 떠 있는 상태(선택지 목록), 행 단위 선택 체크박스 — https://uibowl.io/website/%EB%BF%8C%EB%A6%AC%EC%98%A4?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&imgId=cmu1vw9eo002lla04dbvm7b3h
[L9] 핵클 — 이벤트 관리: 테이블 위 드롭다운 필터 여러 개 + 목록 테이블 — https://uibowl.io/website/%ED%95%B5%ED%81%B4?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&imgId=cmvymv4n9000mjs082y7vexgx
[L10] Npay 증권 — 국내증시: 칩 탭(구분) + 행이 많은 숫자 테이블, 숫자 오른쪽 정렬·촘촘한 행 — https://uibowl.io/website/Npay%20%EC%A6%9D%EA%B6%8C?patterns=%EA%B3%B5%EC%A7%80%EC%82%AC%ED%95%AD&imgId=cmvg2hfxd0003ll06fnu6wpmz
[L11] 폰코 — 나의 쇼핑 정보: 표 머리글은 그대로 두고 본문 자리에 "내역이 없습니다" 한 줄만 표시하는 빈 표 — https://uibowl.io/website/%ED%8F%B0%EC%BD%94?patterns=%EB%A7%88%EC%9D%B4%ED%8E%98%EC%9D%B4%EC%A7%80&imgId=cmqywfznl000fjm04gculyzbx
[L12] 마이크로소프트 클래리티 — 퍼널: 빈 목록에 안내 한 줄 + 상단 만들기 버튼 하나 — https://uibowl.io/website/%EB%A7%88%EC%9D%B4%ED%81%AC%EB%A1%9C%EC%86%8C%ED%94%84%ED%8A%B8%20%ED%81%B4%EB%9E%98%EB%A6%AC%ED%8B%B0%20(Microsoft%20Clarity)?patterns=%EA%B2%80%EC%83%89&imgId=cmt17v7tg0097jl04y0t5pxsa
[L13] 디맨드 — 합격자 스펙 온보딩(반면교사): 결과 데이터를 "내 스펙과 비교 분석"으로 엮는 안내 — 결과 기록을 예측·진단으로 읽게 만드는 방식이라 가져오지 않음 — https://uibowl.io/name/%EB%94%94%EB%A7%A8%EB%93%9C?patterns=%EC%98%A8%EB%B3%B4%EB%94%A9&imgId=cmtkpt8mq0028jx04azhwz3jb

## 반영 포인트

- P1: 화면 맨 위 stat-tile 한 줄(4개 안팎: 지원 건수 · 최종 합격 · 충원합격 · 결과 미입력 / 가채점 탭은 제출 · 최저 충족 · 미충족 · 미제출). 라벨 caption → 값 numeric 고정폭 순서, 타일 사이는 1px 선으로만 구분(그림자 없음). 핵심 숫자 1~2개만 Route Blue. [근거: L1, L2, L3]
- P2: 본문은 data-table 하나에 그룹 집계 행을 둔다 — 대학(또는 전형 유형)별 행 × 지원·1단계 통과·최종 합격·충원·불합격 열, 숫자 열 오른쪽 정렬·고정폭, 그룹 합계 행은 굵게 + 위 1px hairline. 학생×대학 결과 매트릭스는 같은 data-table의 보기 전환(segmented-control "대학별 · 학생별")으로, 학생 열은 번호·별칭만 쓰고 첫 열 고정. [근거: L4, L5, L10]
- P3: 결과 입력은 표 셀 안에서 바로 고른다 — 셀을 누르면 떠 있는 드롭다운(Overlay, shadow.overlay 허용)으로 합격 / 불합격 / 충원합격 / 미등록 / 미입력 중 선택, 편집 중 셀은 grade-input-table처럼 2px 잉크 링. 결과 값은 흑백 텍스트로 쓰고 판정 색(될각)을 쓰지 않는다(카테고리 구분에 판정 색 금지). 셀 선택 컴포넌트가 design.md에 따로 없으면 S2에서 "design.md 수정 제안"으로 올린다. [근거: L8, L9]
- P4: 표 바로 위 필터 줄 — filter-chip(학년도 · 반 · 전형 유형 · 결과 상태), 선택 칩은 accent-soft + 1px accent 테두리. 상태 칩 이름 옆에 개수("미입력 7")를 붙여 남은 입력을 바로 찾게 한다. 탭은 "수시 결과 · 가채점 수합" 두 개. [근거: L7, L9, L10]
- P5: 내보내기는 표 오른쪽 위 button-outline "xlsx 내보내기"(아이콘 + 글자), 그 옆 button-outline "나이스 엑셀 불러오기". 주요 버튼(button-primary)은 화면에 하나만 — 불러오기 전 빈 상태에서만 쓴다. 내보내기 파일도 번호·별칭 기본(R-PRIV-003). [근거: L3, L6]
- P6: 빈 상태 두 가지 — (a) 결과 파일을 아직 안 불러왔을 때 empty-state(선 아이콘 + "아직 불러온 결과가 없어요" + button-primary "나이스 엑셀 불러오기"), (b) 필터 결과가 0건일 때는 표 머리글을 유지하고 본문 한 줄 안내("조건에 맞는 학생이 없어요")만. [근거: L11, L12]
- P7: NEVER-2 문구 규칙 — 화면은 이미 나온 "결과 기록"과 "충족 현황"만 말한다. 앞으로의 결과를 점치거나 합격자와 견주어 진단하는 문구는 쓰지 않고(금지어는 rules/design-rules.json `forbidden_words` 기준), 비율 대신 "최종 합격 12 / 지원 48"처럼 실제 건수로 쓴다. 가채점 탭 머리글은 "최저 충족 현황". [근거: L13, L6]

## 메모 (S2 참고)

- design.md에 결과 상태(합격·불합격·충원) 전용 배지/색이 없다 — 흑백 텍스트로 두거나, 필요하면 design.md 수정 제안.
- design.md "교사 대시보드·카드 수합·결과 집계" 모바일 = 보기 전용 요약 + "PC에서 열면 전체 기능을 쓸 수 있어요" 안내 → 390 프레임은 stat-tile + student-row-card 요약만.
