from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json,re
P=Path(__file__).parent
jobs={'dcu-2024-susi':'https://ibsi.cu.ac.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000000003614&fileSn=0','daegu-2025-jeongsi':'https://ipsi.daegu.ac.kr/attach/47d3a1157aae05c29d2b47fbf754f8a0/13055e35ba7465cb478c5b4be490c5a8'}
for rd in ['susi','jeongsi']:
 for a in BeautifulSoup((P/f'yu-{rd}-list.html').read_text(encoding='utf8'),'html.parser').select('a[href]'):
  m=re.search('(202[45])학년도.*입학자 성적',a.get_text())
  if m:jobs[f'yu-{m[1]}-{rd}-post']=urljoin('https://enter.yu.ac.kr',a['href'])
 for a in json.loads((P/f'yu-2026-{rd}-post.links.json').read_text(encoding='utf8')):
  if '.xlsx' in a['url']:jobs[f'yu-2026-{rd}']=a['url']
for y,uid in [(2026,'26111fff-5885-4dec-96b1-33e990ea4d15'),(2025,'87ce1fed-7f71-4f5f-b7dc-ab5ff6e0a71b'),(2024,'40561ba7-c22c-4561-94de-c739e8706891')]:
 jobs[f'dnue-{y}-project']=f'https://webbook.dnue.ac.kr/storages/{uid}/project.json'
(P/'batch13.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
