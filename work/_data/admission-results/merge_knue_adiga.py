"""한국교원대 어디가 '대학 제공' 최종등록자 50·70% 컷(2026-11-27 수집)을 _all.csv에 더해요.

- knue-final.csv 중 source_url이 adiga.kr인 행만 knue-adiga.csv로(README: 입학처에 없는 컷은 어디가 보충, 파일 따로).
- 입학처 PDF에서 떼어 낸 '최종 등록자 평균·최고·최저' 행은 knue.csv cut_other에 이미 있어 넣지 않아요(중복 방지).
- _all.csv는 백업 후 한국교원대 어디가 행만 교체하고 다른 행은 그대로 둬요.
실행: python work/_data/admission-results/merge_knue_adiga.py
"""
import csv, hashlib, io, shutil, datetime
from pathlib import Path

P = Path(__file__).parent
master = P / '_all.csv'
raw = master.read_bytes()
reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
fields, old = reader.fieldnames, list(reader)
with (P / 'knue-final.csv').open(encoding='utf-8-sig', newline='') as f:
    r = csv.DictReader(f)
    assert r.fieldnames == fields, r.fieldnames
    final = list(r)
adiga = [row for row in final if 'adiga.kr' in row['source_url']]
assert adiga and all(row['university'] == '한국교원대학교' for row in adiga)
assert all(row['cut_50'] or row['cut_70'] for row in adiga)
with (P / 'knue-adiga.csv').open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(adiga)
kept = [row for row in old if not (row['university'] == '한국교원대학교' and 'adiga.kr' in row['source_url'])]
stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
shutil.copyfile(master, P / f'_all-before-knue-adiga-{stamp}.csv')
buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=fields, lineterminator='\r\n'); w.writeheader(); w.writerows(kept + adiga)  # 원본과 같은 CRLF
master.write_bytes(buf.getvalue().encode('utf-8-sig'))
print({'before': len(old), 'removed_old_adiga': len(old) - len(kept), 'added': len(adiga), 'after': len(kept) + len(adiga),
       'sha256': hashlib.sha256(master.read_bytes()).hexdigest()[:12]})
import gzip
(P / '_all.csv.gz').write_bytes(gzip.compress(master.read_bytes(), mtime=0))  # 저장소에 올리는 사본은 _all.csv와 같은 바이트
