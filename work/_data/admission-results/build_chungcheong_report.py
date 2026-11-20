from pathlib import Path
import csv,json,collections,hashlib
from urllib.parse import urlsplit,unquote
P=Path(__file__).parent;C=P/'chungcheong-expansion'
regions=json.loads((C/'target-regions.json').read_text(encoding='utf8'))
validation=json.loads((C/'validation.json').read_text(encoding='utf8'))
gaps={
 'cnu':'재조사: 2025 수시·정시 이미지 표 679행 추가, 2024 종합 특수교육 기계공학부 70%컷 1칸 복구. 비공개 성적은 공란. 분포 그래프 좌표는 수치화하지 않음.',
 'kongju':'재조사: 2024~2026 종합일반 85개 모집단위 254행의 모집·경쟁률·등록·추가합격 인원 추가(p.22~57). 종합 성적은 분포 그래프로 공개되어 컷 추정 안 함.',
 'nsu':'재조사: 공식 연결 상담서비스의 과거 모집요강에서 2024·2025 수시 일반·교과+면접 128행 추가. 해당 표 외 전형 성적은 미확보. 2026 수시는 2027 산식 재산출 자료.',
 'ggu':'2026 공식 입결 미확보(공식 입시결과 게시판 최신 확인 자료 2025).',
 'chungwoon':'2026 정시 공식 입결 미확보. 홍성캠퍼스만 수록.',
 'u1':'2026 정시 공식 입결 미확보. 영동·아산 캠퍼스를 원문에 따라 분리.',
 'jwu':'2024~2026 정시 공식 입결 미확보. 2026 수시 동명 정원외 전형 열은 명칭 확인 필요 표시.',
 'jbu-geumsan':'재조사: 2025 정시 지원현황 9행 추가. 2024 정시 원본과 2025 정시 성적은 미확보. 충청국제캠퍼스만 수록.',
 'koreatech':'재조사: 2026 논술고사 자체 점수 17행을 교과등급과 별도 지표로 추가. 확보한 2024·2025 결과 PDF에서는 논술고사 자체 점수 표 미확인.',
 'cju':'재조사: 2024·2026 수시 삽입표 11행 추가. 2024 정원외는 평균만 공개, 2026은 국가보훈/지역기회균형·정원외 합계. 2025 삽입표도 수록.',
 'kbtus':'공식 입학처 연결 오류·시간초과로 3개년 학과별 결과 미확보.',
 'daejeon-theology':'공식 사이트 조사에서 3개년 공개 학과별 결과 미확보. 대전대학교(dju)와 별개 학교.',
 'kaist':'재조사: 2024~2026 전형별 경쟁률 23행 추가. 학과별 성적 아님. 모집인원은 내외 기준, 외국고는 기타 구분. 성적·충원 원본 미확보.',
 'woosuk-jincheon':'조사목록 누락 발견으로 추가. 2024~2026 공식 입시결과 게시 확인, 첨부 다운로드는 SSL 오류·공식 보안차단 화면으로 미확보. 검색 캐시 수치를 CSV에 대입하지 않음.',
 'chungbuk':'기존 수집 1,191행 유지. 이번 작업에서 재추출·재검증하지 않음.',
 'sch':'2024~2026 교과등급 중 2027학년도 산식 재산출 자료 포함; note 및 basis 확인.',
 'hannam':'2025 결과는 2026학년도 전형방법·모집단위 적용. 원문에 공개된 주요전형 기준.',
 'ut':'의왕캠퍼스 행은 경기권 보완분이며 충주·증평과 구분. 공통 모집인원은 중복 배분하지 않음.',
 'mokwon':'공통 모집인원·경쟁률과 개별 학과 성적을 범위별 별도 행으로 보존. 행 수≠모집단위 수.',
 'semyung':'합격자 전체(최초~충원) 기준으로 최종등록자 컷과 다름. 수능최저 통과 통계는 별도 지표로 보존.',
 'kdu':'원문에 경쟁률0·성적 순서 역전 등 존재; 임의 보정하지 않음.',
 'nuch':'수시·정시 외 우선선발 결과 포함.',
}
no_names={'kbtus':'한국침례신학대학교','daejeon-theology':'대전신학대학교','kaist':'한국과학기술원(KAIST)','woosuk-jincheon':'우석대학교(진천)'}
def normurl(u):
 x=urlsplit(unquote(u));return x.netloc.lower().removeprefix('www.')+x.path+'?'+x.query.rstrip('&')
metas=[];byurl=collections.defaultdict(list)
for directory in [C,P/'gyeonggi-expansion']:
 for f in directory.glob('*.meta.json'):
  try:m=json.loads(f.read_text(encoding='utf-8-sig'))
  except Exception:continue
  if not m.get('url') or not m.get('path'):continue
  m['_meta_file']=str(f.relative_to(P));metas.append(m)
  for u in set([m['url'],m.get('final_url',m['url'])]):byurl[normurl(u)].append(m)
