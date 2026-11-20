from pathlib import Path
from bs4 import BeautifulSoup
import json,re
P=Path(__file__).parent
jobs={'dnue-viewer-main':'https://webbook.dnue.ac.kr/viewer/main.js','dnue-preload':'https://webbook.dnue.ac.kr/viewer/toast/toast.preload.js','daegu-2026-susi-post':'https://ipsi.daegu.ac.kr/kor/article/ATCL22/19900','daegu-2025-susi-post':'https://ipsi.daegu.ac.kr/kor/article/ATCL22/17601','daegu-2024-susi-post':'https://ipsi.daegu.ac.kr/kor/article/ATCL22/15447'}
for x in json.loads((P/'knu-results.links.json').read_text(encoding='utf8')):
 if '입학 전형결과' in x['text'] or '4개년' in x['text']:jobs['knu-'+('4years' if '4개년' in x['text'] else re.search(r'202[56]',x['text'])[0])+'-post']=x['url']
for x in json.loads((P/'kumoh-results.links.json').read_text(encoding='utf8')):
 if re.search(r'202[45]학년도.*입시결과',x['text']):jobs['kumoh-'+re.search(r'202[45]',x['text'])[0]+'-post']=x['url']
(P/'batch10.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
