# 화면 구현 인수 기록 — 2026-11-24

사용자가 다른 세션의 화면 구현을 이어받도록 지정했다. 기존 변경 중 성적 추이(score-trend)를 우선 보완했고, 교사 화면 및 비교 화면 회귀 테스트를 정리했다. 기존 데이터 통합 및 다른 화면의 변경은 보존했다.

## 이번 작업

- `ScoreTrendContent.tsx`: 원점수 펼침에 한국사·통합사회·통합과학을 포함하며 0점도 보존한다. 최신 시험에서 선택 영역이 비었으면 이전 등급을 최신값으로 표시하지 않는다. 최저 판정 기준 시험 선택에서 탐구만 입력된 최신 시험을 건너뛰지 않는다.
- `score-trend.css`: 모바일 요약 줄바꿈, 판정된 목표 대학 행 높이, PC 요약 숫자의 시안 치수를 맞췄다.
- `mock-trend.test.tsx`, `score-trend.test.tsx`: 삭제된 MockTrend 대신 현재 화면을 검증한다. 빈 기록, 미검수 자료, 등급 범위, 끊긴 추이, 원점수 보존, 목표 대학 선택·취소·저장 및 포커스 복귀를 확인한다.
- `teacher.test.tsx`: 현재 학생 이름 및 성적 표시와 상담 필요 필터를 검증한다.
- `interest-comparison.test.tsx`: 샘플 원문 로딩을 기다린 다음 모집인원을 검증하도록 타이밍 오류를 수정했다.

## 검증

- `npm test -- --maxWorkers=2 --reporter=dot`: 70개 파일, 579개 테스트 통과.
- `npm run build`: 통과. 기존 500 kB 번들 크기 경고가 남는다.
- `git diff --check`: 통과.
- G5 score-trend: **실패**, 문구·구조·간격·아이콘 검사는 통과했고 시각 차이 3곳이 남았다. 모바일 SSIM 0.9584, PC 0.9817. 예외를 추가하거나 통과 결과를 만들지 않았다.
- 로그: `implementation-resume-full-tests.log`, `implementation-resume-build.log`, `score-trend-resume-gate.log`.

## 후속 개발 (같은 날짜)

사용자가 상단 오른쪽 배치 제안에 이어 “개발 작업도 ㄱㄱ”라고 하여 제안한 배치로 진행했다.

- 모바일 `appbar-actions` 슬롯에 ‘목표 대학’ 버튼을 연결했다. PC 전환이나 화면 이탈 시 슬롯에서 제거된다.
- 목표 대학 순위를 변경·취소 확인·저장하고 다시 방문하면 저장된 순위를 복원한다.
- 빈 저장 순위에는 실제 첫 전형을 기본 선택하여, 선택은 보이지만 저장이 비활성화되는 문제를 수정했다.
- localStorage 저장 실패 시 “이 화면에만 적용했어요. 기기 저장소에 저장하지 못했어요.”로 알린다.
- 후속 변경 대상 테스트 15개 통과, 프로덕션 빌드 종료코드 0. 이전 전체 테스트 579개 통과 이후 추가한 테스트는 이번 대상 검사에 포함했다.
- Playwright 실제 브라우저: 390px 헤더 위치·수정·취소 확인·저장·포커스 복귀·재접속 복원, 320px 가로 넘침 없음, 1440px 모바일 버튼 제거 및 PC 버튼 동작을 확인했다.
- 검증 스크립트: `score_trend_development_smoke.py`; 화면: `score-trend-mobile-developed.png`, `score-trend-mobile-picker.png`.
- 최신 G5는 **실패**, 시각 차이 4곳(상단 오른쪽 새 버튼 1곳 + 기존 모바일 로고 2곳 + PC 큰 글자 1곳). 문구·구조·간격·아이콘 오류는 없다. 모바일 SSIM 0.9545, PC 0.9817. 로그: `score-trend-development-gate.log`, `score-trend-development-build.log`.

## 남은 시안 차이

1. 모바일 Figma `346:277668`: `목표 대학` 텍스트 `I346:277669;77:1566;28:14`가 x36/y16.5에 있고, brand-logo `954:379016`은 x20/y19.13에 있어 겹친다. 앱에서는 제안한 상단 오른쪽 배치로 개발했다. Figma 원본은 변경하지 않았다.
2. PC Figma `346:277682`: 큰 `2.5등급`의 ‘등’ 부근에 시각 차이(x352/y144, 32×32)가 남는다. 폰트 지정은 IBM Plex Sans KR Bold 44/57.2로 같다. 정확한 래스터 차이 원인은 확정하지 않았다.
3. G5 실패이므로 화면 구현 완료로 보고하지 않는다.

## 실행 환경 주의

Playwright Chromium headless shell을 `work/_cache/playwright`에 설치했다. G5 실행 시 `PLAYWRIGHT_BROWSERS_PATH`를 해당 절대 경로로 설정한다. 브라우저에서 외부 웹폰트를 읽어야 하므로 네트워크가 허용된 실행이 필요하다. 제한된 실행에서는 대체 폰트 때문에 많은 허위 시각 차이가 발생했다. 공식 브라우저 설치에는 `NODE_OPTIONS=--use-system-ca`를 사용했고 인증서 검증은 끄지 않았다.

Figma 파일: https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-277668
