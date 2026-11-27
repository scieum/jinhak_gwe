"""Cut-gap batch 2 (_cut-gap-40.json idx 20-29): 수시 50%/70% cut rows from adiga '대학 제공' tables.
Reads national-expansion/<slug>-adiga-cut-<year>[-<code>].html (fetch_cut_gap_adiga.py).
Values are copied as printed; '-', blank, 미제출, 0/0.0 are skipped (not used / not submitted).
usage: python build_cut_gap_adiga.py [--dump]"""
import csv,re,sys,json,glob,os
from pathlib import Path
from collections import Counter
from bs4 import BeautifulSoup
from normalize_incheon_adiga import htmlgrid
P=Path(__file__).parent;X=P/'national-expansion'
COLS='university,result_year,round,admission_type,program,recruit_unit,quota,applicants,competition_rate,fill_count,fill_rate,cut_50,cut_70,cut_other,metric,basis,grade_system,source_url,source_page,note'.split(',')
PAGE='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=%s&searchSyr=%d'
CODES={'jnue':'0000258','cje':'0000261','chuncheon-education':'0000262','ptu':'0000186','hknu':'0000037','tukorea':'0000247','yungsan':'0000155','yewon-imsil':'0000218','postech':'0000188'}
def c(x):return re.sub(r'\s+','',x or '')
def val(x):
 x=(x or '').strip()
 if not re.fullmatch(r'\d+(\.\d+)?',x) or float(x)==0:return ''  # '-', blank, 미제출/안내 문구, 0.0 = not used
 return x
def caption(t):
 for e in t.previous_elements:
  if isinstance(e,str) and e.strip() and not e.find_parent(['table','style','script']):
   z=e.strip()
   if re.match(r'^(학생부|논술|실기|수능|기타|특기)',z) and len(z)<80:return z
  if getattr(e,'name',None)=='table':return ''
 return ''
def tables(slug):
 """yield (year, file, table index, section, adiga program, header labels, data rows)"""
 for f in sorted(glob.glob(str(X/f'{slug}-adiga-cut-*.html'))):
  y=int(re.search(r'-cut-(\d{4})',f)[1]);s=BeautifulSoup(open(f,encoding='utf8').read(),'html.parser')
  for ti,t in enumerate(s.find_all('table')):
   tx=c(t.get_text())
   if not(re.search(r'50%',tx) and '70%' in tx):continue
   g=htmlgrid(t);h0=c(g[0][0])
   h=next((i for i,r in enumerate(g) if c(r[0])!=h0),len(g))
   labs=[' / '.join(dict.fromkeys(r[j].strip() for r in g[:h] if r[j].strip())) for j in range(len(g[0]))]
   sec=next((p.get('id') for p in t.parents if re.fullmatch(r'con_\d\d',p.get('id',''))),'')
   yield y,os.path.basename(f),ti,sec,h0,labs,g[h:],t
def pick(labs,kind):
 """columns for 50/70 of a kind: grade(등급) or score(환산점수)"""
 out={}
 for j,l in enumerate(labs):
  parts=[c(p) for p in l.split(' / ')]
  if len(parts)<2:continue
  par,last=parts[-2],parts[-1]
  if kind=='grade' and '등급' not in par:continue
  if kind=='score' and ('점수' not in par or '등급' in par):continue
  for n in(50,70):
   if re.match(r'%d%%'%n,last):out.setdefault(n,[]).append(j)
 return out
def raw(slug):
 rows=[];skipped=Counter()
 for y,f,ti,sec,h0,labs,data,t in tables(slug):
  new=h0=='구분' and any('최초' in l for l in labs)
  prog=caption(t) if new else (labs[1].split(' / ')[0] if len(labs)>1 else '')
  title=''
  if not new:
   ctx=''
   for e in t.previous_elements:
    if getattr(e,'name',None)=='table':break
    if isinstance(e,str) and e.strip() and not e.find_parent(['table','style','script']):ctx=e.strip()+' '+ctx
    if len(ctx)>200:break
   m=re.search(r'([가-힣A-Za-z0-9]+)\s*전형\s*결과',ctx)
   if m and '학년도' not in m[1] and c(m[1]) not in c(prog):title=m[1]
  if sec.startswith('con_4'):skipped['정시 표(con_4)']+=1;continue
  g=pick(labs,'grade');sc=pick(labs,'score')
  for v in data:
   rd='수시'
   if new:
    rd=v[0].strip()
    if not rd.startswith('수시'):skipped['표 속 정시 행']+=1;continue
    unit=v[1].strip()
   else:unit=v[0].strip()
   if not unit or c(unit)=='계' or any(k in unit for k in('합계','소계','총계')):continue
   got=None
   for kind,cols,metric in(('grade',g,'교과등급'),('score',sc,'환산점수')):
    if 50 not in cols or 70 not in cols:continue
    if len(cols[50])>1 or len(cols[70])>1:
     # several grade columns (e.g. 전과목/국영수): keep each pair separately
     pairs=list(zip(cols[50],cols[70]))
    else:pairs=[(cols[50][0],cols[70][0])]
    vals=[(a,b,val(v[a]),val(v[b])) for a,b in pairs]
    vals=[x for x in vals if x[2] or x[3]]
    if vals:got=(metric,vals);break
   if not got:skipped['50·70 칸 비었음/-/0/미제출']+=1;continue
   extra=''
   if got[0]=='교과등급' and 50 in sc and 70 in sc and len(sc[50])==1==len(sc[70]):
    s50,s70=val(v[sc[50][0]]),val(v[sc[70][0]])
    tot=next((v[j].strip() for j,l in enumerate(labs) if '총점' in c(l) and val(v[j])),'')
    if s50 or s70:extra='환산점수 50%% %s / 70%% %s'%(s50 or '-',s70 or '-')+(' (총점 %s)'%tot if tot else '')
   for a,b,c50,c70 in got[1]:
    rows.append(dict(extra=extra,year=y,file=f,ti=ti,new=new,sec=sec,title=title,prog=prog,unit=unit,metric=got[0],c50=c50,c70=c70,l50=labs[a],l70=labs[b],labs=labs,v=v))
 return rows,skipped
