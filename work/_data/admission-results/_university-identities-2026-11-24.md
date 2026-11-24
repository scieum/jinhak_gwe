# 국공립대 통합·교명 변경 조사 및 입결 반영 — 2026-11-24

국공립 일반대·교육대 **38개교**를 현행 명단과 대조하고, 최근 입결의 대학 식별에 관련된 1990년 이후 통합·교명 변경을 조사했다. **시행된 통합 22건, 교명 변경 17건, 승인된 향후 통합 1건, 미시행 추진안 4건**을 공통 명칭표에 기록했다. 기존 수집본의 **대학명 7,306행, 이력만 532행**을 정리했다. 기준일은 한국 시간 2026-11-24다.

이 조사는 대학의 현재 명칭과 과거 자료의 연결을 위한 것이다. 전체 대학·학과·전형의 입결 수집 완료를 뜻하지 않는다. 자료 상태는 계속 **draft**이며, 성적 판정용 승인 자료로 승격하지 않았다.

## 범위와 근거

- [국립학교 설치령 현행 별표](https://www.law.go.kr/LSW/flDownload.do?bylClsCd=110201&flSeq=161877141&gubun=)의 일반대 24개·교육대 10개에 한국교원대, 국립대학법인 서울대·인천대, 공립 서울시립대를 더한 **38개교를 빠짐없이 대조**했다. 아래 대학별 표와 [CSV](university-identity-review/national-roster-survey.csv)에 점검 결과를 남겼다.
- 시행일은 [국립학교 설치령 개정이유·연혁](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801), 교육부 발표, 대학 공식 연혁·모집요강을 대조했다. KAIST–ICU와 국립의료원간호대학–성신여대의 관련 승계 사례도 포함했다.
- 1990년 이전 설립·승격·학제 개편 전체, 모든 사립·전문대 통합 및 특별법 기관 전체의 연혁을 전수조사했다는 의미는 아니다. 미시행 4건 역시 전국의 모든 협의안을 망라한 목록은 아니다.
- 승인일·시행일·입시자료 모집 명칭을 구분한다. 강릉대–원주대학 통합은 2007년, 강릉원주대 개칭은 2009년, 강원대 통합은 2026년이다. 재학생 경과조치도 별도로 있으므로 과거 소속을 지우지 않는다.

## 데이터 반영

| 항목 | 행 수 |
|---|---:|
| 적용 전 | 132,621 |
| 적용 후 4년제 입결 | 132,605 |
| 전문학사 과정 별도 보존 | 16 |
| 4년제 대학명 변경 | 7,306 |
| 이름은 같고 이력만 보완 | 532 |
| 강원대학교(강릉) | 624 |
| 강원대학교(원주) | 205 |
| 국립경국대학교(예천), 확인된 2026 모집단위 | 12 |
| 국립목포대학교(담양), 확인된 2026 학사 모집단위 | 21 |

강릉원주대 **829행**은 강릉·원주를 서로 다른 캠퍼스로 유지했다. 2024·2025학년도는 통합 전 대학 자료라는 설명을 남겼다. 춘천·삼척·도계 자료와 합산하지 않는다. 2026년 강원대·목포대·창원대 통합은 [교육부 발표](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105413&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W)와 [개정령](https://www.law.go.kr/lsInfoP.do?lsiSeq=283491&viewCls=lsRvsDocInfoR)을 확인했다.

경국대 예천은 [2026 모집요강 PDF 15쪽](https://ipsi.gknu.ac.kr/data/mojib/20250529165017683811b9384be.pdf)의 공공수요인재대학 및 5개 학과만 정확한 명칭으로 연결했다. 2027년 변경 학과명을 2026 결과에 소급하지 않았다. 기존 설명의 `2024·2025 결과 당시 모두 안동대`라는 표현을 2025-03-01 출범일과 원문 모집 명칭을 구분하도록 고쳤다.

목포대 담양은 [2026 모집요강 PDF 4~5쪽](https://ipsi.mokpo.ac.kr/sites/ipsi/atchmnfl/pdfView/6/temp_1750313756781100.pdf)으로 확인했다. 스마트모빌리티학부·예술크리에이티브학부의 학사 입결 21행은 통합본에 유지했다. 농수산식품학부·스마트해양·에너지학부·외식조리제빵과·토목환경과(야)의 **전문학사 16행**은 [_excluded-degree.csv](_excluded-degree.csv)에 보존했다. 입학처 결과 6행은 원문 `미래챌린지대학(전문학사-2년제)` 표시와도 일치한다. 같은 학년도·모집단위의 어디가 보완 10행을 함께 분리했으며, 대학별 원본 CSV에서는 삭제하지 않았다.

학년도별 4년제 행 수는 **2024년 43,297 / 2025년 42,786 / 2026년 46,522**다. 출처별 행 수이며 고유 전형 수가 아니다.

## 앱과 재현

- [공통 명칭표](../../../app/src/data/universityIdentities.json)는 사건·시행일·상태·공식 출처·검색 별칭을 포함한다. 생성 원본은 [build_university_identities.py](build_university_identities.py)다.
- [university_identity.py](university_identity.py)를 `merge.py`에 연결했다. 대학별 원본 CSV를 유지하고 통합본의 `university`·`note`만 바꾼다. 과거 대학명과 이력은 `note`에 남긴다.
- 수집 자료, 대학별 그래프, 전국 입결, 전형계획의 대학명 검색에 별칭을 연결했다. `강릉원주대` 검색은 강릉·원주 결과를 찾는다. 캠퍼스가 지정된 옛 링크와 저장한 관심 항목은 같은 캠퍼스 자료를 읽으며 저장 기록을 유지한다.
- 캠퍼스 없는 옛 이름을 하나의 캠퍼스로 자동 결정하지 않는다. 학과·전형 승계, 수치 환산, 통합 전후 합격선 합산을 하지 않는다. 전형계획의 `제2캠퍼스` 같은 코드도 근거 없이 재해석하지 않는다.
- `_all.csv.gz`, 대학별 수집 패키지, 전국 입결 연도별 색인을 갱신했다. 외부 배포와 승인 상태 변경은 하지 않았다.

명칭표 생성은 `python work/_data/admission-results/build_university_identities.py`, 통합본 생성은 `python work/_data/admission-results/merge.py`로 한다. 이번 변경의 고정 기준본 대조는 [apply_university_identities.py](apply_university_identities.py)로 재현한다. 이 감사 스크립트는 적용 전 132,621행의 백업을 요구한다. 이후 다른 수집 작업으로 기준본이 바뀌면 별도 검토해야 한다. 이전 재수집 최종화 스크립트의 해시는 명칭 적용 전 스냅샷을 가리키므로 현재 통합본에 그대로 재실행하지 않는다.

## 검증

- 적용 전 132,621행과 적용 후 132,605행 + 별도 보존 16행을 전수 대조했다. 대학명·비고를 제외한 **18개 열의 값과 개수는 모두 동일**하다. 학년도·성적·모집인원·출처 URL·쪽수를 보존했다.
- 완전 동일 행 중복 없음, 정규화 재실행 시 결과 동일 확인. [행별 변경표](university-identity-review/row-changes.csv), [감사 결과](university-identity-review/audit.json).
- Python 명칭·캠퍼스 검증 3개, 앱 관련 9개 테스트 파일 56개 통과. 수집 자료, 그래프, 전국 입결, 전형계획, 옛 교명 링크·검색·관심 비교를 포함한다.
- TypeScript 및 프로덕션 빌드 통과. 원본 패키지와 빌드 산출물의 배포 데이터 검사 통과(132,605행·229개 대학/캠퍼스 표시명·3개 학년도). Vite의 큰 청크 경고는 남아 있다.
- 적용 후 CSV SHA-256: `f61b952786621dca9732aea6e03ce9229e33d75fcc9a49cc69875b79821e2863`.

## 남은 공백

- 창원대 거창·남해 승계는 명칭표에 반영했다. [공식 2026 캠퍼스별 모집요강 안내](https://www.changwon.ac.kr/ipsi/na/ntt/selectNttInfo.do?mi=4245&nttSn=1370128)로 캠퍼스를 확인했지만, 기존 수집 행의 캠퍼스·학위과정이 입증되지 않는 부분은 새 캠퍼스 자료처럼 복제하지 않았다. 거창·남해 세부 입결 수집 완료를 뜻하지 않는다.
- 경국대 예천 확인 12행 외 미표기 자료, 한경국립대 캠퍼스 미표기 218행 등은 임의로 안동·안성에 넣지 않았다. 확인된 한경국립대 안성 266행·평택 72행 구분은 유지했다.
- 목포대 음악공연기획학부는 일부 전공만 담양에 해당한다. 학부 결과를 전부 담양으로 옮기지 않았다.
- 대학 리스트 대조에서 정정: 한국체육대는 `한국체대`라는 원본명으로 **925행** 수록되어 있다. 이전 0행 표기는 약칭 대조 누락으로 잘못 집계한 것이며, 입결 미수집이 아니다.
- 부산대–부산교대는 2027-03-01 예정이므로 기준일 현재 별도 대학이다. 충북대–한국교통대, 목포대–순천대, 충남대 관련 추진안도 시행 완료로 처리하지 않았다.
- 기존 [입결 수집 공백·원문 불일치](_recollection-2026-11-24.md)는 별도 과제로 남는다.


## 사건 목록 44건

연속 통합은 최종 승계 대학을 함께 기록한다. 현재 대학명 변경과 과거 당시의 교명이 항상 같다는 뜻은 아니다. 각 사건의 시행일과 상세 이력은 공통 명칭표를 따른다.

### 시행된 통합 22건

| 시행일 | 이전 대학 | 변경·승계 명칭 | 근거 |
|---|---|---|---|
| 1992-03-01 | 공주대학교 + 예산농업전문대학 | 국립공주대학교 | [공식 자료](https://education.kongju.ac.kr/bbs/ZA0330/1141/632870/download.do) |
| 1996-07-06 | 부산수산대학교 + 부산공업대학교 | 국립부경대학교 | [공식 자료](https://www.pknu.ac.kr/main/219) |
| 2001-03-02 | 공주대학교 + 공주문화대학 | 국립공주대학교 | [공식 자료](https://education.kongju.ac.kr/bbs/ZA0330/1141/632870/download.do) |
| 2005-03-01 | 공주대학교 + 천안공업대학 | 국립공주대학교 | [공식 자료](https://education.kongju.ac.kr/bbs/ZA0330/1141/632870/download.do) |
| 2006-03-01 | 부산대학교 + 밀양대학교 | 부산대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2006-03-01 | 전남대학교 + 여수대학교 | 전남대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2006-03-01 | 강원대학교 + 삼척대학교 | 강원대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2006-03-01 | 충주대학교 + 청주과학대학 | 국립한국교통대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2007-03-01 | 강릉대학교 + 원주대학 | 강원대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2007-03-01 | 성신여자대학교 + 국립의료원간호대학 | 성신여자대학교 | [공식 자료](https://www.sungshin.ac.kr/nursing/14804/subview.do) |
| 2008-03-01 | 경북대학교 + 상주대학교 | 경북대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2008-03-01 | 전북대학교 + 익산대학 | 전북대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2008-03-01 | 제주대학교 + 제주교육대학교 | 제주대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2009-03-01 | 한국과학기술원 + 한국정보통신대학교 | 한국과학기술원(KAIST) | [공식 자료](https://kaist.ac.kr/kr/html/footer/0814.html?file_id=29554&mode=D&no=db2e2a43f706004e326f8f777481fba7) |
| 2010-03-01 | 인천대학교 + 인천전문대학 | 인천대학교 | [공식 자료](https://www.korea.kr/briefing/pressReleaseView.do?newsId=155415992) |
| 2012-03-01 | 충주대학교 + 한국철도대학 | 국립한국교통대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2021-03-01 | 경상대학교 + 경남과학기술대학교 | 경상국립대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-03-01 | 한경대학교 + 한국복지대학교 | 한경국립대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2025-03-01 | 국립안동대학교 + 경북도립대학교 | 국립경국대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2026-03-01 | 강원대학교 + 국립강릉원주대학교 | 강원대학교 | [공식 자료](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105413&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W) |
| 2026-03-01 | 국립목포대학교 + 전남도립대학교 | 국립목포대학교 | [공식 자료](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105413&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W) |
| 2026-03-01 | 국립창원대학교 + 경남도립거창대학 + 경남도립남해대학 | 국립창원대학교 | [공식 자료](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105413&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W) |

### 교명 변경 17건

| 시행일 | 이전 대학 | 변경·승계 명칭 | 근거 |
|---|---|---|---|
| 2003-03-01 | 인천교육대학교 | 경인교육대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2009-03-01 | 강릉대학교 | 강릉원주대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2010-09-01 | 서울산업대학교 | 서울과학기술대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2010-09-01 | 진주산업대학교 | 경남과학기술대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 강릉원주대학교 | 국립강릉원주대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 공주대학교 | 국립공주대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 군산대학교 | 국립군산대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 금오공과대학교 | 국립금오공과대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 목포대학교 | 국립목포대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 목포해양대학교 | 국립목포해양대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 부경대학교 | 국립부경대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 순천대학교 | 국립순천대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 안동대학교 | 국립안동대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 창원대학교 | 국립창원대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 한국교통대학교 | 국립한국교통대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 한국해양대학교 | 국립한국해양대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |
| 2023-11-16 | 한밭대학교 | 국립한밭대학교 | [공식 자료](https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801) |

### 승인된 향후 통합 1건

| 시행일 | 이전 대학 | 변경·승계 명칭 | 근거 |
|---|---|---|---|
| 2027-03-01 | 부산대학교 + 부산교육대학교 | 부산대학교 | [공식 자료](https://www.pusan.ac.kr/kor/CMS/Board/Board.do?board_seq=1503018&mCode=MN114&mgr_seq=16&mode=view&page=33) |

### 미시행 주요 추진안 4건

| 시행일 | 이전 대학 | 변경·승계 명칭 | 근거 |
|---|---|---|---|
| 미확정·미시행 | 충북대학교 + 국립한국교통대학교 | 현 대학명 유지 | [공식 자료](https://press.chungbuk.ac.kr/ktimes/index.php?m=pc) |
| 미확정·미시행 | 국립목포대학교 + 국립순천대학교 | 현 대학명 유지 | [공식 자료](https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?mi=5470&nttSn=281321525) |
| 미확정·미시행 | 충남대학교 + 국립공주대학교 | 현 대학명 유지 | [공식 자료](https://www.kongju.ac.kr/bbs/KNU/2300/649787/download.do) |
| 미확정·미시행 | 충남대학교 + 국립한밭대학교 | 현 대학명 유지 | [공식 자료](https://www.law.go.kr/LSW/flDownload.do?bylClsCd=110201&flSeq=161877141&gubun=) |

## 현행 38개교 점검표

행 수는 모든 캠퍼스의 현재 수집 행 합계다. `이번 범위의 통합 반영 없음`은 역사상 어떤 개편도 없었다는 단정이 아니다. 이력 식별자는 공통 명칭표 사건과 연결된다.

| 대학 | 현재 행 수 | 관련 사건 식별자 또는 점검 결과 |
|---|---:|---|
| 강원대학교 | 3,145 | kangwon-samcheok-2006; gangneung-wonju-2007; kangwon-2026 |
| 경북대학교 | 2,270 | knu-sangju-2008 |
| 경상국립대학교 | 3,317 | gnu-2021 |
| 국립공주대학교 | 933 | kongju-yesan-1992; kongju-culture-2001; kongju-cheonan-2005; national-prefix-공주; cnu-kongju-pending |
| 국립군산대학교 | 1,363 | national-prefix-군산 |
| 국립금오공과대학교 | 691 | national-prefix-금오공과 |
| 국립목포대학교 | 896 | mokpo-2026; national-prefix-목포; mokpo-scnu-pending |
| 국립목포해양대학교 | 661 | national-prefix-목포해양 |
| 국립부경대학교 | 2,485 | pknu-1996; national-prefix-부경 |
| 부산대학교 | 2,407 | pusan-miryang-2006; pusan-bnue-2027 |
| 서울과학기술대학교 | 985 | seoultech-2010 |
| 국립순천대학교 | 738 | national-prefix-순천; mokpo-scnu-pending |
| 국립경국대학교 | 544 | gknu-2025 |
| 전남대학교 | 2,660 | jnu-yeosu-2006 |
| 전북대학교 | 1,698 | jbnu-iksan-2008 |
| 제주대학교 | 1,846 | jejunu-edu-2008 |
| 국립창원대학교 | 1,188 | changwon-2026; national-prefix-창원 |
| 충남대학교 | 2,104 | cnu-kongju-pending; cnu-hanbat-pending |
| 충북대학교 | 1,191 | chungbuk-ut-pending |
| 한경국립대학교 | 556 | hknu-2023 |
| 국립한국교통대학교 | 1,198 | ut-jeungpyeong-2006; ut-rail-2012; national-prefix-한국교통; chungbuk-ut-pending |
| 한국체육대학교 | 925 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 국립한국해양대학교 | 422 | national-prefix-한국해양 |
| 국립한밭대학교 | 594 | national-prefix-한밭; cnu-hanbat-pending |
| 공주교육대학교 | 30 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 광주교육대학교 | 38 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 대구교육대학교 | 37 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 부산교육대학교 | 46 | pusan-bnue-2027 |
| 서울교육대학교 | 44 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 경인교육대학교 | 294 | ginue-2003 |
| 전주교육대학교 | 32 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 진주교육대학교 | 26 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 청주교육대학교 | 30 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 춘천교육대학교 | 33 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 한국교원대학교 | 366 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 서울대학교 | 1,160 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
| 인천대학교 | 1,376 | inu-2010 |
| 서울시립대학교 | 748 | 현행 명단 대조; 이번 범위의 통합 반영 없음 |
