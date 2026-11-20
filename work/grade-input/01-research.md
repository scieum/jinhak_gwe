# 01-research — 성적 입력 (grade-input)

- 대상: PRD 6-2 내 성적 입력(과목 유형별 입력 칸 자동 전환, 입력 검증 R-IN, 불러오기·내보내기)
- 화면 구성 기준: design.md Responsive Strategy "성적 입력" 행
  - 모바일: 학기 segmented-control → subject-card 목록 → 카드 누르면 bottom-sheet 편집기
  - PC: grade-input-table (키보드 이동, 엑셀 붙여넣기, 첫 열 고정)
  - 오류: text-input-error (2px judge-risk 링 + 아래 caption 안내 문구)
- 검색 (uibowl, 무료 등급 3건/회):
  1. search_ui_patterns "파일 업로드" (PC)
  2. search_components "바텀시트, 텍스트 필드" (MOBILE)
  3. search_components "텍스트 필드, 에러&실패" (MOBILE)
  4. search_components "테이블" + pattern "대시보드" (PC)
  5. search_components "텍스트 필드, 에러&실패" (PC)
  6. search_components "탭, 카드" + category "교육&도서" (MOBILE)
  - 0건: "입력 폼"+바텀시트, "입력 오류", "스프레드시트"(PC) — uibowl 어휘에 없음. 위 표현으로 바꿔 재검색.

## 레퍼런스

MOBILE

- [L1] 스티키 (MOBILE) — 문의 바텀시트: 손잡이 + 제목 + 닫기, 유형 선택 2열 칩, 라벨 위 회색 채움 입력칸 세로 나열, 필수 항목(*) 표시, 하단 전체 폭 버튼(입력 전 비활성) — https://uibowl.io/name/%EC%8A%A4%ED%8B%B0%ED%82%A4?patterns=%EB%AC%B8%EC%9D%98%ED%95%98%EA%B8%B0&imgId=cmv3bfqtc0003l5067a6rjwoy
- [L2] 오늘의 루틴 (MOBILE) — 기록 바텀시트: 날짜 캡션 + 빈 상태 문구 "아직 기록이 없어요" + 추가 링크, 하단 보조/주요 버튼 2개 나란히 — https://uibowl.io/name/%EC%98%A4%EB%8A%98%EC%9D%98%20%EB%A3%A8%ED%8B%B4?patterns=%EA%B8%80%EC%93%B0%EA%B8%B0&imgId=cmqj6y9oi000ijm04qiwqr388
- [L3] 렌트카 카모아 (MOBILE) — 예약자 정보 폼: 오류 칸만 붉은 테두리 + 바로 아래 붉은 안내 문구, 나머지 칸은 평상 상태 유지 — https://uibowl.io/name/%EB%A0%8C%ED%8A%B8%EC%B9%B4%20%EC%B9%B4%EB%AA%A8%EC%95%84?patterns=%EC%98%88%EC%95%BD%C2%B7%EA%B2%B0%EC%A0%9C&imgId=cmwirvz9t0030kx07dbowj73f
- [L4] 미니스탁 (MOBILE) — 숫자 입력: 칸 위 오류 문구 + 큰 숫자 + 단위 접미사("주", "달러"), 아래에 계산 요약 줄(라벨 왼쪽·값 오른쪽 정렬), 숫자 키패드 — https://uibowl.io/name/%EB%AF%B8%EB%8B%88%EC%8A%A4%ED%83%81?patterns=%EC%98%88%EC%95%BD%C2%B7%EA%B2%B0%EC%A0%9C&imgId=cmty2loa0004wl404xw4sr19r
- [L5] Bitget (MOBILE) — 이체: 선택 카드에 오류 링 + 아래 이유·해결 안내 문구, 오류가 남아 있으면 하단 확인 버튼 비활성 — https://uibowl.io/name/Bitget?patterns=%EA%B3%84%EC%A2%8C&imgId=cmukqafcx013mjr0458hlmd1e
- [L6] 세모 (MOBILE) — 등록한 문제 목록: 상단 탭에 상태별 개수 "전체(4) · 분류 완료(4) · 검토 필요(0)", 아래 카드 그리드, 하단 완료 버튼 — https://uibowl.io/name/%EC%84%B8%EB%AA%A8?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&imgId=cmrix2xl90009lc04imc82og2

