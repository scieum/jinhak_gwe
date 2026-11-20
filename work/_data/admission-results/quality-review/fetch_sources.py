from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests, urllib3, hashlib, json, sys
import fitz
P=Path(__file__).parent
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
JOBS={
 'kw-2025-jeongsi':('https://iphak.kw.ac.kr/_common/new_download_file.php?menu=board&b_code=B_1_8&b_no=43901&field=file_nm',3),
 'kw-2026-jeongsi':('https://iphak.kw.ac.kr/_common/new_download_file.php?menu=board&b_code=B_1_8&b_no=44581&field=file_nm',3),
 'cku-2026':('https://ipsi.cku.ac.kr/bbs/iphak/1060/151141/download.do',29),
}
def fetch(item):
 key,(url,page)=item
 try:
  r=requests.get(url,timeout=35,verify=False);r.raise_for_status()
  assert r.content.startswith(b'%PDF'),r.headers.get('content-type')
  path=P/(key+'.pdf');path.write_bytes(r.content)
  doc=fitz.open(path)
  (P/(key+'.txt')).write_text(doc[page].get_text(sort=True),encoding='utf8')
  doc[page].get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(str(P/(key+'.png')))
  meta=dict(key=key,url=url,sha256=hashlib.sha256(r.content).hexdigest(),bytes=len(r.content),pages=len(doc),reviewed_page=page+1)
  (P/(key+'.meta.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
  return meta
 except Exception as e:return dict(key=key,error=str(e))
if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 with ThreadPoolExecutor(max_workers=3) as pool:
  for result in pool.map(fetch,JOBS.items()):print(json.dumps(result,ensure_ascii=False))
