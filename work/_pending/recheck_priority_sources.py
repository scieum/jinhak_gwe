import concurrent.futures,hashlib,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'work/_data/data-integration/priority-review'
index=json.loads((OUT/'index.json').read_text(encoding='utf-8'))
def check(entry):
 p=json.loads((OUT/entry['file']).read_text(encoding='utf-8')); source=p['source']
 result={'package_id':entry['package_id'],'url':source['url'],'checked_on':'2026-11-24','latest_across_site_confirmed':False,'expected_sha256':source['sha256']}
 try:
  req=urllib.request.Request(source['url'],headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=25) as response:
   raw=response.read(20_000_001)
   if len(raw)>20_000_000: raise ValueError('Document size exceeds verification limit')
   digest=hashlib.sha256(raw).hexdigest()
   result.update(status=response.status,final_url=response.url,bytes=len(raw),actual_sha256=digest,hash_matches=digest==source['sha256'])
 except Exception as e: result.update(status='fetch_failed',error=str(e))
 return result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: rows=list(pool.map(check,index['entries']))
notices=[
 {'university':'한림대학교','url':'https://www.hallym.ac.kr/bbs/admission/957/385146/artclView.do','status':'opened','attachment_label':'(최종, 260602) 2028학년도 신입학 전형계획(안).pdf','note':'공지에서 수시·정시 세부내용은 추후 모집요강을 참고하도록 안내함'},
 {'university':'강원대학교','url':'https://admission.kangwon.ac.kr/admission/bbs/1165/detail.do?pstSn=1873','status':'opened','updated_on':'2026-06-11','note':'춘천·강릉·삼척·원주 첨부를 확인함. 사이트 전체 최신본 확인은 아님'},
 {'university':'한국교원대학교','url':'https://www.knue.ac.kr/ipsi/selectBbsNttView.do?bbsNo=276&key=1845&nttNo=82605','status':'fetch_failed','error':'Web fetch HTTP 403'},
 {'university':'가톨릭관동대학교','url':'https://ipsi.cku.ac.kr/bbs/iphak/1005/152140/download.do','status':'fetch_failed','error':'Web fetch HTTP 502'}]
value={'checked_on':'2026-11-24','review_status':'draft','executable':False,'latest_across_site_confirmed':False,'notices':notices,'documents':rows}
(OUT/'source-rechecks-2026-11-24.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'documents':len(rows),'same_hash':sum(r.get('hash_matches') is True for r in rows),'failed':sum(r['status']=='fetch_failed' for r in rows),'changed':sum(r.get('hash_matches') is False for r in rows)}))
