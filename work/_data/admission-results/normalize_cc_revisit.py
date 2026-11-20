"""Append newly verified missing official-source records; preserve previous drafts."""
from normalize_chungcheong import *
from bs4 import BeautifulSoup
from normalize_gangwon import html_grid

def koreatech_scores():
 key='koreatech-auto7'
 out=[r for r in csv.DictReader((ROOT/'koreatech.csv').open(encoding='utf-8-sig')) if not (r['result_year']=='2026' and r['metric']=='논술점수')]
 doc=fitz.open(CACHE/(key+'.pdf'));p=doc[12]
 for ti,t in enumerate(p.find_tables(),1):
  for i,v in enumerate(t.extract(),1):
   if len(v)<6 or not v[-5] or clean(v[0]) in ['평균','합계']:continue
   split=[str(x or '').splitlines() for x in v[-5:]]
   if not split[1] or not num(split[1][0]):continue
   assert len(set(map(len,split)))==1,(i,split)
   for j,(unit,*values) in enumerate(zip(*split),1):
    out.append(row(key,'한국기술교육대학교',2026,'수시','논술전형',compact(unit),f'p.13 표{ti} 행{i} 세부행{j}',admission_type='논술',cut_other=pairs(['논술 응시자 평균점수','논술 최초합격자 평균점수','논술 최종등록자 평균점수','논술 최종등록자 최저점수'],values),metric='논술점수',basis='최종등록자; 응시자·최초합격자 통계 별도',note='draft; 재조사 보완; 교과등급과 다른 지표로 별도 행; 공학·ICT는 수리논술, 사회융합은 자료제시형 언어논술; 50/70%컷 미발표'))
 save('koreatech',out)

def jbu25():
 key='revisit-jbu-2025-reg'
 out=[r for r in csv.DictReader((ROOT/'jbu-geumsan.csv').open(encoding='utf-8-sig')) if r['result_year']!='2025' or r['round']!='정시']
 soup=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
 for ti,t in enumerate(soup.select('table'),1):
  title=t.find_previous(['h2','h3','h4']).get_text(' ',strip=True);pg='실기우수자전형' if '실기' in title else '수능우수자전형'
  for i,v in enumerate(html_grid(t),1):
   if not v or '충청' not in v[0] or not num(v[-3]):continue
   out.append(row(key,'중부대학교(금산)',2025,'정시',v[-4]+' '+pg,' '.join(v[1:-4]),f'HTML 표{ti} 행{i}',admission_type='실기' if '실기' in pg else '수능',quota=v[-3],applicants=v[-2],competition_rate=v[-1],basis='원서접수 지원현황',note='draft; 재조사 보완; 공식 지원율현황 표로 성적·충원 통계는 미발표; 고양캠퍼스 제외'))
 save('jbu-geumsan',out)

def jbu_goyang25():
 key='revisit-jbu-2025-reg'
 out=[r for r in csv.DictReader((ROOT/'jbu.csv').open(encoding='utf-8-sig')) if not (r['result_year']=='2025' and r['round']=='정시')]
 soup=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
 for ti,t in enumerate(soup.select('table'),1):
  title=t.find_previous(['h2','h3','h4']).get_text(' ',strip=True);pg='실기우수자전형' if '실기' in title else '수능우수자전형'
  for i,v in enumerate(html_grid(t),1):
   if not v or '고양' not in v[0] or not num(v[-3]):continue
   assert abs(float(v[-2])/float(v[-3])-float(v[-1]))<.011,(i,v)
   out.append(row(key,'중부대학교(고양)',2025,'정시',v[-4]+' '+pg,' '.join(v[1:-4]),f'HTML 표{ti} 행{i}',admission_type='실기' if '실기' in pg else '수능',quota=v[-3],applicants=v[-2],competition_rate=v[-1],basis='원서접수 지원현황',note='draft; 재조사 보완; 공식 지원율현황 표로 성적·충원 통계는 미발표; 충청캠퍼스 제외'))
 save('jbu',out)

def nsu_old_susi():
 out=[r for r in csv.DictReader((ROOT/'nsu.csv').open(encoding='utf-8-sig')) if not (r['round']=='수시' and r['result_year'] in ['2024','2025'])]
 for year,key in [(2024,'revisit-nsu-2025-guide'),(2025,'revisit-nsu-2026-guide-official')]:
  for i,line in enumerate((CACHE/f'nsu-{year}-revisit-verified.tsv').read_text(encoding='utf8').splitlines(),1):
   unit,raw=line.split('\t');v=raw.split();assert len(v)==12
   for j,pg in enumerate(['학생부교과(일반)','학생부교과(교과+면접)']):
    vs=v[j*6:(j+1)*6]
    if vs[0]=='-':continue
    labs=['일반교과 평균등급','진로선택과목 평균등급','대학산출기준 평균등급','최저등급','경쟁률','예비순위'] if year==2024 else ['진로제외 평균등급','평균등급','등급70%cut','최저등급','경쟁률','예비번호']
    assert all(num(x) for x in vs) and all(1<=float(x)<=9 for x in vs[:4]),(i,vs)
    out.append(row(key,'남서울대학교',year,'수시',pg,unit,f'PDF p.85 원문 확대 대조전사 행{i}',admission_type='교과',competition_rate=vs[4],cut_70=vs[2] if year==2025 else '',cut_other=pairs(labs,vs),metric='교과등급',basis=f'{year}학년도 수시모집 입시결과; 산출기준별 평균 구분; 표에 합격/등록 집단 명시 없음',grade_system='9',note='draft; 재조사 보완; 입학처가 직접 연결한 대학 공식 상담서비스 보관 모집요강; 수시 일반·교과+면접 공개표; 예비순위는 충원인원이 아님; 평균과70% 순서 등 원문 수치 유지'))
 save('nsu',out)