coverage=[];source_use=collections.defaultdict(list);allrows=[]
for slug in sorted(set(sum(regions.values(),[]))):
 f=P/(slug+'.csv');rs=list(csv.DictReader(f.open(encoding='utf-8-sig'))) if f.exists() else []
 name=' / '.join(sorted(set(r['university'] for r in rs))) or no_names.get(slug,slug)
 region='·'.join(k for k,v in regions.items() if slug in v)
 for y in ['2024','2025','2026']:
  rr=[r for r in rs if r['result_year']==y];ct=collections.Counter(r['round'] for r in rr)
  coverage.append({'slug':slug,'region':region,'university':name,'result_year':y,'susi_rows':ct['수시'],'jeongsi_rows':ct['정시'],'other_rows':sum(v for k,v in ct.items() if k not in ['수시','정시']),'total_rows':len(rr),'status':'기존 유지' if slug=='chungbuk' else ('자료 일부 수록' if rr else 'CSV 미수록'),'limitations':gaps.get(slug,'확보한 공식 자료 범위 수록; 모든 전형·모든 공개 지표의 완전성 보증 아님')})
 if slug!='chungbuk':
  allrows+=rs
  for r in rs:source_use[r['source_url']].append(r)
with (P/'_chungcheong-coverage.csv').open('w',encoding='utf-8-sig',newline='') as h:
 w=csv.DictWriter(h,list(coverage[0]));w.writeheader();w.writerows(coverage)
