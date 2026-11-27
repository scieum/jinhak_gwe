"""_cut-gap-40.json 10~19: 어디가 '대학 제공' 결과표에서 수시 50%·70% 컷만 <slug>-adiga.csv로 보충.
원본: national-expansion/<key>-adiga-2024|2025.html(GET, 결과 학년도+1 화면), <key>-adiga-2026-20|30.html(POST 아코디언).
추정·계산 없음: 원문 칸 값 그대로, '-'·빈칸·0은 넣지 않음."""
import csv,json,re,sys
from collections import Counter
from pathlib import Path
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')
from normalize_incheon_adiga import htmlgrid
from normalize_gyeonggi import clean,compact,FIELDS
from normalize_daegu_adiga import canon
ROOT=Path(__file__).parent;X=ROOT/'national-expansion'
JOBS=[('daejin','daejin','대진대학교'),('mokwon','mokwon','목원대학교'),('pcu','pcu','배재대학교'),('bu','bu','백석대학교'),('sjs','sjs','서울장신대학교'),
 ('suwon','suwon','수원대학교'),('sch','sch','순천향대학교'),('shinhan-0002712','shinhan','신한대학교'),('shinhan-0002800','shinhan','신한대학교'),('acts','acts','아신대학교'),
 ('anyang-0000147','anyang','안양대학교(안양)'),('anyang-0000148','anyang-ganghwa','안양대학교(강화)')]
def num(x):
 x=compact(x).replace(',','')
 return x if re.fullmatch(r'\d+(\.\d+)?',x) and float(x)>0 else ''
