"""컷 없는 40개 대학(_cut-gap-40.json)의 어디가 '대학 제공' 50·70% 컷 보충 파일을 _all.csv에 더해요(2026-11-27).

- 대상 파일: 인자로 준 <slug>-adiga*.csv (없으면 _cut-gap-40-files.txt 목록).
- 파일 행이 이미 _all.csv에 똑같이 있으면 지우고 다시 넣어요(여러 번 돌려도 중복 없음). 다른 행은 그대로.
- 어디가 주소(adiga.kr)·대상 대학 표기만 받아요. _all.csv는 백업하고, 같은 바이트로 _all.csv.gz를 다시 써요(CRLF 유지).
실행: python work/_data/admission-results/merge_cut_gap_adiga.py a-adiga.csv b-adiga-cut.csv ...
"""
import csv, gzip, hashlib, io, json, shutil, sys, datetime
from pathlib import Path

P = Path(__file__).parent
master = P / '_all.csv'
targets = json.loads((P / '_cut-gap-40.json').read_text(encoding='utf-8'))
labels = {l for t in targets for l in t['labels']} | {t['university'] for t in targets}
names = sys.argv[1:] or (P / '_cut-gap-40-files.txt').read_text(encoding='utf-8').split()
raw = master.read_bytes()
reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
fields, old = reader.fieldnames, list(reader)
new, per = [], {}
for name in names:
    with (P / name).open(encoding='utf-8-sig', newline='') as f:
        r = csv.DictReader(f)
        assert r.fieldnames == fields, (name, r.fieldnames)
        rows = list(r)
    for row in rows:
        assert 'adiga.kr' in row['source_url'], (name, row['source_url'])
        assert row['university'] in labels, (name, row['university'])
    per[name] = len(rows); new += rows
key = lambda row: tuple(row[k] for k in fields)
incoming = {key(r) for r in new}
assert len(incoming) == len(new), '보충 파일 안에 똑같은 행이 있어요'
kept = [r for r in old if key(r) not in incoming]
stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
shutil.copyfile(master, P / f'_all-before-cut-gap-{stamp}.csv')
buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=fields, lineterminator='\r\n'); w.writeheader(); w.writerows(kept + new)
master.write_bytes(buf.getvalue().encode('utf-8-sig'))
(P / '_all.csv.gz').write_bytes(gzip.compress(master.read_bytes(), mtime=0))
print(json.dumps({'before': len(old), 'replaced_same_rows': len(old) - len(kept), 'added': len(new), 'after': len(kept) + len(new), 'files': per,
                  'sha256': hashlib.sha256(master.read_bytes()).hexdigest()[:12]}, ensure_ascii=False))
