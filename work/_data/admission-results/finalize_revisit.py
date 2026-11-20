"""Revisit evidence, coverage updates and before/after master preservation audit."""
from pathlib import Path
import csv,json,hashlib,collections,sys
P=Path(__file__).parent;C=P/'chungcheong-expansion';G=P/'gyeonggi-expansion'
SLUGS=['cnu','kongju','nsu','cju','koreatech','jbu-geumsan','kaist','jbu']
def read(path):
 with path.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def write(path,rs):
 with path.open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,list(rs[0]));w.writeheader();w.writerows(rs)
def prepare():
 before=P/'_all.csv';dest=C/'_all-before-revisit.csv'
 if not dest.exists():dest.write_bytes(before.read_bytes())
 evidence={'date':'2026-11-19','university':'남서울대학교','official_entry_url':'https://www.namseoul.net/main.do','official_entry_cache':'nsu-real.html','official_links_cache':'nsu-real.links.json','delegated_service_url':'https://consult.mncapro.co.kr/solution/nsuipsi/','service_cache':'revisit-nsu-consult.html','scope':'대학 입학처가 직접 연결한 남서울대학교 전용 공식 상담서비스의 모집요강 PDF 2개만 허용. 공급업체의 다른 학교/경로는 허용하지 않음.','documents':[]}
 for key in ['revisit-nsu-2025-guide','revisit-nsu-2026-guide-official']:
  m=json.loads((C/(key+'.meta.json')).read_text(encoding='utf8'));evidence['documents'].append({'url':m['url'],'sha256':m['sha256'],'year_of_guide':2025 if '2025' in key else 2026,'result_page':85})
 (C/'nsu-official-host-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf8')
 # The same official page supplies the two separately scoped JBU campuses.
 jbu=read(P/'jbu.csv');new=[r for r in jbu if r['result_year']=='2025' and r['round']=='정시'];assert len(new)==23
 cov=read(P/'_gyeonggi-coverage.csv');matched=0
 for r in cov:
  if r['slug']=='jbu':
   r['note']='2025 정시 지원현황 23행 재조사 보완. 2024 정시와 2025 정시 성적은 미확보.'
   if r['result_year']=='2025' and r['round']=='정시':r.update(rows='23',status='공식 지원현황 수록(성적 없음)',source_urls=new[0]['source_url']);matched+=1
 assert matched==1
 write(P/'_gyeonggi-coverage.csv',cov)
 f=P/'_gyeonggi-report.md';s=f.read_text(encoding='utf8')
 s=s.replace('14,464행','14,487행').replace('| 중부대학교(고양) | 51/0 | 52/0 | 46/23 | 172 |','| 중부대학교(고양) | 51/0 | 52/23 | 46/23 | 195 |')
 s=s.replace('2024·2025 정시 대학 사이트 원본 미확인.','재조사에서 2025 정시 공식 지원현황 23행을 보완했다. 2024 정시 원본과 2025 정시 성적은 미확보.')
 f.write_text(s,encoding='utf8')
 mf=G/'source-manifest.csv';ms=read(mf);key='revisit-jbu-2025-reg';m=json.loads((C/(key+'.meta.json')).read_text(encoding='utf8'))
 if not any(r['key']==key for r in ms):ms.append({k:m[k] for k in ms[0]})
 write(mf,ms)
 (C/'revisit-baseline.json').write_text(json.dumps({'rows':len(read(dest)),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'path':str(dest)},ensure_ascii=False,indent=2),encoding='utf8')
 print('Prepared evidence and coverage; baseline',len(read(dest)))