PC

- [L7] 클로브 AI (PC) — 급여인사 대시보드: 차트 아래 항목별 표, 그룹 행(펼침 화살표) + 하위 행, 맨 아래 합계 행, 숫자 열 오른쪽 정렬, 회색 머리글 — https://uibowl.io/website/%ED%81%B4%EB%A1%9C%EB%B8%8C%20AI?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C&imgId=cmw0i5gaq001ejo08rb1us7nw
- [L8] 오프린트미 (PC) — 파일 업로드: 모달 안에 시작 방식 3가지(템플릿 사용 / 직접 만들기 / 내 파일 업로드)를 같은 크기 카드로 나란히 — https://uibowl.io/website/%EC%98%A4%ED%94%84%EB%A6%B0%ED%8A%B8%EB%AF%B8?patterns=%ED%8E%B8%EC%A7%91%C2%B7%EC%88%98%EC%A0%95%ED%95%98%EA%B8%B0&patternName=%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C
- [L9] Perplexity (PC) — 건강 파일 업로드: 업로드 시작 → 로딩·진행 표시 → 결과 단계로 이어지는 흐름 — https://uibowl.io/website/Perplexity%20(%ED%8D%BC%ED%94%8C%EB%A0%89%EC%8B%9C%ED%8B%B0)?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&patternName=%EA%B1%B4%EA%B0%95%20%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C
- [L10] 겟차 (PC) — 회원가입: 회색 채움 입력칸(평소 테두리 없음), 오류 칸 아래 작은 붉은 안내 문구, 조건 미충족 시 하단 버튼 비활성 — https://uibowl.io/website/%EA%B2%9F%EC%B0%A8?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmwa55ma60009jw07s0qao6nb
- [L11] 뿌리오 (PC) — 회원가입 정보입력: 여러 칸 오류를 동시에 표시(칸마다 아래 안내 문구), 수정해야 할 곳이 한 화면에서 모두 보임 — https://uibowl.io/website/%EB%BF%8C%EB%A6%AC%EC%98%A4?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmu1vvziw000cle04gmf8tkox

링크: MOBILE 6, PC 5, 합계 11

## 반영 포인트

