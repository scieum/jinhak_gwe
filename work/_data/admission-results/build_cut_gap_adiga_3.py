"""_cut-gap-40.json 30~38번 대학: 어디가 '대학 제공' 수시 결과표의 50%·70% 컷만 <slug>-adiga.csv로 (2026-11-27).
원본: national-expansion/<slug>-adiga-2024|2025.html (결과공개 화면 본문 표), <slug>-adiga-2026-20|30.html (2027 화면 '전년도 전형결과' 펼침).
값은 원문 그대로. 50/70 칸이 '-'·빈칸·0·문자(미제출)면 넣지 않음. 전형·모집단위는 기존 <slug>.csv와 같은 이름일 때만 그 표기로.
실행: python build_cut_gap_adiga_3.py [slug ...]
"""
import csv,json,re,sys
from collections import Counter
from pathlib import Path
from bs4 import BeautifulSoup
from normalize_incheon_adiga import htmlgrid
from normalize_gyeonggi import clean,compact
P=Path(__file__).parent;X=P/'national-expansion'
COLS='university,result_year,round,admission_type,program,recruit_unit,quota,applicants,competition_rate,fill_count,fill_rate,cut_50,cut_70,cut_other,metric,basis,grade_system,source_url,source_page,note'.split(',')
UNI={'koreatech':'한국기술교육대학교','hanseo':'한서대학교','hansei':'한세대학교','hs':'한신대학교','uhs':'협성대학교','hoseo':'호서대학교'}
def num(x):
 x=compact(x).replace(',','')
 return x if re.fullmatch(r'\d+(?:\.\d+)?',x) else ''
def pos(x):return bool(num(x)) and float(num(x))>0
def labels(g,h):return [' / '.join(dict.fromkeys(v[j] for v in g[:h] if v[j])) for j in range(len(g[0]))]
def ukey(x):return re.sub('[‧・⋅〮]','·',compact(x)).replace('··','·')
def canon(x):
 x=ukey(x).replace('고등학교','고').replace('고교','고')
 for z in ['전형','특별','정원외','(外)','外','신설','(2024)','학생']:x=x.replace(z,'')
 x=re.sub(r'[^가-힣A-Za-z0-9ⅠⅡ]','',x)
 return x.replace('부','',1) if x.startswith('부') and len(x)>1 else x  # '학생부○○'에서 '학생' 제거 뒤 남은 '부'

def older(slug,y):
 key=f'{slug}-adiga-{y}';s=BeautifulSoup((X/(key+'.html')).read_text(encoding='utf8'),'html.parser');out=[]
 for ti,t in enumerate(s.find_all('table'),1):
  if '70%' not in compact(t.get_text()):continue
  g=htmlgrid(t)
  if not g or not g[0]:continue
  h=next((k for k,v in enumerate(g) if any(num(x) for x in v) and not any('%' in x for x in v)),len(g))
  if h==len(g) or h==0:continue
  L=labels(g,h);C=[compact(x) for x in L]
  if any('수능' in c for c in C):continue  # 정시(수능위주) 표
  uc=[j for j,c in enumerate(C) if '모집단위' in c]
  qc=[j for j,c in enumerate(C) if '모집인원' in c]
  if not uc or not qc:continue
  q=next((j for j in qc if '최종' in C[j]),qc[0])
  grade={n:[j for j,c in enumerate(C) if '등급' in c and f'{n}%' in c and '백분위' not in c] for n in (50,70)}
  conv={n:[j for j,c in enumerate(C) if '환산점수' in c and f'{n}%' in c] for n in (50,70)}
  use,metric=(grade,'교과등급') if grade[50] or grade[70] else (conv,'환산점수')
  assert all(len(v)<=1 for v in use.values()),(key,ti,L)
  if not (use[50] or use[70]):continue
  pg=clean(L[q].split(' / ')[0]) if ' / ' in L[q] else ''
  assert pg,(key,ti,L[q])
  typ='교과' if any('환산' in c for c in C) else '종합'
  co=next((j for j,c in enumerate(C) if '경쟁률' in c),None)
  fc=next((j for j,c in enumerate(C) if '충원' in c),None)
  cutlab=L[(use[50] or use[70])[0]].split(' / ');basis=' '.join(z for z in cutlab[1:-1] if z) or cutlab[0]
  for ri,v in enumerate(g[h:],h+1):
   units=list(dict.fromkeys(v[j] for j in uc if v[j]))
   if not units or any(re.search(r'^(합계|계|소계|총계)$',compact(u)) for u in units):continue
   c50=v[use[50][0]] if use[50] else '';c70=v[use[70][0]] if use[70] else ''
   if not (pos(c50) or pos(c70)):continue
   r=dict(result_year=str(y),admission_type=typ,program=pg,units=units,quota=num(v[q]),competition_rate=num(v[co]) if co is not None else '',
     cut_50=num(c50) if pos(c50) else '',cut_70=num(c70) if pos(c70) else '',metric=metric,basis=basis+' 50%·70% cut',
     source_page=f'어디가 {y}학년도 결과공개 / {pg} / HTML 표{ti} 행{ri}',key=key,raw_unit=' '.join(units),raw_pg=pg)
   if fc is not None and pos(v[fc]):
    if '순위' in C[fc]:r['cut_other']=f'충원 합격 순위 {num(v[fc])}'
    else:r['fill_count']=num(v[fc])
   out.append(r)
 return out