LABEL={'jnue':'전주교육대학교','cje':'청주교육대학교','chuncheon-education':'춘천교육대학교','ptu':'평택대학교','hknu':'한경국립대학교','tukorea':'한국공학대'}
OUTNAME={'jnue':'jnue-adiga-cut.csv'}  # jnue-adiga.csv already exists: write only the missing cut rows to a new file
def nprog(p,slug=''):
 p=re.sub(r'[·・‧]','',c(p))
 if slug=='hknu':p=re.sub(r'(?<=[가-힣])P\)$',')',p).replace('지역균형선발','지역균형')
 p=re.sub(r'^학생부(종합|교과)\((.*)\)$',r'\2',p);p=re.sub(r'\((학생부(종합|교과)|A,?P|안성,?평택|안성)\)','',p)
 return re.sub(r'(특별)?전형$','',p.replace('Ⅰ','I').replace('Ⅱ','II'))
def nunit(u):return re.sub(r'[·・‧()]','',c(u))
def build(slug):
 base=list(csv.DictReader(open(P/f'{slug}.csv',encoding='utf-8-sig')));base=[b for b in base if b['round']=='수시']
 rows,sk=raw(slug);out=[];review=[];cd=CODES[slug]
 progs={};units={};camp={}
 for b in base:
  progs.setdefault(b['result_year'],{}).setdefault(nprog(b['program'],slug),set()).add(b['program'])
  units.setdefault(nunit(b['recruit_unit']),Counter())[b['recruit_unit']]+=1
  camp.setdefault(nunit(b['recruit_unit']),set()).add(b['university'])
 keys={(b['result_year'],b['program'],b['recruit_unit']) for b in base}
 for r in rows:
  y=str(r['year']);v=r['v'];labs=r['labs'];cl=[c(l) for l in labs]
  prog_raw=r['prog'];unit_raw=r['unit'];notes=[]
  if c(labs[0]).startswith('전형명'):  # 전형별 통합 공개 행
   prog_raw,unit_raw=unit_raw,('초등교육학과' if 'education' in slug else '선발인원 3명 이하 모집단위(전형별 공개)')
   notes.append('어디가 표가 전형명 단위 공개')
  # program
  if r['title']:notes.append("표 머리글 전형명은 '%s'이나 표 제목은 '%s 전형 결과'라 제목 기준"%(prog_raw.strip(),r['title']));prog_raw=r['title']
  np_=nprog(prog_raw,slug);cand=progs.get(y,{}).get(np_)
  if not cand:cand={p for yy in progs for k,ps in progs[yy].items() if k==np_ for p in ps}
  program=sorted(cand)[0] if cand and len(cand)==1 else prog_raw.strip()
  if program!=prog_raw.strip():notes.append('어디가 원문 전형명: %s'%prog_raw.strip())
  # unit
  nu=nunit(unit_raw);uc=None
  def fuzzy(b):return nunit(b).startswith(nu+'(') or nunit(b).endswith('('+nu+')') or c(b).startswith(c(unit_raw)+'(') or c(b).endswith('('+c(unit_raw)+')')
  sp=[b['recruit_unit'] for b in base if b['result_year']==y and b['program']==program];sy=[b['recruit_unit'] for b in base if b['result_year']==y]
  # order: same year+program exact, then '(…)' variant; same year exact/variant; any year exact (a variant must be unique)
  for pool,test in((sp,lambda b:nunit(b)==nu),(sp,fuzzy),(sy,lambda b:nunit(b)==nu),(sy,fuzzy)):
   hit={b for b in pool if test(b)}
   if len(hit)==1:uc=Counter({hit.pop():1});break
   if hit:break
  if not uc:uc=units.get(nu)
  if slug in('cje','chuncheon-education','jnue') and nu in('초등교육학과','초등교육과'):uc=Counter({ {'cje':'초등교육과','jnue':'초등교육과','chuncheon-education':'초등교육학과'}[slug]:1})
  if not uc and nu=='모집단위미지정':
   # 전형 통합 공개 행: same-year existing row of the same program, single row with the same quota
   q=v[1].strip();same=[b for b in base if b['result_year']==y and b['program']==program]
   same=[b for b in same if b['quota']==q]
   if len(same)>1:same=[b for b in same if '전형별요약' in b['recruit_unit']]
   if len(same)==1:uc=Counter({same[0]['recruit_unit']:1})
  unit=uc.most_common(1)[0][0] if uc else unit_raw.strip()
  if unit!=unit_raw.strip():notes.append('어디가 원문 모집단위: %s'%unit_raw.strip())
  # campus
  uni=LABEL[slug]
  if slug=='hknu':
   cs={x for x in camp.get(nu,set()) if '(' in x}
   if (r['new'] and re.search(r'P\)$',c(r['prog']))) or '(평택)' in unit_raw:uni='한경국립대학교(평택)'
   elif c(prog_raw).endswith('(안성)'):uni='한경국립대학교(안성)'
   elif len(cs)==1:uni=cs.pop()
   else:notes.append('캠퍼스 미확인(기존 행에서 모집단위 캠퍼스 대응 없음/복수)')
  # numbers
  def col(pat,excl=None):
   j=next((j for j,x in enumerate(cl) if re.search(pat,x) and not(excl and re.search(excl,x))),None)
   return v[j].strip() if j is not None and v[j].strip() not in('-','') else ''
  quota=col(r'최종\(A\)\+\(B\)') if r['new'] else col(r'^모집인원$|모집인원$')
  comp=col(r'경쟁률');fill='';other=[]
  f=col(r'충원(합격)?인원');rank=col(r'충원합격순위')
  if f:fill=f
  if rank:other.append('충원 합격 순위 '+rank)
  if r['extra']:other.append(r['extra'])
  if r['metric']=='교과등급':
   try:
    if any(float(x)>9 for x in(r['c50'],r['c70']) if x):notes.append('원문 컷 값이 9등급 범위 밖(원문 그대로)')
   except ValueError:notes.append('컷 값 비수치(원문 그대로)')
  parts=r['l50'].split(' / ')
  if not r['new'] and len(parts)>=3:parts=parts[1:]  # first header part is the 전형명 banner
  basis=' / '.join(parts[:-1])+(' 50%·70%' if r['new'] else ' 50% cut·70% cut')
  page='어디가 %d학년도 결과공개 / %s / 표 %d'%(r['year'],prog_raw.strip(),r['ti']) if not r['new'] else '어디가 %d학년도 화면 / %s / 전년도 전형결과(입시결과 상세정보 펼침)'%(r['year']+1,prog_raw.strip())
  key=(y,program,unit)
  nt=['draft; 대학 제공 어디가']+notes
  if r['new']:nt.append('표에 최종등록자 문구 없음(공개표준안 표 형식)')
  if key in keys:nt.append('입학처 행 보완')
  admission=('종합' if r['file'].endswith('-20.html') else '교과') if r['new'] else {'con_2':'종합','con_3':'교과'}[r['sec'][:5]]
  out.append(dict(university=uni,result_year=y,round='수시',admission_type=admission,program=program,recruit_unit=unit,quota=quota,competition_rate=comp,fill_count=fill,
   cut_50=r['c50'],cut_70=r['c70'],cut_other='; '.join(other),metric=r['metric'],basis=basis,grade_system='9' if r['metric']=='교과등급' else '',
   source_url=PAGE%(cd,r['year']+1),source_page=page,note='; '.join(nt)))
 return out,sk
