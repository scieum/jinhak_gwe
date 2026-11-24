"""Select real reference data in the UI; persist in isolated preview storage."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'app/tools'))
from impl_gate import App
from playwright.sync_api import expect

base = ROOT / 'app/public/data/minimum-references'
index = json.loads((base / 'index.json').read_text(encoding='utf-8'))
entry = next(e for e in index['entries'] if e['package_id'] == 'plan-0000198')
pkg = json.loads((base / entry['file']).read_text(encoding='utf-8'))
scope = next(r for r in pkg['rows'] if r['scope_status'] == 'classified')
app = App()
try:
    page = app.page
    page.evaluate("""async () => {
      localStorage.setItem('jinhak-navi-sample', 'off');
      localStorage.removeItem('jinhak-navi-score-trend-targets');
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('jinhak-navi-student-v1');
        req.onsuccess = () => {
          const db = req.result; const tx = db.transaction(['applications','tasks','boards','mocks'], 'readwrite');
          for (const name of ['applications','tasks','boards','mocks']) tx.objectStore(name).clear();
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
        }; req.onerror = () => reject(req.error);
      });
    }""")
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(app.url + '/application-checklist', wait_until='networkidle')
    page.get_by_role('button', name='+ 지원 전형 추가', exact=True).click()
    dialog = page.get_by_role('dialog', name='지원 전형 편집')
    dialog.get_by_text('전형 자료에서 찾아 입력', exact=True).click()
    dialog.get_by_role('combobox', name='자료 대학·캠퍼스', exact=True).select_option(entry['package_id'])
    dialog.get_by_role('combobox', name='자료 전형·모집시기', exact=True).select_option(scope['program_id'])
    dialog.get_by_role('combobox', name='자료 모집단위', exact=True).select_option(scope['unit_id'])
    for width in [390, 320]:
        page.set_viewport_size({'width': width, 'height': 844})
        assert dialog.evaluate('(e) => e.scrollWidth <= e.clientWidth'), f'Overflow: {width}'
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(ROOT / 'work/_pending/plan-source-mobile.png'))
    dialog.get_by_role('button', name='선택한 전형 적용').click()
    expect(dialog.get_by_role('textbox', name='대학명', exact=True)).to_have_value(entry['university'])
    dialog.get_by_role('button', name='저장', exact=True).click()
    expect(dialog).not_to_be_visible()
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='전형 정보 수정', exact=True).click()
    expect(dialog.get_by_role('textbox', name='모집단위(선택)', exact=True)).to_have_value(scope['unit'])
    expect(dialog.get_by_text('선택한 대학·전형·모집단위의 원문 연결을 함께 저장해요.', exact=False)).to_be_visible()
    dialog.get_by_role('button', name='취소', exact=True).click()
    page.goto(app.url + '/score-trend', wait_until='networkidle')
    page.get_by_text('수능 최저 원문·근거', exact=True).click()
    expect(page.get_by_text('검수 전 참고자료', exact=True)).to_be_visible()
    expect(page.locator('.trd-result')).to_have_count(0)
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.goto(app.url + '/application-checklist', wait_until='networkidle')
    page.get_by_role('button', name='전형 정보 수정', exact=True).click()
    dialog.get_by_text('전형 자료에서 찾아 입력', exact=True).click()
    expect(dialog.get_by_role('combobox', name='자료 대학·캠퍼스', exact=True)).to_be_visible()
    print(json.dumps({'pass': True, 'checks': ['real source selection', '320/390 layout', 'save/reload', 'reference link from score trend', '1440 editor'], 'package': entry['package_id']}))
finally:
    app.close()
