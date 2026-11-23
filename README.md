# U:NAVI

학생용 성적 입력·진학 자료 조회·지원 준비와 교사용 학급 상담을 지원하는 웹 앱입니다.

## 로컬 실행

Node.js 24 환경에서 저장소를 내려받은 뒤 실행합니다.

```powershell
cd app
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

- 전형계획: http://127.0.0.1:5173/admissions-list
- 수집 입결: http://127.0.0.1:5173/admission-results
- 학생 홈: http://127.0.0.1:5173/home

macOS/Linux에서는 `npm.cmd` 대신 `npm`을 사용합니다. 전형계획과 수집 입결 조회는 별도 환경변수 없이 실행됩니다. 교사 계정·서버 기능을 사용하는 경우 `app/.env.example`을 참고해 개인 환경변수를 설정합니다.

## 검증과 데이터

```powershell
cd app
npm.cmd test -- --maxWorkers=2
npm.cmd run build
```

테스트는 개인 `.env.local`의 외부 서비스 설정과 분리됩니다. 실행용 데이터는 `app/public/data/`에 포함되어 있습니다. 검수 전 입결·전형계획은 참고 조회용이며 성적 판정에 사용하지 않습니다.

수집 원본 PDF/HWP/ZIP·중간 백업·개인 설정은 Git에서 제외하고 로컬에 보관합니다. 입결 검증용 압축 CSV와 전형계획 출처·해시 메타데이터는 포함합니다. 원문 파일까지 보유한 환경에서는 전형계획의 실제 파일 해시 검사도 실행됩니다.

- [앱 구현·실행 안내](app/README.md)
- [전형계획 출처와 수집 범위](work/_data/admission-plans/README.md)
- [구현 기록](app/IMPLEMENTATION.md)
