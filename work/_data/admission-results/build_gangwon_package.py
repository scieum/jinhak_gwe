from pathlib import Path
import csv,json,re,hashlib,collections
ROOT=Path(__file__).parent
OUT=ROOT.parents[2]/'outputs/gangwon-four-year-20261119'
OUT.mkdir(parents=True,exist_ok=True)
SLUGS=['hallym','sangji','halla','halla-adiga','kyungdong','chuncheon-education','yonsei-mirae']
rows=[]
for slug in SLUGS:
 for r in csv.DictReader((ROOT/(slug+'.csv')).open(encoding='utf-8-sig')):
  r['dataset_file']=slug+'.csv'
  r['source_kind']='전문대학포털' if '-portal' in slug else ('대입정보포털 어디가' if '-adiga' in slug or slug=='yonsei-mirae' else '대학 공식 원문')
  r['record_id']=hashlib.sha256((slug+'|'+r['source_page']+'|'+r['program']+'|'+r['recruit_unit']).encode()).hexdigest()[:16]
  for k in ['quota','applicants','competition_rate','fill_count','fill_rate','cut_50','cut_70']:
   if r[k] in ['-','–','—','·']:r[k]=''
  rows.append(r)
rows.sort(key=lambda r:(r['university'],r['recruit_unit'],r['program'],r['result_year'],r['round'],r['source_kind']))
fields=list(rows[0])
with (OUT/'강원권_추가대학_2024-2026_통합.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fields);w.writeheader();w.writerows(rows)
(OUT/'data.json').write_text(json.dumps(rows,ensure_ascii=False),encoding='utf-8')
schools=sorted(set(r['university'] for r in rows));summary=[]
for school in schools:
 rr=[r for r in rows if r['university']==school]
 summary.append({'school':school,'years':[sum(r['result_year']==str(y) for r in rr) for y in [2024,2025,2026]],'total':len(rr),'unique':len({tuple(r[k] for k in ['result_year','round','program','recruit_unit']) for r in rr}),'rounds':', '.join(sorted(set(r['round'] for r in rr)))})
issues=[
 ['연세대학교(미래)','2026','부분 수집','공개 HTML에서 학교생활우수자와 정시 결과만 확인. 교과 및 다른 종합전형 결과는 확보하지 못함.','https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&searchSyr=2027&unvCd=0000150'],
 ['연세대학교(미래)','2024~2026','공개범위 제한','논술·특별전형 등 어디가 결과표에 없는 전형은 전수 확보로 판정하지 않음.','https://admission.yonsei.ac.kr/mirae/admission/html/rolling/qnaView.asp?QNA_NO=34027'],
 ['경동대학교','2024~2026','캠퍼스 범위','원주(메디컬캠퍼스) 공개행만 수록. 고성캠퍼스 별도 결과를 확인하지 못함. 양주 제외.','https://www.kduniv.ac.kr/iphak/CMS/Board/Board.do?mCode=MN071'],
 ['한라대학교','2024~2026','지표 차이','대학 PDF는 75% 또는 100% 기준, 어디가는 50%·70% 기준. 별도 출처 행으로 보존. 정원외 등 미공개 전형 존재 가능.','https://ipsi.halla.ac.kr/regular/regular02.php?sub=2'],
 ['세경대학교','2026','출처 간 값 차이','대학 홈페이지와 전문대학포털의 경쟁률·등급이 다름. 홈페이지는 최초합격자 기준. 두 출처를 별도로 보존.','https://www.saekyung.ac.kr/information/recent_result.php'],
 ['송곡대학교','2024~2025','원문 0값','전문대학포털에 평균·최저가 0으로 기재된 행 존재. 실제 0등급으로 해석 금지. 2024 모집요강 결과 별도 수록.','https://www.procollege.kr/web/entrance/webEntrancePreResult.do'],
 ['송호대학교','2024~2026','출처 간 값 차이','2024~2025 대학 엑셀과 포털의 모집인원·평균 차이 존재. 2026은 포털 자료. 어느 한쪽으로 덮어쓰지 않음.','https://www.songho.ac.kr/iphak/bbs/index.do?menu_idx=33&master_idx=5'],
 ['한국골프과학기술대학교','2024~2026','공개범위 제한','공식 전문대학포털에 제공된 결과 전행 수록. 2024 원문 학교명은 한국골프대학교. 미공개 전형 수치 없음.','https://www.procollege.kr/web/entrance/webEntrancePreResult.do'],
 ['한국폴리텍Ⅲ대학 춘천캠퍼스','2024~2026','미수집','공식 과년도 내신등급 조회는 별도 Nexacro 화면. 브라우저 연결 서비스 사용 불가로 값 확보 실패.','https://e.kopo.ac.kr/nx/index_external.html?bWVudUlkPU0wMDU1NDgmbG9naW5HYm49ZXgmc2hvd1RpdGxlPWZhbHNl'],
 ['한국폴리텍Ⅲ대학 원주캠퍼스','2024~2026','미수집','공개 결과 게시판 최신 게시물은 2022학년도. 별도 내신조회 화면 값은 확보 실패.','https://www.kopo.ac.kr/wonju/board.do?menu=9976'],
 ['한국폴리텍Ⅲ대학 강릉캠퍼스','2024~2026','미수집','공식 과년도 내신등급 조회는 별도 Nexacro 화면. 브라우저 연결 서비스 사용 불가로 값 확보 실패.','https://e.kopo.ac.kr/nx/index_external.html?bWVudUlkPU0wMDU1NDgmbG9naW5HYm49ZXgmc2hvd1RpdGxlPWZhbHNl'],
 ['전체','2024~2026','수록 범위','공개 신입학 결과표 기준. 편입·대학원·비학위 직업훈련은 제외. 기존 강원대·강릉원주대·가톨릭관동대는 재수집 제외.',''],
 ['전체','2024~2026','비교 기준','학과명과 전형명은 당시 원문 기준. 통폐합 학과를 임의로 연결하지 않음. 모집결과가 합쳐진 전공은 한 단위로 보존.',''],
 ['전체','2024~2026','결측 및 순위','빈칸은 0이 아님. 미공개·등록자 없음 등 원문 상태 보존. 예비번호·충원순위를 충원인원으로 변환하지 않음.',''],
 ['전체','2024~2026','검수 범위','표 구조·연도·필수키·중복·출처 확인 및 대표 페이지 시각 대조 완료. 모든 숫자의 이중 수작업 대조는 수행하지 않음.','']]
issues=[x for x in issues if x[0] in schools or x[0] in ['경동대학교','전체']]
issues.append(['전체','2024~2026','대상 변경','사용자 요청에 따라 전문대학과 폴리텍은 이번 수집·정리 대상에서 제외. 기존 원문은 보관.',''])
with (OUT/'수집범위_확인필요.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['학교','학년도','상태','설명','확인 출처']);w.writerows(issues)
# Each original downloaded source is independently auditable.
used={r['source_page'].split(' / ')[0] for r in rows};manifest=[]
for key in sorted(used):
 m=json.loads((ROOT/'gangwon-expansion'/(key+'.meta.json')).read_text(encoding='utf-8'))
 manifest.append({'source_key':key,'url':m['url'],'local_file':m['path'],'sha256':m['sha256'],'bytes':m['bytes'],'normalized_rows':sum(r['source_page'].startswith(key+' / ') for r in rows)})
(OUT/'출처목록.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
ids=collections.Counter(r['record_id'] for r in rows)
assert len(ids)==len(rows),'record ID duplication'
assert len(schools)==6
assert all(r['result_year'] in ['2024','2025','2026'] and all(r[k] for k in ['university','recruit_unit','program','round','source_url','source_page']) for r in rows)
assert all({r['result_year'] for r in rows if r['university']==s}=={'2024','2025','2026'} for s in schools)
validation={'rows':len(rows),'schools':len(schools),'sources':len(manifest),'year_counts':dict(collections.Counter(r['result_year'] for r in rows)),'unique_record_ids':len(ids),'missing_required_fields':0,'out_of_range_years':0,'complete_all_schools_all_tracks':False,'summary':summary,'issues':issues}
(OUT/'package.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf-8')
md=['# 강원권 추가 대학 입결 수집','',f'2024~2026학년도, 추가 {len(schools)}개 대학, 출처별 {len(rows):,}행, 사용 원문 {len(manifest)}건. 수집일: 2026-11-19.','', '**전 대학·전 전형 수집 완료 상태는 아닙니다.** 연세대 미래 일부 전형과 경동대 고성캠퍼스 자료는 미확보입니다. 전문대·폴리텍은 사용자 요청으로 대상에서 제외했습니다. 같은 모집단위의 출처·지표가 다르면 별도 행입니다. 행 수를 모집인원이나 서로 다른 전형 수로 해석하지 마세요.','', '|학교|2024|2025|2026|출처별 합계|','|---|---:|---:|---:|---:|']
for x in summary:md.append('|'+x['school']+'|'+'|'.join(str(v) for v in x['years'])+'|'+str(x['total'])+'|')
md+=['','## 파일','', '- `강원권_추가대학_2024-2026_입결.xlsx`: 필터 가능한 통합표, 수집현황, 확인 필요 사항.','- `강원권_추가대학_2024-2026_통합.csv`: 원래 20개 필드와 자료파일·출처종류·행 ID.','- `출처목록.json`: 공식 URL, 로컬 원문 경로, SHA-256.','- 학교별 CSV와 원본 PDF·XLSX·HTML은 `work/_data/admission-results/` 및 `gangwon-expansion/`에 보존.','','## 확인 필요 사항','']
for x in issues:md.append(f'- **{x[0]} / {x[1]} / {x[2]}**: {x[3]}'+(f' [출처]({x[4]})' if x[4] else ''))
md+=['','## 지표 정의','', '`cut_50`, `cut_70`은 해당 기준이 명시된 경우만 기입. 평균·최저·75%·80%·100%는 `cut_other`에 원문 명칭과 함께 보존. `metric`과 `basis`를 함께 확인해야 합니다. 서로 다른 대학의 환산점수, 학생부등급, 수능등급, 백분위를 같은 척도로 비교하지 마세요.','', '최초·최종합격 및 등록자 기준이 다른 자료를 임의 합산하지 않았습니다.','', '범위 기준: 강원권 4년제·교육대 중 기존 수집 강원대·강릉원주대·가톨릭관동대를 제외한 6개교. 전문대와 폴리텍은 제외. 대학 통합 전 명칭과 당시 모집단위를 유지합니다. [강원 RISE 기본계획](https://www.hknu.ac.kr/bbs/ir/430/98191/download.do).']
(OUT/'수집결과.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in validation.items() if k not in ['summary','issues']},ensure_ascii=False))
