# 01-research — 생기부 AI (saenggibu-ai)

대상 화면: 생기부 AI 분석 (PRD 6-8, 9장 R-AI, 7-5 / design.md 생기부 AI 절, Responsive Strategy "생기부 AI" 행)
유저스토리: 학종 준비생이 생기부를 붙여넣어 역량 진단·근거 문장·면접 예상 질문을 받는다 (story-service 3).

화면 요건 요약
- 흐름: 영역별 붙여넣기 + 희망 계열·학과 → 개인정보 가림 확인(확인 체크해야 전송 버튼 켜짐, R-AI-001) → 결과
- 결과: 학업·진로·공동체 역량 5단계 + 한 줄 근거 / 역량별 근거 인용(원문 위치) / 학과 연계성 / 보완점 3~5 / 면접 예상 질문 10(근거 연결 + 질문 의도)
- 고지: "AI 진단은 참고용이며 실제 평가와 다를 수 있습니다", "생기부 내용을 바꾸라는 지시가 아닙니다"
- 모바일: 붙여넣기 → 가림 확인 → 결과(역량 카드 → 근거 인용 → 면접 질문) 단계형
- PC: 왼쪽 원문(가림 표시), 오른쪽 결과. 근거 인용을 누르면 원문 위치로 이동
- 쓸 컴포넌트: mask-preview, competency-card, evidence-quote, ai-label (+ text-input, button-primary, disclaimer-note)
- 금지: AI 결과에 판정 색, NEVER-2 표현(합격 가능성·보장으로 읽히는 말)

검색어: "AI 분석 결과"(0건) / "리포트"(교육&도서) / "AI 분석"(PC) / OCR "개인정보 동의"+체크박스 / "통계·리포트"+아코디언(PC) / 스텝퍼×AI / OCR "AI 참고용"(0건) → "참고용"×AI

## 레퍼런스

- [L1] 뤼튼 (MOBILE) — AI 레포트 작성 1단계: 상단에 "1. 과제 설명 / 2. 내용 선정 / 3. 구조 잡기" 단계 탭, 회색 채움 긴 텍스트 입력칸 + 글자 수 카운터(0/500), 필수 입력 전 하단 "다음" 버튼 비활성 — https://uibowl.io/name/%EB%A4%BC%ED%8A%BC?patterns=AI&imgId=cmam3vemk0003lh0e7rif5c56
- [L2] 라이프캐치 (MOBILE) — 바텀시트 동의: 굵은 제목 + "전체 동의" + 필수 항목 체크박스 목록, 모두 체크 전 하단 주요 버튼이 옅은 비활성 상태 — https://uibowl.io/name/%EB%9D%BC%EC%9D%B4%ED%94%84%EC%BA%90%EC%B9%98?patterns=%EA%B2%80%EC%83%89&imgId=cmqzaqkdh0005il0467y4vjx5
- [L3] 수퍼빈 (MOBILE) — 회원가입 1/4단계: 상단 숫자 점 스텝퍼(1·2·3·4) + 제목·설명 + 동의 체크 + 주요 버튼, 버튼 아래 회색 박스 "주의사항" — https://uibowl.io/name/%EC%88%98%ED%8D%BC%EB%B9%88?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmvop3rp6000wjq07e9qtmpbr
- [L4] 플랭 (MOBILE) — AI 레벨테스트 결과 리포트: 머리에 "AI REPORT" 배지 + 분석일자, 결과를 "라벨(작게) → 값(굵게)" 카드로 세로 나열, 하단 고정 확인 버튼 — https://uibowl.io/name/%ED%94%8C%EB%9E%AD?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EB%A0%88%EB%B2%A8%ED%85%8C%EC%8A%A4%ED%8A%B8%20%EA%B2%B0%EA%B3%BC%EB%A6%AC%ED%8F%AC%ED%8A%B8
- [L5] 해피문데이 (MOBILE) — AI 에이전트 답변: 답변 바로 아래 작은 회색 캡션 "모든 정보는 의학적 진단이 아닌 참고용입니다", 이어서 질문형 문장 알약 목록 — https://uibowl.io/name/%ED%95%B4%ED%94%BC%EB%AC%B8%EB%8D%B0%EC%9D%B4?patterns=AI&imgId=cmtwlect10011l904xa0wu3am
- [L6] 네이버페이 (MOBILE) — AI 브리핑: 본문 아래 회색 글머리 고지 묶음(생성형 AI 요약 참고 자료, 원문 확인 권장, 최종 판단 책임) — https://uibowl.io/name/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%8E%98%EC%9D%B4?patterns=AI&imgId=cmsx00zsi000hkz04elipsuer
- [L7] 토스증권 (MOBILE) — AI 실시간 이슈: 항목 카드마다 "n개 출처" 캡션, 목록 끝에 서비스명 + 참고용 고지 캡션 — https://uibowl.io/name/%ED%86%A0%EC%8A%A4%EC%A6%9D%EA%B6%8C?patterns=AI&imgId=cmruggywg00pmjv04qabb0pti
- [L8] 리스닝마인드.AI (PC) — AI 브랜드 인식 분석하기: 왼쪽 아이콘 레일 셸, 본문 위 "STEP 1/3" 캡션 + 굵은 질문형 제목 + 가는 리드문, 넓은 입력칸 하나 + 예시 칩 — https://uibowl.io/website/%EB%A6%AC%EC%8A%A4%EB%8B%9D%EB%A7%88%EC%9D%B8%EB%93%9C.AI?patterns=AI&patternName=%EB%B8%8C%EB%9E%9C%EB%93%9C%20%EC%9D%B8%EC%8B%9D%20%EB%B6%84%EC%84%9D%ED%95%98%EA%B8%B0
- [L9] Semrush (PC) — AI 분석: 왼쪽 사이드바 + 가운데 큰 제목·리드문·입력칸 하나로 시작, 이후 결과 화면은 탭·아코디언·표로 구성 — https://uibowl.io/website/Semrush?patterns=AI&patternName=AI%20%EB%B6%84%EC%84%9D
- [L10] 피처링 (PC) — 리포트(브랜드 점유율): 사이드바 + 리포트 본문, 지표 설명을 모달·툴팁으로 덧붙이고 세부를 아코디언·탭으로 접어 둠 — https://uibowl.io/website/%ED%94%BC%EC%B2%98%EB%A7%81?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EB%B8%8C%EB%9E%9C%EB%93%9C%20%EC%A0%90%EC%9C%A0%EC%9C%A8
- [L11] 레뷰 (REVU) (PC) — 캠페인 보고서: 머리에 제목 + 가로 진행 단계 막대, 그 아래 요약 숫자 카드 4개 가로 배치 → 차트 순서 — https://uibowl.io/website/%EB%A0%88%EB%B7%B0%20(REVU)?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EC%95%A0%EB%93%9C%EC%84%BC%ED%84%B0%EC%BA%A0%ED%8E%98%EC%9D%B8%EB%B3%B4%EA%B3%A0%EC%84%9C