if __name__=='__main__' and '--dump' not in sys.argv:
 summary={}
 for slug in sys.argv[1:] or LABEL:
  out,sk=build(slug)
  seen=Counter((o['university'],o['result_year'],o['program'],o['recruit_unit'],o['metric']) for o in out)
  assert all(n==1 for n in seen.values()),[k for k,n in seen.items() if n>1]
  if not out:summary[slug]=dict(rows=0,skipped=dict(sk));continue
  fn=OUTNAME.get(slug,f'{slug}-adiga.csv')
  assert fn not in('jnue-adiga.csv','yewon-imsil-adiga.csv')
  w=csv.DictWriter(open(P/fn,'w',encoding='utf-8-sig',newline=''),COLS);w.writeheader()
  out.sort(key=lambda o:(o['result_year'],o['program'],o['recruit_unit']))
  for o in out:w.writerow({k:o.get(k,'') for k in COLS})
  summary[slug]=dict(file=fn,rows=len(out),by_year=dict(Counter(o['result_year'] for o in out)),supplement=sum('입학처 행 보완' in o['note'] for o in out),skipped=dict(sk))
 print(json.dumps(summary,ensure_ascii=False,indent=1))
if __name__=='__main__' and '--dump' in sys.argv:
 for slug in sys.argv[2:]:
  rows,sk=raw(slug);print('=====',slug,len(rows),dict(sk))
  for r in rows:print(r['year'],r['file'][-12:],'T%d'%r['ti'],r['prog'],'|',r['unit'],'|',r['metric'],r['c50'],r['c70'],'|',r['l50'])