def unitkey(u):return re.sub(r'[\[(]교직[\])]|[♣◆]','',re.sub(r'[・ㆍ•∙〮]','·',compact(u)))  # 교직 표시·입학처 기호만 다른 같은 이름
def meta(key):return json.loads((X/(key+'.meta.json')).read_text(encoding='utf8'))
AUDIT=[]
# 원문 표 머리말이 앞 표와 같은 전형명으로 반복된 표(행 값이 입학처 다른 전형과 일치; 아래 main에서 검증)
RELABEL={('shinhan-0002712-adiga-2025',14):'신한국인전형'}
def cutbasis(lab):return lab.split(' / ')[-2] if ' / ' in lab else lab
def old(key,y):
 out=[]
 for ti,t in enumerate(BeautifulSoup((X/(key+'.html')).read_text(encoding='utf8'),'html.parser').find_all('table')):
  g=htmlgrid(t)
  if not g or len(g[0])<5:continue
  h0=1 if len(set(g[0]))==1 else 0  # 표 맨 위가 전형명 한 칸(안양대 2025 형식)
  first=compact(g[h0][0])
  if first not in ('모집단위','전형명'):continue   # '구분'(가·나·다군) 표는 정시, '전형' 표는 요약
  byprog=first=='전형명'  # 행마다 전형 하나: 소수 모집단위를 전형별로 묶어 공개한 표
  if byprog:
   ctx=' '.join(e.get_text(' ',strip=True) for e in t.find_all_previous(['p','h3','h4','h5','strong'],limit=3))
   gunit='선발인원 3명 이하 모집단위(전형별 공개)' if re.search(r'3\s*명\s*이하',ctx) else '전체 모집단위(전형별 공개)'
  h=next((j for j in range(h0,len(g)) if compact(g[j][0])!=first),len(g))
  labs=[' / '.join(dict.fromkeys(clean(g[r][c]) for r in range(h0,h) if g[r][c])) for c in range(len(g[0]))]
  cl=[compact(x).lower() for x in labs]
  pg=re.sub(r'\s*전형$','',clean(g[0][0])) if h0 else '' if byprog else clean(g[0][1])
  relabel=RELABEL.get((key,ti))
  if relabel:pg=relabel
  isgrade=lambda c:('학생부등급' in c or '환산등급' in c) and '대학별환산' not in c
  gr={n:[j for j,c in enumerate(cl) if f'{n}%cut' in c and isgrade(c)] for n in (50,70)}
  cv={n:[j for j,c in enumerate(cl) if f'{n}%cut' in c and '대학별환산' in c] for n in (50,70)}
  if not any(gr.values()) and not any(cv.values()):continue
  assert all(len(v)<=1 for v in list(gr.values())+list(cv.values())),(key,ti,labs)
  assert '최종등록자' in ''.join(cl),(key,ti,labs)
  q=next(j for j,c in enumerate(cl) if '모집인원' in c);co=next((j for j,c in enumerate(cl) if '경쟁률' in c),None)
  fr=next((j for j,c in enumerate(cl) if '충원합격순위' in c),None);fc=next((j for j,c in enumerate(cl) if '충원인원' in c or '충원합격인원' in c),None)
  n=0
  for ri,v in enumerate(g[h:],h+1):
   unit=clean(v[0])
   if not unit or '합계' in unit:continue
   if byprog:pg,unit=unit,gunit
   typ='실기' if '실기' in pg else '종합' if ('종합' in pg or not any(cv.values())) else '교과'
   G={k:num(v[j[0]]) if j else '' for k,j in gr.items()};C={k:num(v[j[0]]) if j else '' for k,j in cv.items()}
   other=[]
   if any(G.values()):c50,c70,metric=G[50],G[70],'교과등급';basis=cutbasis(labs[(gr[50] or gr[70])[0]])
   elif any(C.values()):c50,c70,metric=C[50],C[70],'환산점수';basis=cutbasis(labs[(cv[50] or cv[70])[0]])
   else:continue
   if metric=='교과등급':
    if any(c and not 1<=float(c)<=9 for c in (c50,c70)):AUDIT.append((key,ti,unit,'등급 범위 밖',c50,c70));continue
    if any(C.values()):other.append('대학별환산 최종등록자 환산점수 50%% cut %s / 70%% cut %s'%(C[50] or '-',C[70] or '-'))
   if fr is not None and compact(v[fr]) not in ('','-'):other.append('충원 합격 순위 '+clean(v[fr]))
   out.append(dict(result_year=str(y),round='수시',admission_type=typ,program=pg,recruit_unit=unit,quota=num(v[q]) or compact(v[q]),
    competition_rate=compact(v[co]) if co is not None else '',fill_count=compact(v[fc]) if fc is not None and compact(v[fc])!='-' else '',
    cut_50=c50,cut_70=c70,cut_other='; '.join(other),metric=metric,basis=basis,grade_system='9' if metric=='교과등급' else '',
    source_url=meta(key)['url'],source_page=f'어디가 {y}학년도 결과공개 / {pg} / HTML 표{ti+1} 행{ri}',
    _note=f'원문 표 머리말은 "{clean(g[0][1])}"(앞 표 머리말 반복으로 보임); 모집인원·경쟁률이 입학처 {relabel}과 같아 {relabel}으로 대응' if relabel else ''));n+=1
  AUDIT.append((key,ti,pg,n))
 return out
