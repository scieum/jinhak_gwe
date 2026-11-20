from pathlib import Path
import json,re
from bs4 import BeautifulSoup
P=Path(__file__).parent
jobs={'dcu-2025-jeongsi-post':'https://ibsi.cu.ac.kr/kor/BBSMSTR_000000000046/14805/view.do','dcu-2024-jeongsi-post':'https://ibsi.cu.ac.kr/kor/BBSMSTR_000000000046/14014/view.do','dcu-susi-list':'https://ibsi.cu.ac.kr/kor/bbs/BBSMSTR_000000000001/lst.do','yu-susi-list':'https://enter.yu.ac.kr/10000011','yu-jeongsi-list':'https://enter.yu.ac.kr/10000015'}
for key in ['knu-2026-post','knu-2025-post','knu-4years-post','kumoh-2025-post','kumoh-2024-post']+[f'daegu-{y}-susi-post' for y in [2024,2025,2026]]:
 for x in json.loads((P/(key+'.links.json')).read_text(encoding='utf8')):
  if '.xlsx' in x['text']:jobs[key.replace('-post','')]=x['url']
for y in [2024,2025,2026]:
 s=BeautifulSoup((P/f'daegu-{y}-susi-post.html').read_text(encoding='utf8'),'html.parser')
 for a in s.select('[onclick]'):
  if '정시모집 전형 결과' in a.get_text():
   m=re.search(r"view\('([^']+)'",a['onclick'])
   if m:jobs[f'daegu-{y}-jeongsi-post']='https://ipsi.daegu.ac.kr/kor/article/ATCL22/'+m[1]
(P/'batch11.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
