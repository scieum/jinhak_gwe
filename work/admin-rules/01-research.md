# 01 리서치 — admin-rules (관리자 규칙 편집기·검수)

대상: PRD 6-11 관리자 데이터 파이프라인 · 3-5 센터 데이터 관리자 · 8장 ScoringRule(`review_status: draft / testing / verified`, `reviewed_by` 2명, `test_cases` ≥ 3)
판정 기준: NEVER-1 — `review_status ≠ verified` 규칙은 계산·공개하지 않는다(R-CALC-002).
흐름: AI 초안 → 편집기에서 사람 보정 → 테스트 케이스 통과(≥ 3) → 2인 검수(작성자 ≠ 검수자) → 배포 버전 포함.

검색(uibowl, PC): 패턴 "설정" / "승인" / "버전 기록", 컴포넌트 "테이블" / "에러&실패" / "배지, 테이블"(비즈니스툴) / "아코디언"(비즈니스툴) / "타임라인", OCR "반려" / "변경 이력".
OCR 두 건과 "타임라인"은 관련 없는 화면만 나와서(반려동물, 이벤트 약관, 시세 차트) 목록에서 뺐다.

## 레퍼런스

[L1] 매니패스트 — AI 수정안 승인: 왼쪽 AI 대화에서 수정안을 제안하면 오른쪽 문서 패널에 반영 전 내용을 보여 주고, 사람이 승인해야 적용됨(AI 초안 → 사람 확정) — https://uibowl.io/website/%EB%A7%A4%EB%8B%88%ED%8C%A8%EC%8A%A4%ED%8A%B8?patterns=AI&patternName=%EC%88%98%EC%A0%95%EC%95%88%20%EC%8A%B9%EC%9D%B8
[L2] 매니패스트 — 버전 기록: 왼쪽 세로 목록에 버전별 이름·시각·작성자가 쌓이고, 하나를 고르면 본문이 그 버전으로 바뀜 — https://uibowl.io/website/%EB%A7%A4%EB%8B%88%ED%8C%A8%EC%8A%A4%ED%8A%B8?patterns=%EB%82%B4%EC%97%AD&patternName=%EB%B2%84%EC%A0%84%20%EA%B8%B0%EB%A1%9D
[L3] 믹스패널 — 버전 기록: 본문(차트+표)은 그대로 두고 오른쪽 보조 패널에서 버전 목록을 열어 이전 버전을 고름, 복원은 토스트로 알림 — https://uibowl.io/website/%EB%AF%B9%EC%8A%A4%ED%8C%A8%EB%84%90%20(mixpanel)?patterns=%EB%82%B4%EC%97%AD&patternName=%EB%B2%84%EC%A0%84%20%EA%B8%B0%EB%A1%9D
[L4] 유아이볼 파트너 — 승인현황: 검토 중인 동안 흑백 선 아이콘 + "승인 대기중입니다" 한 줄만 두고 다른 동작을 막는 대기 상태 — https://uibowl.io/website/%EC%9C%A0%EC%95%84%EC%9D%B4%EB%B3%BC%20%ED%8C%8C%ED%8A%B8%EB%84%88?patterns=%EB%82%B4%EC%97%AD&patternName=%EC%8A%B9%EC%9D%B8%ED%98%84%ED%99%A9
[L5] 사방넷 — 승인 대기: 가입 요청을 낸 뒤 관리자 승인 전까지 상태를 모달로 알리는 요청 → 승인 흐름 — https://uibowl.io/website/%EC%82%AC%EB%B0%A9%EB%84%B7?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&patternName=%EC%8A%B9%EC%9D%B8%20%EB%8C%80%EA%B8%B0
[L6] 위시켓 — 파트너 등급 비교 표: 항목 행 × "현재 / 다음" 두 열, 열 머리에 배지를 붙여 두 상태를 같은 행에서 나란히 비교(변경 전·후 비교 표로 쓸 수 있는 구조) — https://uibowl.io/website/%EC%9C%84%EC%8B%9C%EC%BC%93?patterns=%EB%A9%A4%EB%B2%84%EC%8B%AD%C2%B7%EC%9A%94%EA%B8%88%EC%A0%9C&imgId=cmunb61pf002gl204axvpnad2
[L7] 뿌리오 — 발송 결과 상세: 위에 요약 정보, 아래 행마다 결과 상태 배지가 붙은 표(성공/실패 건을 행 단위로 확인) — https://uibowl.io/website/%EB%BF%8C%EB%A6%AC%EC%98%A4?patterns=%EB%82%B4%EC%97%AD&imgId=cmu1vvvsk0015jv04awfg9c12
[L8] 클로브 AI — 자금현황: 상단 숫자 타일 줄 + 아래 촘촘한 표, 표 머리 오른쪽에 보조 버튼들(데이터 화면형 관리자 레이아웃) — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=%EB%82%B4%EC%97%AD&imgId=cmw0i5f2y001hgw073xu2xyym
[L9] 피처링 — 인플루언서 랭킹: 위에 드롭다운 필터 줄, 아래 체크박스 첫 열 + 고정폭 숫자 열의 넓은 표(목록 → 일괄 선택) — https://uibowl.io/website/%ED%94%BC%EC%B2%98%EB%A7%81?patterns=%EB%9E%AD%ED%82%B9&imgId=cmuz1dyhk0015jp04m6zbhtsm
[L10] 세이브티커 — 프로필 수정 모달: 입력칸에 빨간 테두리 + 바로 아래 빨간 안내 문구, 확인 버튼은 비활성(오류가 풀려야 저장) — https://uibowl.io/website/%EC%84%B8%EC%9D%B4%EB%B8%8C%ED%8B%B0%EC%BB%A4?patterns=%EB%A7%88%EC%9D%B4%ED%8E%98%EC%9D%B4%EC%A7%80&imgId=cmvymet8n001rl508uctp9gxo
[L11] 와디즈 — 닉네임 수정 모달: 오류 문구 + 규칙 설명 캡션을 함께 두고 저장 버튼을 옅게 막음 — https://uibowl.io/website/%EC%99%80%EB%94%94%EC%A6%88?patterns=%EC%84%A4%EC%A0%95&imgId=cmwinzdz70022l308b2s9sr4y
[L12] 당근 비즈니스 — 설정: 항목을 그룹 제목 아래 행으로 묶고 각 행 오른쪽에 값/토글을 둔 설정 폼 — https://uibowl.io/website/%EB%8B%B9%EA%B7%BC%20%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4?patterns=%EC%84%A4%EC%A0%95
[L13] 채널톡 — 메인(상담 화면): 가운데 본문 + 오른쪽 패널에 접고 펴는 아코디언 섹션(세부 정보를 본문 옆에서 펼쳐 봄) — https://uibowl.io/website/%EC%B1%84%EB%84%90%ED%86%A1?patterns=%EB%A9%94%EC%9D%B8&imgId=cmudq3ztp000cl704tva1cnep