def new(key):
 out=[]
 for suf,typ in (('20','종합'),('30','교과')):
  k=f'{key}-2026-{suf}'
  for ti,t in enumerate(BeautifulSoup((X/(k+'.html')).read_text(encoding='utf8'),'html.parser').find_all('table'),1):
   cap=clean(t.find_previous(['h3','h4','h5','strong','p']).get_text(' ',strip=True));g=htmlgrid(t)
   hd=[compact(' '.join(g[r][c] for r in range(3))) for c in range(len(g[0]))]
   assert len(hd)==12 and '환산등급' in hd[9] and '50%' in hd[9] and '70%' in hd[10] and '환산점수' in hd[7],(k,ti,hd)
   n=0
   for ri,v in enumerate(g[3:],4):
    if len(set(v))<=2 or '미제출' in ''.join(v):continue
    if compact(v[0])!='수시':continue
    G=num(v[9]),num(v[10]);C=num(v[7]),num(v[8])
    if any(G):(c50,c70),metric,basis=G,'교과등급','학생부 환산등급 50%·70%'
    elif any(C):(c50,c70),metric,basis=C,'환산점수','학생부 환산점수 50%·70%'
    else:continue
    if metric=='교과등급' and any(c and not 1<=float(c)<=9 for c in (c50,c70)):AUDIT.append((k,ti,v[1],'등급 범위 밖',c50,c70));continue
    other=['학생부 환산점수 50%% %s / 70%% %s'%(C[0] or '-',C[1] or '-')] if metric=='교과등급' and any(C) else []
    pg=cap
    out.append(dict(result_year='2026',round='수시',admission_type=typ,program=pg,recruit_unit=clean(v[1]),quota=num(v[4]) or compact(v[4]),competition_rate=compact(v[5]),
     fill_count=compact(v[6]) if compact(v[6])!='-' else '',cut_50=c50,cut_70=c70,cut_other='; '.join(other),metric=metric,basis=basis+'(표에 최종등록자 문구 없음)',
     grade_system='9' if metric=='교과등급' else '',source_url=meta(k)['url'],source_page=f'어디가 2027학년도 화면 / {cap} / 전년도 전형결과(POST 아코디언 {suf}) 표{ti} 행{ri}',_note=f'어디가 원문 표 제목: {cap}'));n+=1
   AUDIT.append((k,ti,cap,n))
 return out
def match(r,existing):
 same=[o for o in existing if o['result_year']==r['result_year'] and o['round']=='수시']
 c=[o for o in same if unitkey(o['recruit_unit'])==unitkey(r['recruit_unit'])]
 if not c:  # 어디가 '전공'만 ↔ 입학처 '학부(전공)'처럼 괄호 안 이름이 정확히 같을 때만
  inner=lambda u:(re.fullmatch(r'.+\((.+)\)',unitkey(u)) or [None,None])[1]
  c=[o for o in same if inner(o['recruit_unit'])==unitkey(r['recruit_unit']) or inner(r['recruit_unit'])==unitkey(o['recruit_unit'])]
  if len({o['recruit_unit'] for o in c})>1:c=[]
 a=canon2(r['program']);a=ALIAS.get((r['university'],a),a)
 progs={o['program'] for o in c if canon2(o['program'])==a}
 if len(progs)>1:progs={o['program'] for o in c if o['program'] in progs and o['admission_type']==r['admission_type']}
 if len(progs)==1:return [o for o in c if o['program'] in progs]
 UNMATCHED[(r['university'],r['result_year'],r['program'],a,'전형명 있음' if any(canon2(o['program'])==a for o in existing if o['result_year']==r['result_year'] and o['round']=='수시') else '전형명 없음')]+=1
 return []
def canon2(p):
 p=re.sub(r'\((\s*학생부종합전형[^)]*|\s*2025\s*학년도\s*전형명[^)]*)\)','',p)  # 백석 '(학생부종합전형 / 서류평가 100%)', 배재 2024 '(2025학년도 전형명: …)' 덧말
 x=canon(p).replace('Ⅰ','I').replace('Ⅱ','II').replace('특별','')
 return re.sub(r'1$','I',re.sub(r'2$','II',x))+('#정원외' if '정원외' in p else '')  # canon은 '정원외'를 지워 정원내 전형과 섞임
# 입학처 전형명과 분명히 같은 어디가 전형명(canon2 기준): (university, 어디가) -> 입학처
ALIAS={('서울장신대학교','교역자추천자'):'교역자추천',('서울장신대학교','담임목사추천자'):'담임목사추천',('서울장신대학교','면접중심일반'):'일반면접중심',
 ('서울장신대학교','면접중심교역자추천자'):'교역자추천면접중심',('서울장신대학교','실기실적일반'):'일반실기',
 ('대진대학교','기초생활수급권자및차상위계층'):'기초생활차상위'}
