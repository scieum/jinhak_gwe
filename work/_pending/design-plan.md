# 남은 시안 계획 (2026-11-18)

Figma 한도 때문에 지금은 계획만. 재개 시 한 번에 3~4개씩. 각 화면은 하네스 순서(S1 ✓ → G1 → S2 → G2 → S3 → G3 → 승인)를 따른다. 자세한 재개 지점: work/_pending/resume-notes.md.

## A. 그리다 만 시안 (설계 끝남 — S3만 남음)
| 순서 | 화면 | 남은 것 | 근거 |
|---|---|---|---|
| A1 | 5 to 9 | 전체 다시 그리기: 국수영사 4칸, chart-column 아이콘, v3.2 새 숫자(A-3 준비 중, B 교육청 실측표), **배치표형 팝업(기본 보기, 사용자 선택)** + 표 보기 | 02-spec v2~v3.3, 패치 6(placement-board) 필요 |
| A2 | 성적 입력 | PDF 상태 7개 + scrim·숨김 결함 수정 | 02-spec v2, resume-notes |
| A3 | 수시 입결 | 390 점 그래프 값, 1440, 상태 5개 | 02-spec, resume-notes(행 머리 넓히기 식) |
| A4 | 결과 집계 | 390, 1440-mock-score(→ 모의고사 수합), 드롭다운 결함 | 02-spec, resume-notes |
| A5 | 회원가입 | 390·1440 + 상태 3개(lab-stock 그대로, 소개 패널만 교체) | 02-spec, lab-stock 캡처 |
| A6 | 이름 변경 | "가채점" → "모의고사"(디자인 시스템 sidebar·sub-nav, 모든 화면 탭, 결과 집계 탭) | 패치 7 |

## B. 새 화면 (S1·G1 끝남 — S2부터)
| 순서 | 화면 slug | 위치(내비) | 핵심 | 필요한 design.md 추가 |
|---|---|---|---|---|
| B1 | calendar 입시 캘린더 | 학생: 수시 전략 › 입시 일정 (홈에 D-day 카드) / 교사: 수합·집계 › 고사 일정 | 한 달·목록 보기, 유형 글자 꼬리표(색 없음), 같은 날 고사 겹침 경고, D-day, .ics 내보내기, 검수 전 "날짜 미정 · 준비 중" | calendar-month, agenda-row, dday-card, event-type-tag + 소분류 |
| B2 | minimum-search 최저로 찾기 | 대학 찾기 › 최저로 찾기 (모의고사 화면에서 링크) | 기준 성적 선택 → 충족·근접·미충족·자료 부족 개수와 목록, 영역별 −/+ 한 번에 한 영역 what-if("충족 n개 → n+3개") | stepper(−/+) 또는 기존 조합, 소분류 |
| B3 | compare 전형 비교 | 대학 찾기 › 전형 비교 | 하트 담은 전형 2~4개, 모바일 2열 스와이프·PC 고정 열 표, 다른 점만 보기, 입결은 3년 값 + ▲▼만 | 토글(또는 filter-chip), 소분류 |
| B4 | interview-prep 면접 준비 | 수시 전략 › 생기부 AI 안 탭 또는 소분류 | AI 예상 질문 + 내 답 메모(기기 저장, AI 없음), "3/10 연습함", 한 장씩 연습, 말하기 타이머(기록 없음), 자동 저장 | 진행 막대, 연습 카드 |
| B5 | public-links 바로가기 | 홈(즐겨찾기 4개) + 더보기 | 상담 받기 / 원서 접수 / 경쟁률 보기 3묶음, 외부 표시(↗ + 캡션 + 처음 확인 시트), 링크만(숫자 옮기지 않음) | 외부 링크 카드, icon/external-link(있음) |

## C. 디자인 시스템 보강 (A·B 전에)
resume-notes와 ds-round2.md의 후보 중 화면이 막히는 것부터: tab-bar-pill 관리자 모드, app-bar 뒤로가기 끄기, susi-slot program FILL, univ-card 공개 목록/관리자 변형, counsel-timeline/item 칸, cut-dot-plot 12행·9점·selected, data-table 14행, toast 아이콘·두 줄, text-button, QR 표시, icon/eye·loader·clipboard·trending-up, step-indicator(정의 필요).

## D. design.md 패치 묶음 (사람 실행)
- 패치 6: placement-board (준비됨)
- 패치 7: 가채점 → 모의고사 (준비됨)
- 패치 8(만들 것): B1~B5 컴포넌트 정의 + 내비 소분류 추가(입시 일정·최저로 찾기·전형 비교·고사 일정) + 패치 5 후보 목록(검수 완료 배지, 관리자 탭바, 결과 값 흑백 등)

- 패치 8에 추가: Delta 규칙 "작년과 비교하는 화면에서만(대학 상세 전년 대비, 수시 입결 전년 대비 열, 전형 비교 입결 행) — 목록·카드에는 숫자만"(사용자 피드백 2026-11-18). admissions-list 02-spec의 ▲▼ 문장도 이에 맞게 정정 필요.

## 순서 제안
1. 패치 6·7 실행 → A1(5 to 9 배치표) — 사용자가 가장 기다리는 것
2. C 보강(막히는 것만) → A2~A6
3. 패치 8 → B1~B5 S2 → G2 → S3