## 반영 포인트

- P1: 3단계 흐름(붙여넣기 → 가림 확인 → 결과)을 화면 위에 "단계 n/3" 표시로 고정해 지금 어디인지 보여준다. 모바일은 상단 단계 표시 + 한 화면 한 단계, PC는 본문 위 캡션 "STEP n/3" + 굵은 제목 + 가는 리드문(700/300 대비). design.md에 스테퍼 컴포넌트가 없으므로 S2에서 caption 텍스트 또는 segmented-control 모양으로만 표현한다 (모바일/PC) [근거: L1, L3, L8, L11]
- P2: 붙여넣기 단계는 영역별(교과 세특, 창체 자율·동아리·진로, 행동특성) text-input을 세로로 두고 각 칸에 글자 수 카운터를 붙인다. 필수 칸이 비어 있으면 button-primary를 비활성으로 둔다. PC는 입력칸을 넓게 하나씩, 본문 폭 720px 안에서 (모바일/PC) [근거: L1, L8, L9]
- P3: 가림 확인은 "확인해야 켜지는 버튼" 패턴을 그대로 쓴다. mask-preview 하단에 체크박스 "가린 내용을 확인했어요" 하나를 두고, 체크 전 주요 버튼은 text-faint 비활성. 버튼 아래에 회색 안내 박스로 "가린 뒤의 텍스트만 전송되고 서버에 저장되지 않아요"를 둔다. 모바일은 한 화면 단계, PC는 왼쪽 원문(가림 블록) + 오른쪽 확인 패널 (모바일/PC) [근거: L2, L3]
- P4: 결과 머리는 ai-label("AI 분석 · 참고용") + 분석일자 캡션, 그 아래 competency-card 3장을 "역량 이름 → 5단계 점 → 한 줄 근거" 순으로 세로 나열한다. L4의 초록 배지·색 아이콘은 가져오지 않고 흑백 알약으로 바꾼다(AI 결과 판정 색 금지). PC는 오른쪽 결과 열에서 같은 순서 (모바일/PC) [근거: L4, L11]
- P5: 근거 인용(evidence-quote)마다 출처 캡션("2학년 화학Ⅰ 세특")을 붙여 어디서 왔는지 바로 보이게 한다. 모바일은 역량 카드 아래 인용 목록, PC는 인용을 누르면 왼쪽 원문 해당 문장으로 스크롤 + accent-soft 잠깐 칠함(design.md 규칙, 레퍼런스에 분할 화면 사례는 없음) (모바일/PC) [근거: L7]
- P6: 참고용 고지는 두 곳에 둔다. AI 블록 바로 아래 작은 회색 캡션 한 줄 + 결과 맨 끝 disclaimer-note 묶음("AI 진단은 참고용이며 실제 평가와 다를 수 있어요", "생기부 내용을 바꾸라는 지시가 아니에요"). caption + text-muted, 색 없음 (모바일/PC) [근거: L5, L6, L7]
- P7: 면접 예상 질문 10개와 보완점은 길어지므로 접어 둔다. 질문 문장을 행 제목으로, 펼치면 "질문 의도" + 연결된 근거 인용. 모바일은 아코디언 행(rounded.sm, canvas-soft), PC는 오른쪽 결과 열 안 아코디언/탭 (모바일/PC) [근거: L5, L9, L10]

## 가져오지 않을 것

- L4 초록 배지, L7 상승·하락 빨강/파랑 화살표, L1·L2 브랜드 블루·민트 버튼 → 흑백 + 잉크 알약 버튼만 (design.md Colors, AI 결과 판정 색 금지)
- 점수·등급 그래프, 레벨 수치를 크게 강조하는 리포트 연출(L4, L11 숫자 카드) → 역량은 5단계 점과 한 줄 근거만. 결과를 평가 결과처럼 읽히게 하지 않는다 (NEVER-2)
- 캐릭터 일러스트, 그림자 카드