def newer(slug):
 out=[]
 for code in ('20','30'):
  key=f'{slug}-adiga-2026-{code}';s=BeautifulSoup((X/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for ti,t in enumerate(s.find_all('table'),1):
   cap=clean(t.find_previous(['h3','h4','h5','strong','p']).get_text(' ',strip=True));g=htmlgrid(t);L=[compact(x) for x in labels(g,3)]
   assert len(g[0])==12 and '환산등급' in L[9] and '50%' in L[9] and '70%' in L[10] and '환산점수' in L[7],(key,ti,L)
   m=re.fullmatch(r'학생부(종합|교과)\((.*?)\)\)?',cap)
   pg=m.group(2) if m else cap;typ=({'종합':'종합','교과':'교과'}[m.group(1)]) if m else {'20':'종합','30':'교과'}[code]
   for ri,v in enumerate(g[3:],4):
    if '정시' in v[0] or any('미제출' in z for z in v):continue
    if pos(v[9]) or pos(v[10]):c50,c70,metric,basis=v[9],v[10],'교과등급','학생부 환산등급 50%·70%'
    elif pos(v[7]) or pos(v[8]):c50,c70,metric,basis=v[7],v[8],'환산점수','학생부 환산점수 50%·70%'
    else:continue
    out.append(dict(result_year='2026',admission_type=typ,program=pg,units=[v[1]],quota=num(v[4]),competition_rate=num(v[5]),fill_count=num(v[6]),
      cut_50=num(c50) if pos(c50) else '',cut_70=num(c70) if pos(c70) else '',metric=metric,basis=basis,cut_other=f'총점 {v[11]}' if pos(v[11]) and metric=='환산점수' else '',
      source_page=f'어디가 2027학년도 화면 / {cap} / 전년도 전형결과(입시결과 상세정보 펼침, 코드 {code}) 표{ti} 행{ri}',key=key,raw_unit=v[1],raw_pg=cap,
      extra='표에 최종등록자 문구 없음(공개표준안 표 형식)'))
 return out

MAP={}  # (slug, year, adiga program) -> existing program; filled by match()
def match(slug,rows,existing):
 for k in {(r['result_year'],r['program']) for r in rows}:
  ex=[o for o in existing if o['result_year']==k[0]]
  units={ukey(u) for r in rows if (r['result_year'],r['program'])==k for u in r['units']+[''.join(r['units'])]}
  cand=Counter()
  for o in ex:
   a,b=canon(o['program']),canon(k[1])
   if a and b and (a==b or a in b or b in a) and ukey(o['recruit_unit']) in units:cand[o['program']]+=1
  best=cand.most_common(2)
  if best and (len(best)==1 or best[0][1]>best[1][1]):
   typ=Counter(o['admission_type'] for o in ex if o['program']==best[0][0] and o['admission_type']).most_common(1)
   MAP[slug,k[0],k[1]]=(best[0][0],typ[0][0] if typ else '')
 # 두 어디가 전형이 같은 입학처 전형 하나로 묶이면 '분명히 같은 것'이 아니므로 대응하지 않음
 dup=Counter((y,v[0]) for (s_,y,_),v in MAP.items() if s_==slug)
 for k in [k for k,v in MAP.items() if k[0]==slug and dup[k[1],v[0]]>1]:del MAP[k]

def build(slug):
 rows=older(slug,2024)+older(slug,2025)+newer(slug)
 existing=[o for o in csv.DictReader(open(P/f'{slug}.csv',encoding='utf-8-sig')) if o['round']=='수시']
 match(slug,rows,existing);out=[]
 for r in rows:
  m=MAP.get((slug,r['result_year'],r['program']))
  if '논술' in r['raw_pg']:r['admission_type']='논술'
  elif re.search('실기|특기자',r['raw_pg']):r['admission_type']='실기'
  pg,typ=m if m else (r['program'],r['admission_type'])
  typ=typ or r['admission_type']
  ex_units={ukey(o['recruit_unit']):o['recruit_unit'] for o in existing if o['result_year']==r['result_year'] and o['program']==pg}
  unit=next((ex_units[ukey(u)] for u in [''.join(r['units'])]+r['units'][::-1] if ukey(u) in ex_units),None)
  note=['draft; 대학 제공 어디가',f'어디가 원문 전형: {r["raw_pg"]}',f'어디가 원문 모집단위: {r["raw_unit"]}']
  if r.get('extra'):note.append(r['extra'])
  note.append('입학처 행 보완' if m and unit else '입학처 미수록 전형·모집단위 보충(명칭이 다른 행은 출처별 확인)')
  out.append(dict(university=UNI[slug],result_year=r['result_year'],round='수시',admission_type=typ,program=pg,recruit_unit=unit or r['raw_unit'],
   quota=r['quota'],competition_rate=r['competition_rate'],fill_count=r.get('fill_count',''),cut_50=r['cut_50'],cut_70=r['cut_70'],cut_other=r.get('cut_other',''),
   metric=r['metric'],basis=r['basis'],grade_system='9',source_url=json.loads((X/(r['key']+'.meta.json')).read_text(encoding='utf8'))['url'],
   source_page=r['source_page'],note='; '.join(note)))
 for o in out:assert o['cut_50'] or o['cut_70'];assert o['metric']!='교과등급' or all(1<=float(o[c])<=9 for c in ('cut_50','cut_70') if o[c]),o
 assert len({tuple(o[c] for c in ('result_year','program','recruit_unit','source_page')) for o in out})==len(out)
 with open(P/f'{slug}-adiga.csv','w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,COLS);w.writeheader();w.writerows({c:o.get(c,'') for c in COLS} for o in out)
 return out

if __name__=='__main__':
 for slug in sys.argv[1:] or UNI:
  out=build(slug)
  print(slug,len(out),dict(sorted(Counter(o['result_year'] for o in out).items())),'보완',sum('입학처 행 보완' in o['note'] for o in out))
  for k,v in sorted(MAP.items()):
   if k[0]==slug:print('   map',k[1],k[2],'->',v)
