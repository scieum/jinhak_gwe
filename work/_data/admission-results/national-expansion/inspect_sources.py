from pathlib import Path
import json,re,sys
from bs4 import BeautifulSoup
P=Path(__file__).parent
sys.stdout.reconfigure(encoding='utf8')
for key in sys.argv[1:]:
 print('\nSOURCE',key)
 if (P/(key+'.links.json')).exists():
  for x in json.loads((P/(key+'.links.json')).read_text(encoding='utf8')):
   if re.search(r'첨부|입시결과|202[456].*결과|결과.*pdf|download|filedown|FileDown|\.xlsx',x['text']+' '+x['url'],re.I):print(json.dumps(x,ensure_ascii=False))
 if (P/(key+'.html')).exists():
  s=BeautifulSoup((P/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for a in s.select('[onclick]'):
   if re.search(r'down|attach|file',str(a),re.I):print(str(a)[:900])