sources=[];unresolved=[]
for url,rs in sorted(source_use.items()):
 matches=byurl.get(normurl(url),[])
 # Prefer one exact cached artifact per URL; duplicate downloads add no evidence.
 if not matches:unresolved.append(url);continue
 m=matches[0];path=Path(m['path'])
 if not path.exists():path=P/m['_meta_file'].replace('.meta.json',Path(m['path']).suffix)
 assert path.exists(),path
 sources.append({'universities':' / '.join(sorted(set(r['university'] for r in rs))),'result_years':' / '.join(sorted(set(r['result_year'] for r in rs))),'rows':len(rs),'source_url':url,'local_file':str(path.relative_to(P)),'download_sha256':m.get('sha256',''),'stored_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'note':'HTML은 UTF-8 저장 변환으로 내려받은 바이트 해시와 저장 해시가 다를 수 있음' if path.suffix=='.html' else ''})
with (P/'_chungcheong-sources.csv').open('w',encoding='utf-8-sig',newline='') as h:
 w=csv.DictWriter(h,list(sources[0]));w.writeheader();w.writerows(sources)
(C/'source-resolution.json').write_text(json.dumps({'source_urls':len(source_use),'resolved':len(sources),'unresolved':unresolved},ensure_ascii=False,indent=2),encoding='utf8')
by_school=collections.defaultdict(list)
for r in coverage:by_school[r['slug']].append(r)
lines=['# 충북·충남·대전 공식 입결 수집 현황','',
 '기준일: 2026-11-19. 대상 학년도: 2024·2025·2026. 상태: **draft, 부분 수집·검수 대기**. 전체 완료가 아닙니다.','',
 f'현재 충청권 수집본은 **{validation["school_files"]}개 대학 파일, {len(allrows):,}행**입니다. 기존 충북대 1,191행을 포함하면 주 조사목록 {len(by_school)}개교 중 {sum(any(r["total_rows"] for r in rr) for rr in by_school.values())}개교에 수록 자료가 있습니다. 우석대 진천을 조사목록에 보완했습니다. 학교별 행 수는 모집단위 수가 아니며 공통 통계·다른 지표의 행을 포함합니다.','',
 '이번 누락 재조사에서 충청권 1,121행과 중부대 고양 23행을 보완하고 충남대 2024년 70%컷 1칸을 복구했습니다. 상세 변경·잔여 누락: [_revisit-report.md](_revisit-report.md).','',
 '전문대·폴리텍은 제외했습니다. 서울 기존 수집본은 유지합니다. 세종은 이번 요청 지역에 포함하지 않았습니다. 건양대·유원대는 지역 간 중복 학교 수를 한 번만 셉니다. 한국교통대 의왕은 경기권 보완분으로 캠퍼스를 구분했습니다.','',
 '- 통합 데이터: [_all.csv](_all.csv)',
 '- 학교×학년도×모집시기 현황: [_chungcheong-coverage.csv](_chungcheong-coverage.csv)',
 '- 실제 사용한 공식 원본 URL·로컬 파일·해시: [_chungcheong-sources.csv](_chungcheong-sources.csv)',
 '- 원문 수치 관계 검토 목록: [_chungcheong-review.csv](_chungcheong-review.csv)',
 '- 검증 로그: [validation.json](chungcheong-expansion/validation.json)','',
 '## 데이터 기준','',
 '입학처 공식 PDF·Excel·HWP·HTML·이미지 및 입학처에서 직접 연결한 대학 공식 상담서비스의 모집요강만 사용했습니다. 남서울대 위탁 호스팅의 공식 연결 근거는 `chungcheong-expansion/nsu-official-host-evidence.json`에 보존했습니다. 어디가·사설 입결 사이트의 수치는 사용하지 않았습니다. 행마다 원문 URL과 쪽수·표 위치를 보존했습니다. 모집계획의 다음 연도 인원을 과거 입결에 대입하지 않았습니다.','',
 '최종등록자, 최종합격자, 지원자, 최초합격자 지표를 basis와 cut_other에서 구분합니다. 평균·최저·80%·90%·100%는 70% 컷으로 변환하지 않습니다. 예비순위는 충원인원이 아닙니다. 원문의 공란·대시·비공개는 0으로 채우지 않습니다. 모집시기는 원문의 추가모집·우선선발도 유지했습니다.','',
 f'필수 열·학년도·모집시기·동일행 중복 검사는 통과했습니다. 모집·지원·경쟁률 관계가 맞지 않는 {len(validation["issues"])}행은 수치를 임의 수정하지 않고 검토 표시를 남겼습니다. 이는 통계의 정확성·전전형 완전성 검수를 대신하지 않습니다.','',
 '## 학교별 현황','', '| 지역 | 학교 | 2024 | 2025 | 2026 | 누락·주의 |','|---|---|---:|---:|---:|---|']
for slug,rr in by_school.items():
 fmt=lambda r:f'{r["susi_rows"]}/{r["jeongsi_rows"]}'+(f'(+{r["other_rows"]})' if r['other_rows'] else '')
 lines.append('| '+' | '.join([rr[0]['region'],rr[0]['university']]+[fmt(r) for r in rr]+[rr[0]['limitations']])+' |')
lines+=['','숫자는 수시/정시 행 수이며 괄호는 추가·우선선발·기타입니다. KAIST 외국고는 기타로 구분했습니다. 3개년도에 행이 있어도 전체 전형·전체 지표 수집 완료를 뜻하지 않습니다.','',
 '## 아직 남은 작업','',
 '1. 금강대 2026, 청운대·유원대 2026 정시, 중부대 2024 정시 및 2025 정시 성적, 중원대 3개년 정시 원문 확보. 재확인한 공식 게시판 범위에서는 해당 원문을 찾지 못했습니다.',
 '2. 우석대 진천 첨부파일과 한국침례신학대 입학처 접근 재확인, 대전신학대 학과별 공개 결과 확인. 자료 게시·접속 실패와 미공개를 구분합니다.',
 '3. 남서울대 과거 모집요강의 두 전형 외 성적, 한국기술교육대 2024·2025 논술고사 자체 점수, KAIST 학과별 합격성적은 추가 확인 대상입니다.',
 '4. 공주대·충남대 분포 그래프는 좌표를 성적 컷으로 추정하지 않습니다. 숫자 표의 미전사와 성격이 다른 제한입니다.',
 '5. 위 41개교 외 특수·원격대학인 공군사관학교(충북), 경찰대학(충남), 국군간호사관학교(대전), 글로벌사이버대(충남), 건양사이버대(대전)는 별도 추가 확인 대상입니다. 이번 CSV에 넣지 않았으며 전체 지역 대학 완료라고 표시하지 않습니다.','',
 '## 재현 및 통합','',
 '`normalize_chungcheong.py`, `normalize_cc_more.py`, `normalize_cc_final.py`, `normalize_cc_campuses.py` 및 재조사 보완 `normalize_cnu25.py`, `normalize_kongju_counts.py`, `normalize_cc_revisit.py`에 추출 규칙을 보관했습니다. 수동 대조 원장은 `chungcheong-expansion/*verified*`, `cnu25-ocr/`, `kongju-counts/`에 있습니다. 기본 파서를 다시 실행하면 보완 행을 덮어쓸 수 있으므로 최종 보완 파서와 `audit_chungcheong.py`를 순서대로 적용해야 합니다.',
 '통합은 `merge_chungcheong.py`가 현재 `_all.csv`를 다시 읽어 해당 학교만 교체하고 다른 학교 행을 보존합니다. 실행 전 백업과 실행 중 해시 확인을 수행합니다. 앱 데이터 반영 및 배포는 하지 않았습니다.','']
(P/'_chungcheong-report.md').write_text('\n'.join(lines),encoding='utf8')
print(json.dumps({'rows':len(allrows),'source_urls':len(source_use),'resolved':len(sources),'unresolved':unresolved},ensure_ascii=False))
