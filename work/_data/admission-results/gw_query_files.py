"""Replay only the public admissions-results board's documented SELECT request."""
from pathlib import Path
import requests,json,urllib3,sys
urllib3.disable_warnings();sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).parent/'gangwon-expansion'
s=requests.Session();s.verify=False
s.get('https://ipsi.gw.ac.kr/loadPage.do?jspPage=/IPSI/STUD/D/IPDA050&menuId=00044&ClassNm=lnb04%20snb05',timeout=30)
out={}
for yr,idx in [(2026,6),(2025,5),(2024,4)]:
 data={'_SQL_SESSION_NAME_':'sqlSession','10010000:SERVICE:SELECT_FILE:SELECT:true:true':'VYVboj/b4ZdLJYu+S+Fs/9Xy4aMpcv+HfXfoGCf9FP8=','10013001:PARAM:SELECT_FILE:BOARD_GB':'SA6005','10013002:PARAM:SELECT_FILE:NTC_ID':str(idx)}
 r=s.post('https://ipsi.gw.ac.kr/select.do',data=data,headers={'AJAX':'true'},timeout=30)
 out[str(yr)]=r.json()
(root/'gw-files-list.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(out,ensure_ascii=False))
