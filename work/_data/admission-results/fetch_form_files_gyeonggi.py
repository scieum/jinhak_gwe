"""Read public attachment links with their normal download form/session."""
from pathlib import Path
import requests,urllib3,sys,json,re,hashlib,concurrent.futures
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import fitz
urllib3.disable_warnings();sys.stdout.reconfigure(encoding='utf8')
P=Path(__file__).parent/'gyeonggi-expansion'
def get(key):
 try:
  page=json.loads((P/(key+'.meta.json')).read_text(encoding='utf8'))['url']
  s=requests.Session();s.verify=False;s.headers['User-Agent']='Mozilla/5.0'
  r=s.get(page,timeout=40);r.encoding=r.apparent_encoding;bs=BeautifulSoup(r.text,'html.parser');n=0
  for a in bs.select('a'):
   if key.startswith('hansei'):
    m=re.search(r'downFile\((\d+)\)',a.get('onclick',''))
    if not m:continue
    form=bs.find('form',attrs={'name':'board_form'});params={x['name']:x.get('value','') for x in form.select('input[name]')};params['fileSn']=m[1]
    rr=s.get('https://ipsi.hansei.ac.kr/wcon/bbs/downFile.do',params=params,headers={'Referer':page},timeout=40)
   else:
    if not a.get('href','').startswith('/download/') or '.pdf' not in a.get_text():continue
    rr=s.get(urljoin(page,a['href']),headers={'Referer':page},timeout=40)
   n+=1;k=key.replace('-post','')+('' if n==1 else '-'+str(n))
   if not rr.content.startswith(b'%PDF'):print(k,'not PDF',rr.status_code,rr.text[:70]);continue
   f=P/(k+'.pdf');f.write_bytes(rr.content);d=fitz.open(f)
   (P/(k+'.txt')).write_text('\n'.join(f'PAGE {i+1}\n'+p.get_text(sort=True) for i,p in enumerate(d)),encoding='utf8')
   # Link to stable official post; temporary CSRF/session parameters are deliberately omitted.
   (P/(k+'.meta.json')).write_text(json.dumps({'key':k,'url':page,'attachment':a.get_text(' ',strip=True),'sha256':hashlib.sha256(rr.content).hexdigest(),'bytes':len(rr.content),'path':str(f),'pages':len(d)},ensure_ascii=False,indent=2),encoding='utf8')
   print(k,len(rr.content),len(d))
 except Exception as e:print(key,type(e).__name__,str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(get,sys.argv[1:]))
