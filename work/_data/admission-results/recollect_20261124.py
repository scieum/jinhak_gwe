"""Public official-source follow-up for remaining collection gaps."""
from pathlib import Path
import json,sys
import recollect_20261123 as fetcher

CACHE=Path(__file__).resolve().parent/'recollect-20261124'
CACHE.mkdir(exist_ok=True)
fetcher.CACHE=CACHE

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf8')
    if sys.argv[1]=='fetch':fetcher.run(json.loads(Path(sys.argv[2]).read_text(encoding='utf8')))
    elif sys.argv[1]=='adiga':
        for key in sys.argv[2:]:fetcher.adiga(key)