- P1: 학기 segmented-control 아래 상태별 개수 표시(전체 n · 입력 완료 n · 확인 필요 n)를 두고, 확인 필요를 누르면 오류가 있는 subject-card만 보이게 한다. 확인 필요 0이면 다음 단계로 간다는 신호가 된다 (모바일) [근거: L6]
- P2: subject-card를 누르면 bottom-sheet 편집기를 연다. 위에서부터 손잡이 → 과목명 + 닫기 → 과목 유형 subject-type-chip(알약) → 유형에 맞는 입력 칸만 세로로(라벨 위, text-input 회색 채움) → 하단 button-primary "저장" 1개. 체육·예술·교양처럼 칸이 적은 유형은 시트 높이가 줄어든다 (모바일) [근거: L1, L2]
- P3: 원점수·과목평균·수강자수·분포비율 같은 숫자 칸은 숫자 키패드를 띄우고, 단위("점", "명", "%")를 칸 안 오른쪽에 접미사로 붙인다. 분포비율 A~E 묶음 아래에는 "합계 98.5%" 요약 줄을 고정폭 숫자로 두어 R-IN-002를 입력 중에 바로 보이게 한다 (모바일/PC) [근거: L4]
- P4: 오류는 text-input-error 그대로 칸 단위로 표시한다. 오류 칸만 2px judge-risk 링 + 바로 아래 caption 문구("분포비율 합이 98.5%예요. 100%가 되도록 확인해 주세요."), 나머지 칸은 평상 상태. 여러 칸 오류는 동시에 모두 보여 주고, 오류가 남아 있으면 저장 버튼을 비활성으로 둔다 (모바일/PC) [근거: L3, L5, L10, L11]
- P5: grade-input-table은 교과(군)을 그룹 행으로 묶고 그 아래 과목 행을 둔다. 맨 아래에 학기 평균 요약 행(위 1px hairline, 굵게)을 둔다. 머리글 canvas-soft, 숫자 열 오른쪽 정렬·고정폭, 첫 열(과목명) 고정 (PC) [근거: L7]
- P6: 불러오기는 modal 안에서 세 가지를 같은 크기로 나란히 고르게 한다: "템플릿 내려받기" / "엑셀·CSV 올리기" / "선생님이 보낸 파일(.jnavi) 열기". 올린 뒤에는 진행 표시 → 결과 요약("과목 24개를 불러왔어요 · 확인 필요 2개")을 거쳐 표로 돌아오고, 확인 필요 셀은 judge-risk-bg로 채운다 (PC, 모바일은 bottom-sheet) [근거: L8, L9]
- P7: 석차등급 미산출 과목(R-IN-001)은 등급 칸을 숨기지 않고 canvas-soft 빗금 + "미산출" 캡션으로 비활성 처리해, 칸이 왜 비었는지 알 수 있게 한다. 비활성 버튼과 같은 "누를 수 없음" 표현을 쓴다 (모바일/PC) [근거: L5, L10]

## 가져오지 않는 것 (design.md 충돌)

- 색이 칠해진 주요 버튼(파랑 L11, 청록 L4, 초록 L6 계열) → 주요 버튼은 항상 잉크 알약
- 각진 사각 선택 칩·카드형 선택지(L1, L5) → 누를 수 있는 요소는 알약({rounded.full})
- 그림자 있는 카드, 컬러 일러스트·사진 카드(L6, L8) → 그림자는 모달·바텀시트에만, 카드는 1px hairline-soft
- 평소에도 테두리가 있는 입력칸(L3, L11) → 테두리는 포커스(잉크)·오류(위험색)일 때만
- 다색 라인 차트(L7) → 성적 입력 화면에 차트를 두지 않고, 등급에 색을 넣지 않음
- 모든 문구에 합격 확률·합격 보장 표현을 쓰지 않음 (NEVER-2)

## v2 (2026-11-18): 생기부 PDF 자동 입력

- 요청 1 (사용자, 2026-11-18): 학교생활기록부 PDF(나이스 출력)를 넣으면 교과학습발달상황 표를 규칙(텍스트 추출·표 파싱)으로 읽어 성적 표(과목·유형·학점·원점수·과목평균·표준편차·성취도·성취도별 분포비율 A~E·수강자수·석차등급)를 채운다. AI 호출 없음(PRD 13장), 파일·성적은 기기 밖으로 나가지 않음(PRD 7장).
- 요청 2 (사용자, 2026-11-18): PDF 불러오기 결과 확인 화면과 성적 표 모두에서 학기별(1-1, 1-2, 2-1 …) / 학년별(1·2·3학년 묶음) / 전체 보기를 바꿀 수 있어야 한다. 학년·학기별 요약(학점 합, 평균 등급)과 PDF 한 파일에 여러 학년·학기 표가 들어 있는 경우도 포함.
- 검색 (uibowl, 무료 등급 3건/회, 12회):
  1. search_ui_patterns "신분증 촬영" (MOBILE) → L15
  2. search_ui_patterns "파일 업로드" (MOBILE) → L12, L13
  3. search_ui_patterns "불러오기" (MOBILE) → L14
  4. search_ui_patterns "영수증" (MOBILE) → L22
  5. search_components "에러&실패" + pattern "촬영하기" (MOBILE) → L16
  6. search_by_ocr_text "정보가 맞는지 확인" (MOBILE) → L17, L18, L19
  7. search_components "탭, 그래프&차트" + pattern "통계·리포트" (MOBILE) → L23
  8. search_components "테이블, 아코디언" (MOBILE) → L24
  9. search_by_ocr_text "파일을 끌어다" (PC) → L20
  10. search_by_ocr_text "기기에만 저장" (MOBILE) → L21
  - 0건: "연말정산"(패턴 어휘에 없음), "직접 입력하기"+에러&실패. 쓸 만한 결과 없음: "덮어쓰기"(Discord 알림 설정뿐), "스텝퍼"+신청하기(수량 스텝퍼라 진행 단계 표시와 다름).

