"""Validate source drafts, combine compatible records and flag source inconsistencies.

Does not calculate or replace any admissions statistics. Audit ratios are diagnostics only.
"""
from pathlib import Path
import csv,json,re,collections,hashlib
P=Path(__file__).parent;C=P/'chungcheong-expansion'
regions=json.loads((C/'target-regions.json').read_text(encoding='utf8'))
slugs=sorted(set(sum(regions.values(),[]))-{'chungbuk'})
issues=[];counts={};merges=[];fatal=[]
if (C/'validation.json').exists():
 merges=json.loads((C/'validation.json').read_text(encoding='utf8')).get('combined_records',[])
for slug in slugs:
 f=P/(slug+'.csv')
 if not f.exists():continue
 with f.open(encoding='utf-8-sig',newline='') as h:
  reader=csv.DictReader(h);fields=reader.fieldnames;rs=list(reader)
 grouped={};result=[]
 for r in rs:
  if slug=='semyung':
   # Explicit type prefixes vary between sheets of the same workbook.
   canonical=re.sub(r'^\[학생부(?:교과|종합)\]\s*','',r['program']).removesuffix('전형')
  else:canonical=r['program']
  key=tuple(r[k] for k in ['university','result_year','round','recruit_unit','source_url'])+(canonical,)
  old=grouped.get(key)
  if old is not None and slug in ['hoseo','semyung']:
   statfields=['quota','applicants','competition_rate','fill_count','fill_rate','cut_50','cut_70','metric','basis','grade_system','admission_type']
   assert all(not old[k] or not r[k] or old[k]==r[k] for k in statfields),(slug,key,'conflicting records')
   for k in statfields:
    if not old[k]:old[k]=r[k]
   for k in ['cut_other','source_page','note']:
    old[k]='; '.join(dict.fromkeys(x for x in [old[k],r[k]] if x))
   merges.append({'slug':slug,'key':key,'source_page':r['source_page']});continue
  grouped[key]=r;result.append(r)
 for i,r in enumerate(result,2):
  for k in ['university','result_year','round','program','recruit_unit','source_url','source_page']:
   if not r.get(k):fatal.append([slug,i,'missing '+k])
  if r['result_year'] not in ['2024','2025','2026']:fatal.append([slug,i,'year'])
  if r['round'] not in ['수시','정시','추가','우선선발','기타']:fatal.append([slug,i,'round'])
  if 'adiga.kr' in r['source_url']:fatal.append([slug,i,'excluded source'])
  for k in ['cut_50','cut_70']:
   if r[k] and re.fullmatch(r'\d+(?:\.\d+)?',r[k]) and r['metric']=='교과등급' and not 0<float(r[k])<=9:
    issues.append({'slug':slug,'row':i,'kind':'grade_range','record':r.copy()})
  ns=['quota','applicants','competition_rate']
  if all(re.fullmatch(r'\d+(?:\.\d+)?',r[k]) for k in ns) and float(r['quota']):
   precision=len(r['competition_rate'].split('.')[1]) if '.' in r['competition_rate'] else 0
   diff=abs(float(r['applicants'])/float(r['quota'])-float(r['competition_rate']))
   if diff>max(.12,.5*10**(-precision)+.01):
    flag='검토필요: 모집·지원인원과 경쟁률의 산술 관계 불일치; 원문값 유지, 원인 미확정'
    if flag not in r['note']:r['note']+='; '+flag
    issues.append({'slug':slug,'row':i,'kind':'source_ratio_mismatch','record':r.copy()})
 assert len({tuple(r.values()) for r in result})==len(result),slug
 with f.open('w',encoding='utf-8-sig',newline='') as h:
  w=csv.DictWriter(h,fields);w.writeheader();w.writerows(result)
 counts[slug]={'rows':len(result),'year_round':dict(collections.Counter(r['result_year']+' '+r['round'] for r in result)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
report={'counts':counts,'rows':sum(x['rows'] for x in counts.values()),'school_files':len(counts),'fatal':fatal,'combined_records':merges,'issues':issues}
(C/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
with (P/'_chungcheong-review.csv').open('w',encoding='utf-8-sig',newline='') as h:
 w=csv.DictWriter(h,['slug','csv_row','issue']+fields);w.writeheader()
 for x in issues:w.writerow({'slug':x['slug'],'csv_row':x['row'],'issue':x['kind'],**x['record']})
print(json.dumps({'rows':report['rows'],'files':len(counts),'fatal':fatal,'combined':len(merges),'issues':dict(collections.Counter(x['kind'] for x in issues))},ensure_ascii=False))
assert not fatal
