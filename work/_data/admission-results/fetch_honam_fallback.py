"""Public URLs only; Windows curl fallback for legacy TLS, with provenance."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import subprocess,json,hashlib,sys,fitz
C=Path(__file__).parent/'national-expansion'
def fetch(job):
 key,value=job;url=value['url'] if isinstance(value,dict) else value;ref=value.get('referer',url) if isinstance(value,dict) else url
 tmp=C/(key+'.download');cmd=['curl.exe','-sS','-k','-L','--max-time','35','-A','Mozilla/5.0','-e',ref,'-o',str(tmp),url]
 p=subprocess.run(cmd,capture_output=True)
 if p.returncode:return dict(key=key,error=p.stderr.decode(errors='replace')[:250])
 b=tmp.read_bytes();ext='.pdf' if b.startswith(b'%PDF') else '.xlsx' if b.startswith(b'PK') else '.xls' if b.startswith(bytes.fromhex('D0CF11E0')) else '.html';dest=C/(key+ext);tmp.replace(dest)
 meta=dict(url=url,referer=ref,bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),method='curl public GET',path=str(dest))
 (C/(key+'.meta.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
 if ext=='.html':
  s=BeautifulSoup(b,'html.parser');dest.write_text(str(s),encoding='utf8');links=[dict(text=a.get('title') or a.get_text(' ',strip=True),url=urljoin(url,a['href'])) for a in s.find_all('a',href=True)]
  (C/(key+'.links.json')).write_text(json.dumps(links,ensure_ascii=False,indent=2),encoding='utf8')
 elif ext=='.pdf':
  d=fitz.open(dest);(C/(key+'.txt')).write_text('\n'.join(p.get_text() for p in d),encoding='utf8')
 return dict(key=key,**meta)
if __name__=='__main__':
 jobs=json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
 with ThreadPoolExecutor(max_workers=4) as pool:rs=list(pool.map(fetch,jobs.items()))
 (C/(Path(sys.argv[1]).stem+'-results.json')).write_text(json.dumps(rs,ensure_ascii=False,indent=2),encoding='utf8')
 for r in rs:print(json.dumps(r,ensure_ascii=False))
