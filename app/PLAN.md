# 진학 내비 개발 계획 (2026-11-18 시작)

기준: docs/prd.md(10장 세로 슬라이스, 9장 R-CONV·R-JDG·R-PRIV·R-AI 규칙, 13장 스택), docs/design.md(토큰·컴포넌트), Figma `전체 시안` 페이지(파일 AqkVdYZ4hvPYuAlewoBs4W), work/<slug>/02-spec.md(화면 설계), work/design-system.json(컴포넌트 이름·속성).

## 스택 (PRD 13장 기본값)
- React + Vite + TypeScript, PWA(나중에 vite-plugin-pwa)
- 학생 데이터: IndexedDB(Dexie), 서버 전송 없음
- 교사·관리자: Supabase 계정(lab-stock 방식 로그인), 학급 데이터 서버 저장(RLS) — 슬라이스 5
- 엑셀 SheetJS, QR 라이브러리, 생기부 PDF = pdf.js 텍스트 추출 + 규칙 파싱(AI 없음)
- 테스트: Vitest

## 폴더
```
app/
  src/
    engine/        계산 엔진(순수 함수, UI 없음) — R-CONV 5→9, 대학별 환산, R-JDG 판정. 대학 이름 분기 금지(PRD 14장)
    data/          규칙·대응표·전형 데이터(JSON) + 스키마. 검수 상태(review_status)·license_status 필드 필수
    styles/        tokens.css(design.md 토큰 → CSS 변수, 모서리 0), base.css
    components/    design.md 컴포넌트와 같은 이름(button-primary → ButtonPrimary …)
    shell/         App Shell: 사이드바(대분류-소분류), 하단 탭바, sub-nav, breadcrumb
    screens/       화면(slug와 같은 이름)
    store/         Dexie DB
  tests/ 또는 *.test.ts
```

## 원칙(코드에서 지킬 것)
- NEVER-1: review_status != verified 인 규칙·표는 계산하지 않고 "준비 중"을 돌려준다(엔진 레벨에서).
- NEVER-2: 화면 문구 금지어(rules/design-rules.json forbidden_words) — 테스트로 검사.
- 모든 환산 결과는 산출 근거(trace) 배열을 함께 돌려준다(R-CONV-007, trace-accordion).
- 대학별 분기 코드 금지 — 규칙 데이터로만.
- 학생 데이터는 기기 밖으로 안 나감(R-PRIV-001).

## 단계
1. **D1 기초**: Vite 프로젝트, tokens.css, 폰트(Pretendard → 없으면 IBM Plex Sans KR), App Shell 3종(학생/교사/관리자 내비), 라우팅(화면 slug), 빈 화면 자리. ✅ 진행
2. **D2 엔진**: 5→9(A-1, A-2+수강자수 보정 R-CONV-010, A-3 분포비율 보정 R-CONV-011(검수 전 off), B 배치표 R-CONV-009), 신뢰도 R-CONV-008, 결과 {a1,a2,a3?,b?,min,max,confidence,trace}. 대학별 환산 엔진(규칙 JSON), 교과 판정 R-JDG. 단위 테스트(PRD 예시 숫자로 검산).
3. **D3 슬라이스 1 화면**: 성적 입력(표·과목 유형별 칸) → 5 to 9 → 대학별 환산 → 될각(교과). Dexie 저장.
4. 슬라이스 2~7(PRD 10장 순서) — 시안이 끝난 화면부터.

## 아직 시안이 없는 화면
work/_pending/design-plan.md(조사 후 작성) 참고. 시안 전에는 개발하지 않고 엔진·데이터만 준비.

## 개발 재개 기록 (2026-11-18)

- D1: 빠졌던 Vite·TypeScript·Vitest·React 타입·Testing Library·jsdom을 devDependencies/lockfile에 등록. `npm ci`로 개발 환경 재현 가능.
- D2 1차 구현: `src/engine/conversion.ts`에 검수 게이트, A-1, 학점 가중 A-2, 수강자수 누적 인원 반올림 후보식, 고정분할 A-3(분포비율 합계 검증·등급 구간 제한), B 보간·교과 범위/학기 선택, 범위·신뢰도·trace 추가.
- `src/engine/judgment.ts`: 불리한 쪽 값 기준 교과 판정, 유리한 쪽 경계 표시, 입결/규칙 미검수 차단.
- 신뢰도 수치 기준은 PRD에 확정값이 없어 호출자가 검수된 정책을 제공해야 함. 테스트 정책은 테스트에만 존재.
- **공개 활성화 아님**: 배포 규칙은 모두 draft. 수강자수 보정은 시행지침 원문의 반올림/동석차 대조 필요. A-3는 익명 표본 검증 필요. 단위 테스트 통과가 내용 검수를 대신하지 않음.
- B: 부산 2025 1학기 일부 대응점 3개만 조사 문서에서 옮겨 후보 등록. 교과 구성·원표·이용 조건 미확인, license_status=unknown. 다른 교과 조합에 재사용하거나 범위 밖 외삽하지 않음.
- 원문 다운로드는 환경 네트워크 프록시 403으로 차단됨. `www.pen.go.kr`, `www.kyobit.com` 접근 허용 초안 저장. 적용 후 원문 확인·전체 표 등록 재개.
- 다음 구현: 대학별 ScoringRule/출결 엔진, 검수된 정책·데이터 준비, D3 성적 입력/기기 저장/화면 연결. 현 단계는 엔진 API이며 화면은 기존 상태.