## 반영 포인트

- P1: 규칙 목록은 data-table 하나로 — 위에 필터(대학·전형·상태), 행마다 data-status-badge(초안 / 테스트 중 / 검수 완료)와 테스트 통과 수(예: 3/3), 작성자·검수자 열. 상태는 흑백 배지로 두고, 검수 완료만 design.md "완료·검수 완료 = 안정 색 쌍" 규칙을 쓸지 S2에서 하나로 정한다(data-status-badge는 흑백 규정이라 충돌 가능). [근거: L7, L8, L9]
- P2: 편집기는 6-4 규칙 요소를 그룹 제목(반영 학년·학기 / 반영 교과·과목 선택 / 등급·성취도 점수표 / 출결 감점표 / 만점·반올림) 아래 text-input 행으로 묶는 설정 폼. 점수표(석차등급 1~5, 성취도 A~E)는 작은 data-table 안에서 셀 편집. [근거: L12, L8]
- P3: 검증 오류는 text-input-error(2px 위험색 링 + 아래 캡션)로 그 칸 바로 아래에, "무엇이 틀렸고 어떻게 고치는지" 문장으로 쓴다. 오류가 남아 있거나 테스트 케이스가 3개 미만·불통과면 "검수 요청" button-primary를 끈다(비활성). [근거: L10, L11]
- P4: 변경 전·후 비교는 새 diff 컴포넌트를 만들지 않고 data-table로 — 행 = 규칙 요소, 열 = "현재 공개 버전 / 이번 수정안", 바뀐 값만 Bold(design.md "바뀐 값은 Bold" 규칙 재사용). 검수자는 이 표를 보고 승인/반려. [근거: L6, L1]
- P5: 승인 흐름은 "작성자 요청 → 검수자 확인 → 승인/반려". 검수자 화면 오른쪽 보조 패널(360px)에 테스트 케이스 결과(가상 학생 → 기대값 vs 계산값, 통과/불통과)를 trace-accordion으로 펼쳐 보이고, 승인·반려는 modal(반려 사유 text-input 필수)로 확정. 작성자 본인 계정에서는 승인 버튼을 숨겨 2인 검수를 화면에서 강제. [근거: L1, L5, L13]
- P6: 검수 대기 중인 규칙은 편집을 잠그고 "검수 대기 중이에요 · 검수 전에는 학생 화면에서 계산하지 않아요" 상태 줄을 둔다(NEVER-1을 화면 문구로 드러냄). 이 상태의 규칙은 배포 버전 선택 목록에 나오지 않게 한다. [근거: L4, L5]
- P7: 버전 기록은 오른쪽 보조 패널의 세로 목록(버전 이름 예: 2028-v3 · 날짜 · 작성자 · 검수자)으로, 본문 편집기는 그대로 두고 버전을 고르면 P4 비교 표로 열린다. 변경 로그(언제·누가·무엇)도 같은 목록에 쌓는다. [근거: L2, L3]

## 메모(S2로 넘김)

- design.md에 diff·버전 목록·승인 전용 컴포넌트는 없다. P4는 data-table, P7은 counsel-timeline 재사용 여부를 S2에서 결정하고, 새 컴포넌트가 필요하면 멈추고 "design.md 수정 제안".
- data-status-badge(흑백 규정) vs "검수 완료 = 안정 색 쌍" 규정이 겹친다 — S2에서 하나로 고르거나 수정 제안.
