"""Fetch only recorded official public URLs. Bounded output; preserve provenance and failures."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, sys
import expand_chungcheong as fetcher
P=Path(__file__).parent/'national-expansion';P.mkdir(exist_ok=True)
fetcher.ROOT=P
if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 jobs=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
 with ThreadPoolExecutor(max_workers=6) as pool:
  results=list(pool.map(fetcher.fetch,jobs.items()))
 (P/(Path(sys.argv[1]).stem+'-results.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
 for r in results:print(json.dumps({k:v for k,v in r.items() if k!='links'},ensure_ascii=False))