def kaist_ratios():
 out=[]
 for year in [2024,2025,2026]:
  key=f'revisit-kaist-{year}';soup=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for i,v in enumerate(html_grid(soup.select_one('table')),1):
   if len(v)!=4 or '명' not in v[1] or v[0]=='합계':continue
   pg=v[0];rd='정시' if pg=='수능우수자전형' else '기타' if pg=='외국고전형' else '수시'
   q=re.search(r'[\d,]+',v[1])[0].replace(',','');a=re.search(r'[\d,]+',v[2])[0].replace(',','');c=v[3].replace(':1','')
   out.append(row(key,'한국과학기술원(KAIST)',year,rd,pg,'전형 전체(모집단위 미분리)',f'HTML 전형별 경쟁률 표 행{i}',admission_type='수능' if rd=='정시' else '기타',quota=q,applicants=a,competition_rate=c,cut_other='모집인원 원문 '+v[1],basis='지원현황; 전형별 합계',note='draft; 재조사 보완; 학과별 성적이 아닌 전형 전체 경쟁률; 모집인원은 내외 기준; 외국고는 기타로 별도 구분; 합격자 성적·충원 미공개(이 표 기준)'))
 save('kaist',out)

def cnu24_last_cell():
 out=list(csv.DictReader((ROOT/'cnu.csv').open(encoding='utf-8-sig')));found=0
 for r in out:
  if r['source_page']=='cnu-scan06-17 / p.21 행5':
   assert r['recruit_unit']=='기계공학부' and r['program']=='학생부종합 Ⅲ특수교육'
   r['cut_70']='6.64'
   r['cut_other']=r['cut_other'].replace('최종통계 원문 [6.64 6.64 6.64]','최종등급 평균 6.64; 최종등급70% 6.64; 최종등급최저 6.64; 최종등급 표준편차 원문 공란')
   note='재조사: p.21 기계공학부 최종등급 세 열 시각 대조, 표준편차 공란으로 인한 파싱 보류 해소'
   if note not in r['note']:r['note']+='; '+note
   found+=1
 assert found==1
 save('cnu',out)

def cju_insets():
 out=[r for r in csv.DictReader((ROOT/'cju.csv').open(encoding='utf-8-sig')) if not ('재조사 삽입표' in r['source_page'])]
 for unit,vals in [('경영학과','1 5 5.0 2 78.41 78.41 78.41 4.75 4.75 4.75'),('관광경영학과','1 5 5.0 2 - - - - - -'),('지적학과','1 3 3.0 2 - - - - - -'),('광고홍보학과','2 8 4.0 1 78.93 78.25 77.98 4.63 4.69 4.71'),('간호학과','4 26 6.5 4 89.98 86.16 84.55 2.75 3.32 3.59'),('농어촌','76 252 3.3 103 86.10 74.40 73.67 3.13 5.17 5.29'),('특성화고','37 225 6.1 112 93.41 83.75 83.04 1.75 3.64 3.75'),('기회균형','30 151 5.0 64 83.85 75.66 75.27 3.75 5.04 5.09')]:
  v=vals.split();outside=unit in ['농어촌','특성화고','기회균형']
  out.append(row('cju-scan05-15','청주대학교',2026,'수시',unit if outside else '국가보훈 / 지역기회균형','정원외 전체(전형 합계)' if outside else unit,'p.1 재조사 삽입표 원본 시각 대조',admission_type='교과',quota=v[0],applicants=v[1],competition_rate=v[2],fill_count=val(v[3]),cut_70=val(v[9]),cut_other=pairs(['표준점수 최고','표준점수 평균','표준점수70%','내신등급 최고','내신등급 평균','내신등급70%'],v[4:]),metric='교과등급',basis='최종합격자',grade_system='9',note='draft; 재조사 보완; 삽입표 확대 대조; 정원외는 전형 전체 합계로 학과별 수치 아님'))
 for pg,standard,grade in [('농어촌','75.08','5.07'),('특성화고','86.55','3.21'),('기회균형','74.27','5.18')]:
  out.append(row('cju-scan05-17','청주대학교',2024,'수시',pg,'정원외 전체(전형 합계)','p.1 재조사 삽입표 원본 시각 대조',admission_type='교과',cut_other=f'최종등록 표준점수 평균 {standard}; 최종등록 교과등급 평균 {grade}',metric='교과등급',basis='최종등록자',grade_system='9',note='draft; 재조사 보완; 원문에 평균만 공개. 50/70%컷으로 대입하지 않음; 전형 전체 합계로 학과별 수치 아님'))
 save('cju',out)

if __name__=='__main__':
 for name in sys.argv[1:]:globals()[name]()
