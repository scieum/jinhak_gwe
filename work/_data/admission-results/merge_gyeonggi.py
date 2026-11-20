"""Update only this task's school rows, preserving concurrent additions to the master."""
from pathlib import Path
import csv,io,json,hashlib,collections,sys,os,datetime
P=Path(__file__).parent
slugs=sys.argv[1:]
master=P/'_all.csv';before=master.read_bytes();h=hashlib.sha256(before).hexdigest()
reader=csv.DictReader(io.StringIO(before.decode('utf-8-sig')));fields=reader.fieldnames;old=list(reader)
new=[];counts={}
for slug in slugs:
 with (P/(slug+'.csv')).open(encoding='utf-8-sig',newline='') as f:
  r=csv.DictReader(f);assert r.fieldnames==fields,slug;rs=list(r)
 for r in rs:
  assert all(r[k] for k in ['university','result_year','round','program','recruit_unit','source_url']),r
  assert r['result_year'] in ['2024','2025','2026'],r
  assert '.ac.kr/' in r['source_url'],r['source_url']
  assert 'adiga.kr' not in r['source_url']
 assert len({tuple(r.values()) for r in rs})==len(rs),slug
 new.extend(rs);counts[slug]=len(rs)
unis={r['university'] for r in new};keep=[r for r in old if r['university'] not in unis]
result=keep+new
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup=P/'gyeonggi-expansion'/f'_all-before-gyeonggi-{stamp}.csv';backup.write_bytes(before)
temp=P/'_all.gyeonggi.tmp'
with temp.open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fields);w.writeheader();w.writerows(result)
assert hashlib.sha256(master.read_bytes()).hexdigest()==h,'Master changed concurrently; retry after reviewing changes'
os.replace(temp,master)
report={'previous_rows':len(old),'preserved_other_rows':len(keep),'replaced_task_rows':len(old)-len(keep),'task_rows':len(new),'total_rows':len(result),'files':counts,'backup':str(backup)}
(P/'gyeonggi-expansion'/'merge-latest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
