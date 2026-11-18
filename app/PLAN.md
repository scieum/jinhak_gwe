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
