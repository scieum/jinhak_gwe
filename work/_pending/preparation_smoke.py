import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'app/tools'))
from impl_gate import App
from playwright.sync_api import expect
app=App()
try:
 for route in ['application-checklist','eligibility-check']:
  for w in [390,1440,320]:
   app.measure('/'+route,(w,844 if w<1024 else 900))
   print(route,w,app.page.evaluate('''() => Object.fromEntries(['.topbar','.shell__content','.prep-heading','.prep-select-card','.prep-program-card','.prep-summary','.prep-list-heading','.prep-check-item','.prep-select select','.prep-plan-actions button','.prep-program-row','.prep-info-row','.prep-meta','.prep-name-row','.prep-counts'].map(s=>{const e=document.querySelector(s);if(!e)return[s,null];const r=e.getBoundingClientRect();const c=getComputedStyle(e);return [s,{x:r.x,y:r.y,w:r.width,h:r.height,gap:c.gap,font:c.fontSize,line:c.lineHeight,padding:c.padding,box:c.boxSizing}]}))'''))
   assert app.page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(route,w,'overflow')
   app.page.screenshot(path=str(ROOT/f'work/_pending/{route}-{w}.png'))
 page=app.page
 page.set_viewport_size({'width':390,'height':844})
 page.goto(app.url+'/score-trend',wait_until='networkidle')
 page.get_by_role('button',name='목표 대학',exact=True).click()
 page.get_by_label('2순위',exact=True).select_option('')
 page.get_by_label('3순위(선택)',exact=True).select_option('')
 chosen=page.get_by_label('1순위',exact=True).input_value()
 page.get_by_role('button',name='저장',exact=True).click()
 expect(page.get_by_role('dialog')).to_have_count(0)
 expect(page.get_by_role('status')).to_have_text('목표 대학을 저장했어요')
 page.reload(wait_until='networkidle')
 page.get_by_role('button',name='목표 대학',exact=True).click()
 expect(page.get_by_label('1순위',exact=True)).to_have_value(chosen)
 expect(page.get_by_label('2순위',exact=True)).to_have_value('')
 page.get_by_role('button',name='취소',exact=True).click()
 preferences=page.evaluate('''() => new Promise((resolve,reject)=>{const r=indexedDB.open('jinhak-navi-student-v1');r.onsuccess=()=>{const db=r.result;const tx=db.transaction('preferences');const q=tx.objectStore('preferences').get('score-trend-targets');q.onsuccess=()=>resolve(q.result.targetPriorities);tx.oncomplete=()=>db.close();q.onerror=()=>reject(q.error)};r.onerror=()=>reject(r.error)})''')
 assert preferences==[chosen],preferences
 assert page.evaluate("localStorage.getItem('jinhak-navi-score-trend-targets')") is None
 page.goto(app.url+'/application-checklist?plan='+chosen,wait_until='networkidle')
 page.get_by_role('button',name='전형 삭제',exact=True).click()
 page.get_by_role('dialog').get_by_role('button',name='삭제',exact=True).click()
 expect(page.get_by_role('dialog')).to_have_count(0)
 page.goto(app.url+'/score-trend',wait_until='networkidle')
 expect(page.get_by_role('button',name='목표 대학',exact=True)).to_be_visible()
 print(json.dumps({'pass':True,'checks':['320/390/1440 no page overflow','both preparation routes render','target save/reload in IndexedDB','legacy localStorage unused','target application deletion']}))
finally: app.close()
