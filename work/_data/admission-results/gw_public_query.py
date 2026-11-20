"""Replay only the public admissions-results board's documented SELECT request."""
from pathlib import Path
import requests,json,urllib3,sys
urllib3.disable_warnings();sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).parent/'gangwon-expansion'
s=requests.Session();s.verify=False
s.get('https://ipsi.gw.ac.kr/loadPage.do?jspPage=/IPSI/STUD/D/IPDA050&menuId=00044&ClassNm=lnb04%20snb05',timeout=30)
data={'_SQL_SESSION_NAME_':'sqlSession','10010000:SERVICE:SELECT_ALL:SELECT:true:true':'r+uBTo2Qm6ZJKPyzz9S2nILegE2w8g5cZy/iEncQbQo='}
for i,(k,v) in enumerate({'BOARD_GB':'SA6005','NOWPAGE':'1','SEARCH_OPTION':'','SEARCH_STRING':''}.items(),1):data[f'{10013000+i}:PARAM:SELECT_ALL:{k}']=v
r=s.post('https://ipsi.gw.ac.kr/select.do',data=data,headers={'AJAX':'true'},timeout=30)
(root/'gw-public-list.json').write_text(r.text,encoding='utf-8');print(r.status_code,r.text[:15000])