UNMATCHED=Counter()
def units(slug):return {unitkey(r['recruit_unit']) for r in csv.DictReader((ROOT/(slug+'.csv')).open(encoding='utf-8-sig'))}
CAMPUS={'안양대학교(안양)':units('anyang'),'안양대학교(강화)':units('anyang-ganghwa')}
res={};seen=set();UNKNOWN=[]
for pseudo,slug,u in JOBS:
 rows=old(f'{pseudo}-adiga-2024',2024)+old(f'{pseudo}-adiga-2025',2025)+new(f'{pseudo}-adiga')
 for r in rows:
  r['university']=u
  if u in CAMPUS:  # 0000147·0000148 화면의 2025 결과표가 같은 통합 표라 모집단위로 캠퍼스를 나눔
   hit=[c for c,s in CAMPUS.items() if unitkey(r['recruit_unit']) in s]
   if len(hit)==1:r['university']=hit[0]
   else:UNKNOWN.append((pseudo,r['result_year'],r['program'],r['recruit_unit']))
   slug='anyang' if r['university']=='안양대학교(안양)' else 'anyang-ganghwa'
  k=(r['university'],r['result_year'],r['program'],r['recruit_unit'],r['quota'],r['cut_50'],r['cut_70'])
  if k in seen:continue  # 두 코드 화면에 같은 표가 반복된 행
  seen.add(k);res.setdefault(slug,[]).append(r)
for slug,rows in res.items():
 existing=list(csv.DictReader((ROOT/(slug+'.csv')).open(encoding='utf-8-sig')))
 for r in rows:
  m=match(r,existing);orig=f"어디가 원문 전형·모집단위: {r['program']} / {r['recruit_unit']}"
  if '앞 표 머리말 반복' in r['_note']:assert m and (m[0]['quota'],m[0]['competition_rate'])==(r['quota'],r['competition_rate']),r
  if m:
   o=m[0];r.update(program=o['program'],recruit_unit=o['recruit_unit'],admission_type=o['admission_type'])
   tail='입학처 행 보완; '+orig
  else:tail='입학처에 같은 전형·모집단위 행 없음(어디가 원문명, 전형 유형은 어디가 표 형식으로 분류); '+orig
  r['note']='; '.join(x for x in ['draft; 대학 제공 어디가',tail,r.pop('_note')] if x)
print('campus unknown',len(UNKNOWN),UNKNOWN[:10])
for k,n in sorted(UNMATCHED.items()):print('UNMATCHED',k,n)
if '-v' in sys.argv:
 for slug,rows in res.items():
  ex=list(csv.DictReader((ROOT/(slug+'.csv')).open(encoding='utf-8-sig')))
  for r in rows:
   if '입학처 행 보완' in r['note']:continue
   a=ALIAS.get((r['university'],canon2(r['program'])),canon2(r['program']))
   cand=sorted({o['recruit_unit'] for o in ex if o['result_year']==r['result_year'] and o['round']=='수시' and canon2(o['program'])==a})
   if cand:print('UNIT',r['university'],r['result_year'],r['program'],'|',r['recruit_unit'],'|',cand)
for slug,rows in res.items():
 keys=Counter((r['university'],r['result_year'],r['program'],r['recruit_unit']) for r in rows)
 dup=[k for k,n in keys.items() if n>1]
 rows.sort(key=lambda r:(r['result_year'],r['program'],r['recruit_unit'],r['source_page']))
 with (ROOT/(slug+'-adiga.csv')).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,FIELDS);w.writeheader();w.writerows({c:r.get(c,'') for c in FIELDS} for r in rows)
 print(slug,len(rows),dict(sorted(Counter(r['result_year'] for r in rows).items())),'보완',sum('입학처 행 보완' in r['note'] for r in rows),'metric',dict(Counter(r['metric'] for r in rows)),'dup',len(dup),dup[:3])
(X/'cut-gap-1-audit.json').write_text(json.dumps(AUDIT,ensure_ascii=False,indent=0),encoding='utf8')
