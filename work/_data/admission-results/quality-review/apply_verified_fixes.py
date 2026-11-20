"""Apply only the eleven source-checked row corrections, preserving original values in notes/log."""
from pathlib import Path
from collections import Counter
import csv, hashlib, json, sys, os
P=Path(__file__).resolve().parent.parent; Q=P/'quality-review'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):
 with p.open(encoding='utf-8-sig',newline='') as f:
  reader=csv.DictReader(f);return reader.fieldnames,list(reader)
def key(r):return tuple(r.values())
def patch(r):
 n=r.copy()
 if r['university']=='광운대' and r['result_year'] in ['2025','2026'] and r['round']=='정시' and '재직자' in r['program'] and r['cut_70'] and float(r['cut_70'])>9 and r['metric']=='교과등급':
  n['metric']='환산점수';n['grade_system']=''
  n['note']+='; 2026-11-19 원문 p.4 대조 정정: cut_70은 원문 수능 환산점 열의 점수이며 교과등급이 아님. 별도 학생부등급은 cut_other에 보존(9등급제).'
 if r['university']=='가톨릭관동대' and r['result_year']=='2026' and r['program']=='학생부교과(기초생활 및 차상위전형)' and r['recruit_unit'] in ['치위생학과','작업치료학과'] and r['cut_70']=='0.00':
  n['cut_70']=''
  n['note']+='; 2026-11-19 원문 p.30 확인: 등록 0명, 최종등록자 70% 원문 표기 0.00은 유효 등급이 아니므로 cut_70 공란 처리. 원문 숫자는 cut_other에 보존.'
 if r['university']=='상지대학교' and r['result_year']=='2026' and r['program']=='농어촌학생' and (r['round'],r['recruit_unit']) in [('수시','건설환경공학과'),('정시','경영학과')] and r['cut_50']=='0.0' and r['cut_70']=='0.0':
  n['cut_50']='';n['cut_70']=''
  n['cut_other']+='; 원문 최종등록자 50%cut 0.0 / 70%cut 0.0 (유효 등급 아님)'
  n['note']+='; 2026-11-19 원문 대조: 원문에 0.0으로 기재되어 있으나 1~9등급 범위를 벗어나 비교용 컷은 공란 처리. 미산출 사유는 원문에 명시되지 않아 추정하지 않음.'
 return n
def main():
 paths=[P/(s+'.csv') for s in ['_all','cku','kw','sangji']]
 hashes={p:digest(p) for p in paths}; changes=[]; prepared={}
 for p in paths:
  fields,rows=load(p); updated=[patch(r) for r in rows]
  for i,(old,new) in enumerate(zip(rows,updated),2):
   if old!=new:changes.append(dict(file=p.name,record=i,old=old,new=new,changed_fields=[k for k in old if old[k]!=new[k]]))
  if rows!=updated:
   backup=Q/(p.stem+'.before-quality.csv')
   if not backup.exists():backup.write_bytes(p.read_bytes())
   tmp=p.with_suffix('.quality.tmp')
   with tmp.open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fields);w.writeheader();w.writerows(updated)
   assert len(updated)==len(rows) and len(set(map(key,updated)))==len(updated)
   prepared[p]=tmp
 assert all(digest(p)==hashes[p] for p in paths),'Concurrent file modification'
 master_changes=[x for x in changes if x['file']=='_all.csv']
 assert len(master_changes) in [0,11],len(master_changes)
 for p,tmp in prepared.items():os.replace(tmp,p)
 if changes:
  (Q/'verified-changes.json').write_text(json.dumps(dict(master_changed_rows=len(master_changes),file_changes=changes,before_hashes={p.name:v for p,v in hashes.items()},after_hashes={p.name:digest(p) for p in paths}),ensure_ascii=False,indent=2),encoding='utf8')
 print('Master rows corrected:',len(master_changes))
if __name__=='__main__':sys.stdout.reconfigure(encoding='utf8');main()
