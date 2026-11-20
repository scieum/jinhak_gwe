"""Integrate only owned stage-one supplements into the latest concurrently maintained master."""
from pathlib import Path
from collections import Counter
import csv,io,json,hashlib
from merge import COLS
P=Path(__file__).parent;C=P/'national-expansion'
SLUGS=['inha','inu','iccu','ginue','anyang-ganghwa','gachon-medical','chungwoon-incheon','jejunu','jiu']
SUPPLEMENTS=['inha-adiga','iccu-adiga','chungwoon-incheon-adiga','jiu-adiga']
def read(p):
 with p.open(encoding='utf-8-sig',newline='') as f:
  r=csv.DictReader(f);assert r.fieldnames==COLS,p;return list(r)
def data(rs):
 s=io.StringIO(newline='');w=csv.DictWriter(s,COLS);w.writeheader();w.writerows(rs);return s.getvalue().encode('utf-8-sig')
def digest(b):return hashlib.sha256(b).hexdigest()
new=[]
for slug in SUPPLEMENTS:new.extend(read(P/(slug+'.csv')))
for r in new:
 assert all(r[k] for k in ['university','result_year','round','program','recruit_unit','source_url','source_page'])
 assert 'adiga.kr/' in r['source_url']
 assert r['result_year'] in ['2024','2025','2026']
 for k in ['cut_50','cut_70']:
  if r[k]:
   value=float(r[k]);assert value>=0
   if r['metric']=='교과등급':assert 1<=value<=9,r
   if r['metric']=='백분위':assert value<=100,r
assert len({tuple(r.values()) for r in new})==len(new)
oldbytes=(P/'_all.csv').read_bytes();old=read(P/'_all.csv');owned={(r['university'],r['source_url']) for r in new}
retained=[r for r in old if (r['university'],r['source_url']) not in owned]
result=retained+new
assert [r for r in result if (r['university'],r['source_url']) not in owned]==retained
backup=C/('_all.before-stage1-final.'+digest(oldbytes)[:12]+'.csv')
if not backup.exists():backup.write_bytes(oldbytes)
assert (P/'_all.csv').read_bytes()==oldbytes,'Concurrent master edit; rerun against newest master'
newbytes=data(result);(P/'_all.csv').write_bytes(newbytes)
# Stage-one extracts include the common Gyeongin campus rows once; they are not
# duplicated in the master or moved out of the pre-existing Gyeonggi partition.
names={r['university'] for slug in SLUGS+SUPPLEMENTS for r in read(P/(slug+'.csv'))}
stage=[r for r in result if r['university'] in names]
(P/'_incheon-jeju.csv').write_bytes(data(stage))
jeju=[r for r in stage if r['university'] in ['제주대학교','제주국제대학교']]
incheon=[r for r in stage if r not in jeju and '경인교육대학교' not in r['university']]
(P/'_all-인천.csv').write_bytes(data(incheon));(P/'_all-제주.csv').write_bytes(data(jeju))
coverage=Counter((r['university'],r['result_year'],r['round']) for r in stage)
covrows=[]
for u in sorted(names):
 for y in ['2024','2025','2026']:
  rs=[r for r in stage if r['university']==u and r['result_year']==y]
  covrows.append({'university':u,'result_year':y,'susi_rows':coverage[u,y,'수시'],'jeongsi_rows':coverage[u,y,'정시'],'other_rows':sum(1 for r in rs if r['round'] not in ['수시','정시']),'rows_with_cut':sum(bool(r['cut_50'] or r['cut_70']) for r in rs),'adiga_rows':sum('adiga.kr/' in r['source_url'] for r in rs),'status':'공개자료 부분 수집; 전형 전체 완료를 뜻하지 않음' if rs else '미확보/미공개'})
with (P/'_incheon-jeju-coverage.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,list(covrows[0]));w.writeheader();w.writerows(covrows)
sources=[]
for url in sorted({r['source_url'] for r in stage}):
 rs=[r for r in stage if r['source_url']==url]
 sources.append({'university':' / '.join(sorted({r['university'] for r in rs})),'result_year':' / '.join(sorted({r['result_year'] for r in rs})),'source_type':'대학 제공 어디가 보충' if 'adiga.kr/' in url else '대학 입학처 원문','source_url':url,'rows':len(rs)})
with (P/'_incheon-jeju-sources.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,list(sources[0]));w.writeheader();w.writerows(sources)
audit={'date':'2026-11-19','master_before_rows':len(old),'master_after_rows':len(result),'retained_other_rows':len(retained),'owned_supplement_rows':len(new),'stage1_rows':len(stage),'incheon_rows':len(incheon),'jeju_rows':len(jeju),'common_ginue_rows':len(stage)-len(incheon)-len(jeju),'new_exact_duplicates':0,'before_sha256':digest(oldbytes),'after_sha256':digest(newbytes),'source_counts':{slug:len(read(P/(slug+'.csv'))) for slug in SLUGS+SUPPLEMENTS}}
(C/'stage1-validation.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
# Coverage summary only; leave other regions' source files and their edits intact.
full=Counter((r['university'],r['result_year'],r['round']) for r in result)
lines=['| 대학 | 학년도 | 수시 | 정시 | 기타 |','|---|---|---|---|---|']
for u,y in sorted({(u,y) for u,y,_ in full}):lines.append(f'| {u} | {y} | {full[u,y,"수시"]} | {full[u,y,"정시"]} | {sum(n for (uu,yy,rd),n in full.items() if uu==u and yy==y and rd not in ["수시","정시"])} |')
(P/'_coverage.md').write_text(f'총 {len(result)}행\n\n'+'\n'.join(lines)+'\n',encoding='utf8')
print(json.dumps(audit,ensure_ascii=False))
