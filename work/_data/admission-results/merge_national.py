"""Replace only national expansion university rows; preserve the prior audited master."""
from pathlib import Path
import csv,json,hashlib,io
from collections import Counter
from merge import COLS,NATIONAL_FOUR_YEAR,exclusion_reason
P=Path(__file__).parent;C=P/'national-expansion'
def read(p):
 with p.open(encoding='utf-8-sig',newline='') as f:
  r=csv.DictReader(f);assert r.fieldnames==COLS;return list(r)
def sha(b):return hashlib.sha256(b).hexdigest()
oldbytes=(P/'_all.csv').read_bytes();old=read(P/'_all.csv');new=[];counts={}
for slug in sorted(NATIONAL_FOUR_YEAR):
 rs=read(P/(slug+'.csv'));counts[slug]=len(rs)
 for r in rs:
  assert not exclusion_reason(r),r
  assert all(r[x] for x in ['university','result_year','round','program','recruit_unit','source_url','source_page'])
  assert r['result_year'] in ['2024','2025','2026']
  if r['metric']=='교과등급':
   for k in ['cut_50','cut_70']:
    if r[k]:assert 1<=float(r[k])<=9,r
 new.extend(rs)
assert len({tuple(r.values()) for r in new})==len(new)
univs={r['university'] for r in new};retained=[r for r in old if r['university'] not in univs];result=retained+new
backup=C/'_all.before-national.csv'
if not backup.exists():backup.write_bytes(oldbytes)
baseline=read(backup)
assert [r for r in baseline if r['university'] not in univs]==retained,'An existing university changed during collection; review before merge'
s=io.StringIO(newline='');w=csv.DictWriter(s,COLS);w.writeheader();w.writerows(result);data=s.getvalue().encode('utf-8-sig')
assert (P/'_all.csv').read_bytes()==oldbytes,'Concurrent master edit detected'
(P/'_all.csv').write_bytes(data)
report={'baseline_rows':len(baseline),'retained_rows':len(retained),'new_rows':len(new),'total_rows':len(result),'counts':counts,'baseline_sha256':sha(backup.read_bytes()),'master_sha256':sha(data),'exact_duplicates':0}
(C/'merge-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
cov=Counter((r['university'],r['result_year'],r['round']) for r in result)
lines=['| 대학 | 학년도 | 수시 | 정시 | 기타 |','|---|---|---|---|---|']
for u,y in sorted({(u,y) for u,y,_ in cov}):lines.append(f'| {u} | {y} | {cov[u,y,"수시"]} | {cov[u,y,"정시"]} | {sum(v for (uu,yy,rd),v in cov.items() if uu==u and yy==y and rd not in ["수시","정시"])} |')
(P/'_coverage.md').write_text(f'총 {len(result)}행\n\n'+'\n'.join(lines)+'\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