### 레퍼런스 (v2)

MOBILE

- [L12] 틈틈잇 (MOBILE, 교육&도서) — 문제 파일 업로드 8장 흐름: 홈의 업로드 버튼 → 파일 선택 → 로딩·진행 표시 → 결과로 이어지는 교육 앱 업로드 흐름(대표 화면 1장만 확인, 나머지는 메타데이터 기준) — https://uibowl.io/name/%ED%8B%88%ED%8B%88%EC%9E%87?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&patternName=%EB%AC%B8%EC%A0%9C%20%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C
- [L13] 다글로 (MOBILE) — 파일 업로드: 올리기 전에 "파일 위치 안내" 모달을 띄워, 어디에 있는 파일을 올릴 수 있는지 설명하고 "다시 보지 않기"(보조) / "확인"(주요) 버튼 2개를 둠 — https://uibowl.io/name/%EB%8B%A4%EA%B8%80%EB%A1%9C?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&patternName=%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C
- [L14] 굿닥 (MOBILE) — 건강검진 불러오기: 큰 제목 "건강보험공단에서 건강검진 내역을 불러올게요" + 출처 → 앱 연결 그림 + 동의 항목 목록 + 하단 버튼(동의 전 비활성) → 이후 로딩 단계 — https://uibowl.io/name/%EA%B5%BF%EB%8B%A5?patterns=%EC%A1%B0%ED%9A%8C%ED%95%98%EA%B8%B0&imgId=cm5ufjjvn0017lb0c6dj4zwqy
- [L15] iM뱅크 (MOBILE) — 신분증 촬영: 촬영 영역 아래 실패를 줄이는 사전 안내 2개(아이콘 + "빛이 반사되지 않도록", "어두운 바닥에서"), "안내선 안에 맞추면 자동으로 촬영됩니다" + 상태 문구 "촬영중입니다." — https://uibowl.io/name/iM%EB%B1%85%ED%81%AC?patterns=%EC%B4%AC%EC%98%81%ED%95%98%EA%B8%B0&imgId=cmp0u2g2200f3ib04st3t67go
- [L16] 아이쿠카 (MOBILE) — 문제집 스캔 실패: 스캔한 원본 이미지를 뒤에 둔 채 모달 "일시적인 문제로 실패했어요. 다시 시도해 주세요." + 확인, 하단에 "다시 시도" / "확인" — https://uibowl.io/name/%EC%95%84%EC%9D%B4%EC%BF%A0%EC%B9%B4?patterns=%EC%B4%AC%EC%98%81%ED%95%98%EA%B8%B0&imgId=cmp0t6j63000fl904x800o216
- [L17] 한패스 (MOBILE) — 정보 확인: 제목 "고객님의 정보가 맞는지 확인해주세요." + 부제 "다르게 표시된 항목은 올바르게 수정해 주세요", 읽어 온 값을 고칠 수 있는 입력칸으로 보여 주고, 하단 "다음"은 확인 전 비활성 — https://uibowl.io/name/%ED%95%9C%ED%8C%A8%EC%8A%A4?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmq0n10b3001rky04hyseqog4
- [L18] 앳플리 (MOBILE) — 회원 정보 확인: 값마다 아래에 회색 안내 박스("실명이 맞는지 확인해 주세요.", "사용 중인 메일 주소가 맞는지 확인해 주세요."), 하단 주요 버튼 문구가 확인 행동 자체 "회원 정보가 정확해요" — https://uibowl.io/name/%EC%95%B3%ED%94%8C%EB%A6%AC?patterns=%EC%98%A8%EB%B3%B4%EB%94%A9&imgId=cmtpoku9j004akz04jpkm11r5
- [L19] 런드리고 (MOBILE) — 반영 전 확인 바텀시트: "배송 정보가 맞는지 한번 더 확인해주세요." + 반영될 값 요약 카드 + 주의 문구 + "배송지 변경"(보조) / "확인"(주요) 버튼 2개 — https://uibowl.io/name/%EB%9F%B0%EB%93%9C%EB%A6%AC%EA%B3%A0?patterns=%EC%98%88%EC%95%BD%C2%B7%EA%B2%B0%EC%A0%9C&imgId=cmq4vxyfn00shi604sn7jkxuk
- [L21] 카카오톡 (MOBILE) — 통화요약 결과: 결과 아래 회색 안내 목록 "통화 내용은 통화한 기기에만 저장되며, 나만 볼 수 있습니다", "결과는 정확하지 않을 수 있습니다" — 저장 위치와 정확도 한계를 결과 바로 옆에 둠 — https://uibowl.io/name/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%86%A1?patterns=AI&imgId=cmg0ha67n000slb042cqwuvad
- [L22] 빽다방 (MOBILE) — 전자영수증 내역: 기간 전환 "1개월 / 6개월 / 12개월"(선택한 것만 채움) 바로 아래 요약 줄 "총 2건 · 합계금액 12,500원", 그 아래 목록 — https://uibowl.io/name/%EB%B9%BD%EB%8B%A4%EB%B0%A9?patterns=%EB%82%B4%EC%97%AD&imgId=cmsqrp3tp0058ii048lqvk851
- [L23] Bitget (MOBILE) — 거래 퍼포먼스: 상단 탭 아래 기간 단위 전환 "7d / 30d / 90d / 180d", 같은 화면에서 단위만 바꿔 같은 지표를 다시 계산해 보여 줌 — https://uibowl.io/name/Bitget?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmukqayp3001fkw04lrynforx
- [L24] 겟차 (MOBILE) — 전기차 실거래가 표: 접고 펴는 그룹 머리("테슬라 19대 ^", 그룹 개수 표시) 아래 소그룹 머리 행("전기 | 62.1")마다 열 머리글 반복, 하위 행 나열 — https://uibowl.io/name/%EA%B2%9F%EC%B0%A8?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&imgId=cmwis14n5000bl5080q7k80uh

