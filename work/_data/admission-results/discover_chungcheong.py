"""Follow observed public admission result links; record parent and title."""
from pathlib import Path
from urllib.parse import urlparse,urljoin
import json,re,sys
from bs4 import BeautifulSoup
C=Path(__file__).parent/'chungcheong-expansion'
seen=set()
for f in C.glob('batch[0-9][0-9].json'):seen.update(json.loads(f.read_text(encoding='utf-8-sig')).values())
jobs={};titles=[]
def add(slug,u,t,parent):
 if u in seen or not u.startswith('http') or '.ac.kr' not in urlparse(u).netloc or '#' in u:return
 key=slug+'-scan'+sys.argv[1]+'-'+str(len(jobs)+1)
 jobs[key]=u;seen.add(u);titles.append(dict(key=key,title=t,parent=parent,url=u))
for f in C.glob('*.links.json'):
 key=f.name.removesuffix('.links.json');slug=key.split('-')[0]
 for x in json.loads(f.read_text(encoding='utf8')):
  t,u=x['text'],x['url']
  if re.search('편입|영향평가|기출|산출|계획|2027학년도|202[0-3]학년도|신청',t):continue
  if re.search('결과|입학성적',t):add(slug,u,t,key)
 # Direct attachments on year-specific result posts, extracted from visible link text.
 for x in json.loads(f.read_text(encoding='utf8')):
  t,u=x['text'],x['url']
  if not (re.search('202[456]',t) and re.search('결과|성적',t)) or re.search('편입|영향평가|기출',t):continue
  js=re.search(r"fn_egov_downFile\('([^']+)'\s*,\s*'([^']+)'",u)
  if js:
   base=json.loads((C/(key+'.meta.json')).read_text(encoding='utf8'))['final_url']
   u=urljoin(base,'/cmm/fms/FileDown.do?atchFileId='+js[1]+'&fileSn='+js[2])
  add(slug,u,t,key)
(C/f'batch{sys.argv[1]}.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
(C/f'batch{sys.argv[1]}-titles.json').write_text(json.dumps(titles,ensure_ascii=False,indent=2),encoding='utf8')
print('New source links:',len(jobs))
