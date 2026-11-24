import json
for slug in ['application-checklist','eligibility-check']:
 d=json.load(open('work/_cache/figma/'+slug+'.json',encoding='utf-8'))
 for key,v in d['nodes'].items():
  root=v['document']; base=root['absoluteBoundingBox']; print(slug,key)
  def walk(n,depth=0):
   b=n.get('absoluteBoundingBox',{}); name=n.get('name',''); t=n.get('characters','')
   if depth<=4 or name in ['check-item','data-table','row','cell','summary','program-card','counts','stats','status']:
    print(' '*depth, name, t[:70], [round(b.get(k,0)-(base.get(k,0) if k in ['x','y'] else 0),1) for k in ['x','y','width','height']], 'gap',n.get('itemSpacing'),'pad',[n.get('padding'+s) for s in ['Top','Right','Bottom','Left']])
   for c in n.get('children',[]): walk(c,depth+1)
  walk(root)