PC

- [L20] 브루 (PC) — PDF 파일 업로드 모달: 제목 "PDF 파일 업로드", 가운데 PDF 아이콘 + "파일을 끌어다 놓거나 …" 안내 + 형식·용량 제한 캡션 + "파일 불러오기" 버튼 1개 — https://uibowl.io/website/%EB%B8%8C%EB%A3%A8?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&imgId=cmpmiptjl001cle041d0fu01q

링크(v2): MOBILE 12, PC 1, 합계 13 (L12~L24)

### 반영 포인트 (v2)

- P8: 진입은 기존 불러오기 선택지(P6)에 "생기부 PDF 올리기"를 추가한다. PC는 modal 안 드롭존(가운데 PDF 아이콘 + "생기부 PDF를 끌어다 놓거나 파일을 고르세요" + 캡션 "나이스·정부24에서 내려받은 PDF만 읽을 수 있어요 · 사진·스캔본은 못 읽어요" + 버튼 1개), 모바일은 bottom-sheet에 파일 고르기 버튼만 둔다. 드롭존 위에 실패를 줄이는 안내를 미리 둔다(어떤 PDF를 어디서 받는지) (PC/모바일) [근거: L20, L13, L15]
- P9 (사용자 문구 수정 반영): 업로드·진행·결과 확인 화면에는 처리 방식 설명 배지를 두지 않는다. 진행 단계와 파일 상태를 표시하고, 결과 화면에는 "읽은 성적이 생기부와 맞는지 확인해 주세요. 다른 칸은 눌러서 고쳐 주세요."를 둔다 (PC/모바일). 처리 방식보다 학생이 할 일을 안내한다.
- P10: 개인정보·기기 저장 안내는 드롭존 바로 아래에 회색 caption 목록으로 항상 보이게 둔다: "파일은 이 기기 안에서만 읽어요 · 어디로도 보내지 않아요 · 성적 값만 저장하고 PDF는 저장하지 않아요"(정확한 문구는 PRD 7장에 맞춘다). 전송이 없으므로 굿닥식 동의 목록·연결 그림은 쓰지 않고, 제목만 "생기부에서 성적을 읽어 올게요"처럼 출처를 밝힌다 (PC/모바일) [근거: L21, L14]
- P11: 진행 표시는 단계 이름과 개수로 보여 준다: "파일 열기 → 표 찾기 → 값 읽기", 표 찾기 단계에서 "학기 표 6개 찾음 · 2학년 1학기 읽는 중 (4/6)". 진행 중에도 취소할 수 있다. 진행 표시 전용 컴포넌트가 design.md에 없으면 text + data-status-badge로 만들고, 그래도 안 되면 "design.md 수정 제안"을 한다 (PC/모바일) [근거: L12, L14, L15]
- P12: 자동으로 읽은 값은 성적에 바로 들어가지 않고 반드시 결과 확인 화면을 거친다. 제목 "읽은 성적이 생기부와 맞는지 확인해 주세요", 부제 "다른 칸은 눌러서 고쳐 주세요". 모든 칸은 text-input으로 고칠 수 있다. 맨 아래에 반영될 내용 요약("3개 학기 · 36과목 반영")과 주요 버튼 "확인했어요, 반영하기"를 두고, 확인 필요 칸이 남아 있으면 버튼을 비활성으로 둔다 (PC/모바일) [근거: L17, L18, L19]
- P13: 확인 필요 칸 표시: 규칙으로 확실히 읽지 못한 칸(빈 칸, 숫자 형식 이상, 분포비율 합 ≠ 100, 석차등급 1~9 밖, 줄바꿈으로 잘린 과목명, 성취도·등급 열이 섞인 행)은 text-input-error 방식(judge-risk 링 + 칸 아래 이유 caption, 예: "PDF에서 '8 4.5'로 읽혔어요. 원점수를 확인해 주세요")으로 표시한다. 상단에 v1 P1의 상태별 개수 "전체 n · 확인 필요 n"을 두고, 확인 필요를 누르면 그 칸만 모아 보여 준다 (PC/모바일) [근거: L18, L6, L3]
- P14: 원문과 나란히 보기: PC는 결과 확인 화면을 왼쪽 PDF 해당 페이지 미리보기(mask-preview로 이름·주민번호 등 가림) / 오른쪽 grade-input-table로 나눈다. 칸을 고르면 왼쪽에 원문 행 위치를 표시한다. 모바일은 칸 아래 "원문 보기"를 누르면 bottom-sheet에 해당 행을 PDF 그대로 보여 준다 (PC/모바일) [근거: L16, L17]
- P15: 한 PDF에 여러 학년·학기 표가 있으면 표를 학기 단위로 나눠 목록으로 먼저 보여 준다: "1-1 · 12과목 · 확인 필요 0 / 1-2 · 12과목 · 확인 필요 2 / …". 학기마다 반영할지 고를 수 있고, 이미 입력된 학기에는 "이미 입력됨" data-status-badge를 붙인다. PDF에 없는 학기(예: 3-2 미이수)는 empty-state 문구 "이 PDF에는 3학년 2학기 표가 없어요"로 비워 둔다 (PC/모바일) [근거: L24, L22, L6]
- P16: 보기 전환(요청 2): 결과 확인 화면과 성적 표 모두 상단 segmented-control "학기별 / 학년별 / 전체"로 묶음 단위를 바꾼다. 학기별은 기존 학기 선택(1-1 … 3-2)을 그대로 쓰고, 학년별은 1·2·3학년, 전체는 한 표에 모두 둔다. 단위를 바꿔도 같은 데이터를 다시 묶을 뿐 값은 그대로이고, 확인 필요 개수는 모든 보기에서 같은 자리에 둔다 (PC/모바일) [근거: L23, L22]
- P17: 학년·학기 요약: 묶음 단위 바로 아래 요약 줄에 고정폭 숫자로 "학점 합 28 · 평균 등급 2.41"을 둔다. 학년별 보기는 학년 그룹 머리 행(접고 펴기, "1학년 · 24과목") 아래 학기 소계 행 2개 + 학년 합계 행을 두고, 전체 보기는 학년 소계 3개 + 전체 합계 행을 둔다(v1 P5의 요약 행 스타일 그대로). 평균 등급은 PRD·규칙 파일에 검수된 산식(학점 가중 등)만 쓰고, 산식이 정해지지 않은 값은 표시하지 않는다(NEVER-1). 등급 숫자에 색을 넣지 않는다 (PC/모바일) [근거: L24, L22, L7]
- P18: 덮어쓰기 확인: 이미 값이 있는 학기에 반영하면 modal(PC) / bottom-sheet(모바일)로 "2-1학기에 입력한 11과목이 있어요. PDF에서 읽은 값으로 바꿀까요?" + 바뀌는 칸 수 요약("값이 다른 칸 4개")을 보여 주고, 버튼은 "그대로 두기"(보조) / "PDF 값으로 바꾸기"(주요) 2개, 학기마다 따로 묻는다. 반영 후 toast "3개 학기를 반영했어요 · 되돌리기"로 한 번 되돌릴 수 있게 한다 (PC/모바일) [근거: L19, L13]
- P19: 실패 처리와 직접 입력으로 돌아가기: 전체 실패(글자가 없는 스캔·사진 PDF, 암호 걸린 PDF, 생기부가 아닌 파일, 교과학습발달상황 표를 못 찾음)는 "일시적인 문제" 같은 막연한 문구를 쓰지 않고 원인별 문구 + 버튼 2개 "다른 파일 고르기" / "직접 입력하기"를 둔다. 일부 실패(일부 학기만 읽음)는 읽은 학기만 결과 확인으로 넘기고, 못 읽은 학기는 warning-callout "3-1 표를 읽지 못했어요. 직접 입력해 주세요" + 해당 학기 직접 입력 바로가기를 둔다. 실패해도 원본 파일 위에 안내를 띄워 무엇을 올렸는지 보이게 한다 (PC/모바일) [근거: L16, L15, L12]

### 가져오지 않는 것 (v2, design.md 충돌)

- 색이 칠해진 주요 버튼(파랑 L20, 초록 L16·L19, 주황 L18) → 주요 버튼 색은 design.md 그대로
- 2026-11-18부터 모서리 `radius` = [0] (harness-gates J2) → 레퍼런스의 둥근 모달·칩·버튼 모양은 가져오지 않음(v1 "알약" 표현도 S2에서 design.md 기준으로 다시 확인할 것)
- 컬러 일러스트·로고 연결 그림(L13, L14), 캐릭터(L12) → 넣지 않음
- 동의 체크 목록(L14) → 기기 밖으로 보내지 않으므로 동의 단계를 만들지 않음, 안내 문구로 대신함
- 차트(L23) → 기간 전환 방식만 가져오고 차트는 넣지 않음
- 막연한 실패 문구 "일시적인 문제로 실패했어요"(L16) → 원인별 문구로 바꿈
- 합격 확률·합격 보장으로 읽힐 표현을 쓰지 않음 (NEVER-2)
