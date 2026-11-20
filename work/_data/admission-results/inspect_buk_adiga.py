from normalize_daegu_adiga import htmlgrid,BeautifulSoup,compact,CACHE,json,sys
out=[]
for d in json.loads((CACHE/'buk-roster.json').read_text(encoding='utf8')):
 for y in [2024,2025]:
  key=f'{d["slug"]}-adiga-{y}';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  tables=[]
  for ti,t in enumerate(s.find_all('table')):
   tx=compact(t.get_text())
   if '70%' not in tx or not ('경쟁률' in tx or '충원' in tx):continue
   g=htmlgrid(t)
   ctx=[]
   for e in t.previous_elements:
    if getattr(e,'name',None)=='table':break
    if isinstance(e,str) and e.strip() and not e.find_parent(['table','style','script']):ctx.append(e.strip())
    if len(ctx)>15:break
   tables.append({'index':ti,'rows':len(g),'width':len(g[0]),'context':ctx,'grid':g})
  out.append({'slug':d['slug'],'year':y,'tables':tables})
(CACHE/'buk-adiga-legacy-inspection.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
for a in out:
 print(a['slug'],a['year'],[(t['index'],t['rows'],t['width'],' / '.join(t['grid'][0][:3])) for t in a['tables']])