def verify():
 old=read(C/'_all-before-revisit.csv');now=read(P/'_all.csv');fields=list(now[0]);freeze=lambda r:tuple(r[k] for k in fields)
 oldc=collections.Counter(map(freeze,old));newc=collections.Counter(map(freeze,now));removed=list((oldc-newc).elements());added=list((newc-oldc).elements())
 assert len(removed)==1 and len(added)==1145,(len(removed),len(added))
 removed_record=dict(zip(fields,removed[0]));assert removed_record['source_page']=='cnu-scan06-17 / p.21 행5'
 corrected=[dict(zip(fields,r)) for r in added if dict(zip(fields,r))['source_page']==removed_record['source_page']]
 assert len(corrected)==1 and corrected[0]['cut_70']=='6.64'
 by_old=collections.Counter(r['university'] for r in old);delta=[]
 for slug in SLUGS:
  rs=read(P/(slug+'.csv'));names={r['university'] for r in rs};before=sum(by_old[n] for n in names)
  target=[r for r in now if r['university'] in names]
  assert collections.Counter(map(freeze,target))==collections.Counter(map(freeze,rs)),slug
  delta.append({'slug':slug,'university':' / '.join(sorted(names)),'before':before,'after':len(rs),'added':len(rs)-before})
 assert sum(x['added'] for x in delta)==1144
 audit={'date':'2026-11-19','before_rows':len(old),'after_rows':len(now),'new_rows':1144,'corrected_existing_rows':1,'unchanged_existing_rows':len(old)-1,'changed_files':delta,'before_sha256':hashlib.sha256((C/'_all-before-revisit.csv').read_bytes()).hexdigest(),'after_sha256':hashlib.sha256((P/'_all.csv').read_bytes()).hexdigest(),'old_record':removed_record,'corrected_record':corrected[0],'checks':['기존 57,401행 중 57,400행 내용 보존','기존 충남대 2024 한 행의 성적 열 보완만 수정','학교별 CSV와 통합본 일치','추가 행 중복 없음','공식 원본 URL 242개 모두 캐시 연결','기존 산술관계 검토 대상 67행 유지; 새 fatal 없음']}
 (C/'revisit-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
 lines=['# 누락 재조사 결과','',f'2026-11-19. 충청권 보고서에 기록된 누락과 같은 원본의 중부대 고양 자료를 재조사했습니다. **1,144행 추가, 기존 1행 보완**으로 `_all.csv`는 **{len(now):,}행**입니다. 전문대·서울 신규 조사는 제외했습니다. 강원·경기 전체 누락의 재검토 완료를 뜻하지 않습니다.','',
 '| 학교·캠퍼스 | 추가 행 | 보완 범위 |','|---|---:|---|',
 '| 충남대학교 | 679 | 2025 수시 20개 이미지 표·정시 5개 이미지 표. 2024 종합 특수교육 기계공학부 70%컷 6.64도 복구 |',
 '| 국립공주대학교 | 254 | 2024~2026 종합일반 85개 모집단위의 모집·경쟁률·등록·추가합격 인원 |',
 '| 남서울대학교 | 128 | 2024·2025 수시 일반·교과+면접. 과거 모집요강 p.85 |',
 '| 청주대학교 | 11 | 2024·2026 수시 삽입표. 정원외 합계와 국가보훈/지역기회균형 |',
 '| 한국기술교육대학교 | 17 | 2026 논술고사 자체 점수. 교과등급과 별도 지표 |',
 '| 중부대학교(금산) | 9 | 2025 정시 지원현황 |',
 '| 중부대학교(고양) | 23 | 2025 정시 지원현황 |',
 '| 한국과학기술원(KAIST) | 23 | 2024~2026 전형별 경쟁률. 전형 전체 통계, 외국고 별도 구분 |','',
 '## 남은 공백과 재확인 근거','',
 '- 금강대 2026: [공식 입시결과 게시판](https://www.ggu.ac.kr/matriculation/sub030101) 최신 결과는 2025. 이번 확인 범위에서 2026 원문 미확보.',
 '- 청운대 2026 정시: [공식 정시 게시판](https://enter.chungwoon.ac.kr/enter/selectBbsNttList.do?bbsNo=10&key=139) 최신 성적 게시물은 2025.',
 '- 유원대 2026 정시: [공식 결과 게시판](https://ipsi.u1.ac.kr/ipsi/data/result.do)에 2026 수시 및 2025 정시가 확인되나 2026 정시는 미확보.',
 '- 중부대 2024 정시 및 2025 정시 성적: [지원현황](https://ipsi.joongbu.ac.kr/menu.es?mid=a60203010200)은 2025 인원·경쟁률만 제공. 성적을 채우지 않음.',
 '- 중원대 2024~2026 정시: [공식 입시결과 목록](https://ipsi.jwu.ac.kr/boards/admission-results?page=1)에서 해당 연도 수시는 확인했지만 대상 연도 정시 원문 미확보.',
 '- 우석대 진천: 기존 조사목록 누락을 발견해 충북 대상에 추가. [공식 결과 목록](https://enter.woosuk.ac.kr/main/?menu=52)에 2024~2026 자료가 게시되어 있으나, 첨부 다운로드 SSL 오류 및 공식 보안차단 화면으로 원본 확보 실패. 검색 캐시 숫자는 채택하지 않음.',
 '- 한국침례신학대: 공식 입학처 접속을 다시 시도했지만 SSL 연결 오류. 대전신학대: 공식 입학안내에서 대상 3개년 결과 원문 미확보. 미확보를 미공개로 단정하지 않음.',
 '- 남서울대 두 전형 외 성적, 한국기술교육대 2024·2025 논술 자체 점수, KAIST 학과별 합격성적은 이번 확보 자료에 없음. 공주대 종합 성적은 점 그래프를 컷으로 환산하지 않음.',
 '- 특수·원격대학 5개 추가 확인 대상과 강원·경기의 나머지 기존 제한은 각 지역 보고서에 유지.','',
 '## 출처·검증','',
 '입학처 원본과 대학이 직접 연결한 공식 상담서비스만 사용했습니다. 남서울대는 [공식 연결 근거](chungcheong-expansion/nsu-official-host-evidence.json)를 보존했습니다. 모집요강 이름의 연도와 결과 학년도를 구분했습니다.',
 '충남대 숫자 OCR와 원본 글리프를 대조하고 불일치 49셀을 확대 확인했습니다. 비공개 음영 1,842셀은 빈값으로 처리했습니다. 공주대는 숫자 인식 차이 123셀 및 전형명 14곳을 원본과 대조했습니다. 성적 평균·70%·최저와 예비순위·충원인원을 구분했습니다.',
 '기존 57,401행 중 57,400행을 내용 그대로 보존했고, 1행만 위의 충남대 성적 보완으로 변경했습니다. 기존 산술관계 검토 대상 67행은 원문 값을 유지했습니다. 새 필수 열·출처 연결·중복 검사 오류는 없습니다. 자료는 draft이며 앱 반영 전 독립 검수는 남아 있습니다.',
 '- [통합 CSV](_all.csv)',
 '- [충청권 최신 보고서](_chungcheong-report.md) · [학교별 현황](_chungcheong-coverage.csv)',
 '- [공식 원본 242개 목록](_chungcheong-sources.csv)',
 '- [변경·보존 검증 로그](chungcheong-expansion/revisit-audit.json)',
 '- [충남대 전사 검증](chungcheong-expansion/cnu25-ocr/transcription-check.json) · [공주대 전사 검증](chungcheong-expansion/kongju-counts/transcription-check.json)','']
 (P/'_revisit-report.md').write_text('\n'.join(lines),encoding='utf8')
 f=P/'README.md';s=f.read_text(encoding='utf8');heading='### 누락 재조사 보완 (2026-11-19)'
 s=s.split(heading)[0].rstrip()+f'\n\n{heading}\n\n1,144행 추가와 기존 1행 보완으로 현재 `_all.csv`는 **{len(now):,}행**입니다. 충청권 파일 37개의 수집본은 18,867행이며, 중부대 고양 정시 23행도 함께 보완했습니다. 앞 절의 57,401행은 재조사 전 상태입니다.\n\n[재조사 결과·잔여 누락](_revisit-report.md)와 [검증 로그](chungcheong-expansion/revisit-audit.json)를 확인하세요. 충남대 2025 표, 공주대 종합 인원, 남서울대 과거 수시, 청주대 삽입표, 한국기술교육대 논술점수, 중부대 정시 지원현황, KAIST 경쟁률을 보완했습니다. 미확보 연도·성적·접근 실패 자료는 보고서에 구분해 두었습니다. 전체 지역·전형 수집 완료를 뜻하지 않습니다.\n'
 f.write_text(s,encoding='utf8')
 print(json.dumps({k:audit[k] for k in ['before_rows','after_rows','new_rows','corrected_existing_rows','unchanged_existing_rows','changed_files']},ensure_ascii=False))
if __name__=='__main__':globals()[sys.argv[1]]()
