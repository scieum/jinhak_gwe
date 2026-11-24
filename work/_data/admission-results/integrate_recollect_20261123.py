"""Validate source-backed candidates and integrate without changing existing rows.

Run without arguments for validation; --apply appends once and regenerates master.
"""
from pathlib import Path
from collections import Counter
import csv, hashlib, json, re, shutil, sys
import fitz
import merge
import normalize_daegu_adiga as adiga

ROOT=Path(__file__).resolve().parent
CACHE=ROOT/'recollect-20261123'
FIELDS=merge.COLS
def read(p):
    if not p.exists():return []
    with p.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f)
        assert reader.fieldnames==FIELDS,(p,reader.fieldnames)
        return list(reader)
def fingerprint(r):return hashlib.sha256(json.dumps(r,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,rows):
    with p.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,FIELDS);w.writeheader();w.writerows(rows)
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
def token(x):return re.sub(r'[^가-힣A-Za-z0-9]','',x or '')

def main(apply=False):
    candidates={p.name.removesuffix('-candidate.csv'):read(p) for p in sorted(CACHE.glob('*-candidate.csv'))}
    assert sum(map(len,candidates.values()))==345
    source_keys=set();checks=[];new={}
    for slug,rows in candidates.items():
        existing=read(ROOT/(slug+'.csv'))
        existing_keys={(r['result_year'],r['round'],r['program'],r['recruit_unit'],r['source_url'],r['source_page']) for r in existing}
        row_keys=set()
        assert slug.removesuffix('-adiga') in merge.allowed()
        for r in rows:
            assert set(r)==set(FIELDS) and all(isinstance(v,str) for v in r.values())
            assert all(r[k] for k in ['university','result_year','round','program','recruit_unit','source_url','source_page'])
            assert r['result_year'] in ['2024','2025','2026'] and r['round'] in ['수시','정시']
            assert r['admission_type'] in ['교과','종합','논술','실기','수능','기타']
            assert bool(merge.ADIGA_SOURCE.search(r['source_url']))==slug.endswith('-adiga')
            assert r['recruit_unit'] not in ['계','합계','총계']
            for field in ['quota','applicants','competition_rate','fill_count','fill_rate','cut_50','cut_70']:
                if r[field]:assert float(r[field])>=0,(slug,field,r[field])
            if r['metric'] in ['교과등급','수능등급']:
                for field in ['cut_50','cut_70']:
                    if r[field]:assert 1<=float(r[field])<=9,(slug,field,r)
            key=(r['result_year'],r['round'],r['program'],r['recruit_unit'],r['source_url'],r['source_page'])
            assert key not in row_keys,('duplicate candidate',slug,key)
            row_keys.add(key)
            if key in existing_keys:
                assert any(r==e for e in existing),('source row changed since integration',slug,key)
            if slug=='woosuk-jincheon':
                key,pg,table,index=re.fullmatch(r'(\S+) / p\.(\d+) 표(\d+) 행(\d+)',r['source_page']).groups()
                p=ROOT/'national-expansion'/(key+'.pdf')
                with fitz.open(p) as d:
                    v=d[int(pg)-1].find_tables().tables[int(table)-1].extract()[int(index)-1]
                assert '진천' in v[1] and token(v[2])==token(r['recruit_unit'])
                assert token(v[0])==token(r['program'])
                assert r['quota']==adiga.number(v[3]) and r['competition_rate']==adiga.number(v[4])
                cutcol=6 if r['result_year']=='2025' else 7
                assert r['cut_70']==adiga.number(v[cutcol])
                source_keys.add(('national-expansion',key))
            elif slug=='chodang':source_keys.add(('recollect-20261123','chodang-board-link132'))
            elif slug=='sehan-yeongam':source_keys.add(('recollect-20261123','sehan-2026-results'))
            else:source_keys.add(('recollect-20261123',r['source_page'].split(' / ')[0]))
        new[slug]=[r for r in rows if (r['result_year'],r['round'],r['program'],r['recruit_unit'],r['source_url'],r['source_page']) not in existing_keys]
        checks.append(dict(file=slug+'.csv',existing=len(existing),candidates=len(rows),new=len(new[slug])))
    # Verify downloaded bytes against recorded hashes for every source used.
    sources=[]
    for folder,key in sorted(source_keys):
        directory=ROOT/folder
        meta=json.loads((directory/(key+'.meta.json')).read_text(encoding='utf8'))
        possibilities=[directory/(key+'.'+ext) for ext in ['pdf','html','ole','jpg','json']]
        p=next(p for p in possibilities if p.exists())
        assert sha(p)==meta['sha256'],('source hash',p)
        sources.append(dict(key=key,file=str(p.relative_to(ROOT)),url=meta.get('url'),sha256=sha(p)))
    old=read(ROOT/'_all.csv');before=Counter(map(fingerprint,old))
    additions=[r for rows in new.values() for r in rows]
    result=dict(validation='passed',candidate_rows=345,new_rows=len(additions),source_files=len(sources),files=checks,sources=sources,
                before_rows=len(old),before_sha256=sha(ROOT/'_all.csv'),candidate_year_counts=dict(Counter(r['result_year'] for rs in candidates.values() for r in rs)))
    if apply:
        manifest=CACHE/'integration.json'
        if manifest.exists():
            assert len(additions)==0,'Unexpected new rows after completed integration'
            print('Already integrated; candidates and evidence validated.');return
        assert len(old)==132261 and len(additions)==345,('unexpected baseline',len(old),len(additions))
        backup=CACHE/'before-integration';backup.mkdir(exist_ok=True)
        for slug,rows in new.items():
            target=ROOT/(slug+'.csv')
            if target.exists():shutil.copy2(target,backup/target.name)
            write(target,read(target)+rows)
        assert merge.main()==0
        after=read(ROOT/'_all.csv');after_counts=Counter(map(fingerprint,after))
        assert after_counts==before+Counter(map(fingerprint,additions)),'Master differs beyond intended additions'
        assert len(after)==132606
        result.update(after_rows=len(after),after_sha256=sha(ROOT/'_all.csv'),existing_rows_preserved=True,
                      after_year_counts=dict(Counter(r['result_year'] for r in after)))
        save(manifest,result)
    save(CACHE/'validation.json',result)
    print(json.dumps({k:v for k,v in result.items() if k not in ['files','sources']},ensure_ascii=False,indent=2))
    print(json.dumps(checks,ensure_ascii=False))

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf8');main('--apply' in sys.argv)
