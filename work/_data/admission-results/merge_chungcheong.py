"""Merge validated Chungcheong drafts into the freshest master without collateral changes."""
from pathlib import Path
import csv,io,json,hashlib,os,datetime,collections
from urllib.parse import urlsplit
P=Path(__file__).parent;C=P/'chungcheong-expansion';master=P/'_all.csv'
audit=json.loads((C/'validation.json').read_text(encoding='utf8'))
assert not audit['fatal']
sources=json.loads((C/'source-resolution.json').read_text(encoding='utf8'))
assert not sources['unresolved']
before=master.read_bytes();before_hash=hashlib.sha256(before).hexdigest()
reader=csv.DictReader(io.StringIO(before.decode('utf-8-sig')));fields=reader.fieldnames;old=list(reader)
new=[];files={}
for slug,stats in sorted(audit['counts'].items()):
 f=P/(slug+'.csv');assert hashlib.sha256(f.read_bytes()).hexdigest()==stats['sha256'],f'{slug} changed after validation'
 with f.open(encoding='utf-8-sig',newline='') as h:
  r=csv.DictReader(h);assert r.fieldnames==fields;rows=list(r)
 assert len(rows)==stats['rows']
 for r in rows:
  host=urlsplit(r['source_url']).hostname or ''
  delegated_nsu=r['university']=='남서울대학교' and r['source_url'] in {
   'https://consult.mncapro.co.kr/solution/nsuipsi/common/pdf/2025susi.pdf',
   'https://consult.mncapro.co.kr/solution/nsuipsi/common/pdf/2026susi.pdf'}
  if delegated_nsu:
   # The university admission site directly links this university-specific service.
   links=json.loads((C/'nsu-real.links.json').read_text(encoding='utf8'))
   assert any(x.get('url')=='https://consult.mncapro.co.kr/solution/nsuipsi/' for x in links)
   assert 'NAMSEOUL UNIVERSITY' in (C/'revisit-nsu-consult.html').read_text(encoding='utf8')
  assert host.endswith('.ac.kr') or host in ['namseoul.net','www.namseoul.net'] or delegated_nsu,r['source_url']
 new+=rows;files[slug]=len(rows)
unis={r['university'] for r in new};kept=[r for r in old if r['university'] not in unis]
result=kept+new
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup=C/f'_all-before-chungcheong-{stamp}.csv';backup.write_bytes(before)
temp=P/'_all.chungcheong.tmp'
with temp.open('w',encoding='utf-8-sig',newline='') as h:
 w=csv.DictWriter(h,fields);w.writeheader();w.writerows(result)
with temp.open(encoding='utf-8-sig',newline='') as h:roundtrip=list(csv.DictReader(h))
assert roundtrip==result
assert [r for r in roundtrip if r['university'] not in unis]==kept
assert hashlib.sha256(master.read_bytes()).hexdigest()==before_hash,'Master changed concurrently; review and retry'
os.replace(temp,master)
report={'previous_rows':len(old),'preserved_other_rows':len(kept),'replaced_task_rows':len(old)-len(kept),'task_rows':len(new),'total_rows':len(result),'files':files,'backup':str(backup.relative_to(P)),'before_sha256':before_hash,'after_sha256':hashlib.sha256(master.read_bytes()).hexdigest()}
(C/'merge-latest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
cov=collections.Counter((r['university'],r['result_year'],r['round']) for r in result)
lines=[f'총 {len(result):,}행. 충청권 상세 미확보 내역은 [_chungcheong-report.md](_chungcheong-report.md) 참조.','', '| 대학 | 학년도 | 수시 | 정시 | 기타 |','|---|---|---:|---:|---:|']
for u,y in sorted({(u,y) for u,y,_ in cov}):
 other=sum(n for (uu,yy,rr),n in cov.items() if uu==u and yy==y and rr not in ['수시','정시'])
 lines.append(f'| {u} | {y} | {cov[u,y,"수시"]} | {cov[u,y,"정시"]} | {other} |')
(P/'_coverage.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
