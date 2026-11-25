# 2028학년도 대학입학전형 시행계획 수집

2026-11-20 확인. 앱의 대상 학년도(2028)에 맞춘 공식 자료 색인이다. 모든 대학의 최신 수정본이나 전형별 구조화 완료를 뜻하지 않는다. 전체 자료는 **검수 전 참고자료**이며 성적 판정, 수능최저 자동 계산, 지원자격 자동 판정에 사용하지 않는다.

## 범위

- 194개 대학명, 218개 대학·캠퍼스 항목. 같은 파일을 공유하더라도 캠퍼스는 별도 항목으로 유지한다.
- 어디가 대학 상세의 2028학년도 시행계획 개별 파일 202개: PDF 145개, HWP 30개, HWPX 4개, ZIP 23개. 공개 파일을 실제 내려받아 형식·해시를 기록했다.
- 개별 포털 목록에 없는 16개 캠퍼스는 2026-05-15 어디가 공식 모음집의 ZIP과 내부 파일명으로 연결한다. ZIP 안 PDF의 쪽수 링크를 만들지 않는다.
- 한림대·춘천교대·한국교원대·포항공대의 공식 입학처 PDF 4개를 추가 연결하고, 8개 전형의 일부 내용을 요약했다. 모집인원·전형방법·수능최저·지원자격과 PDF 근거 쪽수를 보존한다. 전체 모집단위와 예외를 구조화한 데이터는 아니다.
- 214개 항목에는 전형별 요약이 없으며 원문을 제공한다. 기존 입결의 대학·캠퍼스명 226개와는 집계 기준이 다르고, 모든 입결 대학과 일대일 대응하지 않는다. 전문대·특별법 대학 등의 전체 포괄 여부를 주장하지 않는다.

## 공식 출처

- [대입정보포털 어디가 자료실](https://www.adiga.kr/uct/ces/archiveView.do?menuId=PCUCTCES1000): 2028학년도 대학입학전형시행계획 모음집 4개 ZIP. 정확한 다운로드 주소·해시는 `collection/index.json` 참조.
- [어디가 대학 상세](https://www.adiga.kr/ucp/uvt/uni/univDetail.do?menuId=PCUVTINF2000&searchSyr=2028&unvCd=0000254): 각 대학의 상세 페이지와 시행계획 다운로드 주소는 `portal-plans.json`에 보존.
- [한림대 입학처 시행계획](https://admission.hallym.ac.kr/pdfView/admission/20/19/fileDownload.do)
- [춘천교대 시행계획 공지](https://www.cnue.ac.kr/enter/communication/plan.do?articleNo=41320&mode=view)
- [한국교원대 변경 공지](https://www.knue.ac.kr/ipsi/selectBbsNttView.do?bbsNo=276&key=1845&nttNo=82605)
- [포항공대 시행계획 공지](https://adm-u.postech.ac.kr/admission-helper/notices/?pi=794)

## 원문 확인 및 한계

PDF 쪽수 안내는 텍스트에 모집인원·지원자격·전형방법·수능최저·면접·일정·변경사항 단어가 등장하는 페이지 색인이다. 책자 인쇄 쪽수와 다를 수 있으며 특정 전형의 적용 여부를 뜻하지 않는다. PDF 뷰어에 따라 페이지 이동을 지원하지 않을 수 있다.

요약 표는 원문 텍스트와 렌더링 이미지(`review-images/`)로 대조했다. 국립순천대·이화여대는 추출 텍스트의 학년도가 깨져 표지 이미지에서 2028을 확인했다. 화성의과학대는 본문의 학년도 확인을 완료하지 못해 공식 포털의 2028 항목 연결이라는 근거만 기록하고 학생 화면에 별도 안내한다. HWP·HWPX·ZIP은 전형 내용을 추정하여 요약하지 않는다.

입학처의 변경 공지를 함께 연결하며 확인한 수정본은 앞에 표시한다. 수집일은 발행일·최종 개정일을 뜻하지 않는다. 한국교원대는 6월 변경 공지 첨부본을 사용한다. 웹사이트의 추후 교체를 감지하는 자동 동기화 기능은 없다.

앱에는 약 212KB의 출처·쪽수·요약 JSON만 배포한다. 내려받은 PDF/HWP/ZIP 원본과 전문 추출 텍스트는 앱 공개 폴더에 복제하지 않는다. 링크는 공식 제공처에서 열린다.

## 재현

원시 수집 결과는 `sources/`, 모음집은 `collection/`, 수작업 요약은 `curated.json`에 있다. `fetch_sources.py`는 HTTPS만 사용하고 시스템 인증서를 검증한다. `collect_portal.py`는 대학 코드 목록을 찾은 후 각 대학 상세의 **2028** 파일을 수집한다. 기존 학년도 목록은 대학 코드 탐색에만 사용하며 전형계획 학년도와 혼합하지 않는다.

저장된 근거로 공개 색인을 다시 만들기:

```powershell
python work/_data/admission-plans/build_catalog.py
cd app
npm.cmd test -- tests/admission-plans.test.tsx
npm.cmd run build
```

전형별 행(programs)까지 채우려면 `python app/tools/build_admission_plan_programs.py`를 실행한다. 이 스크립트가 `build_catalog.py`를 먼저 돌린 뒤, `structured/universities/*.json` 패키지의 전형명·유형·모집인원을 **같은 PDF의 근거 쪽수가 있을 때만** 붙인다. 전형방법은 전형요소 표(합 100%), 수능최저는 `data-integration/minimum-*-review.json`의 명시 분류에서만 읽고, 근거가 없으면 `원문 확인 필요`로 둔다. HWP·HWPX·ZIP 안 파일·http 주소 근거는 싣지 않는다. 수작업 요약(curated) 8개 항목은 그대로 둔다. 목록 기준일은 문서 확인일 중 가장 최근 날짜다.

`build_catalog.py`는 캠퍼스별 고유 ID, 원문 SHA-256, 확인일, 출처, 파일 형식, 근거 페이지를 출력한다. `coverage.json`에 모음집 연결 항목과 요약 수를 기록한다. 프런트엔드는 학년도·검수 상태·URL·중복 캠퍼스·쪽수 범위를 검사하여 잘못된 자료를 빈 검색 결과로 숨기지 않는다.
