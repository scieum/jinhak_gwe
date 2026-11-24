"""Real local reference package + isolated student fixture, no external source visits."""
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
package = json.loads((base / entry['file']).read_text(encoding='utf-8'))
scope = next(r for r in package['rows'] if r['scope_status'] == 'classified')
record = {'id': 'local-reference-test', 'year': 2028, 'university': entry['university'], 'program': scope['program'],
          'department': scope['unit'], 'source_url': '', 'steps': [], 'eligibility': [],
          'created_at': '2026-11-24T00:00:00Z', 'updated_at': '2026-11-24T00:00:00Z'}
app = App()
try:
    page = app.page
    page.evaluate("""async (record) => {
      localStorage.setItem('jinhak-navi-sample', 'off');
      localStorage.setItem('jinhak-navi-score-trend-targets', JSON.stringify([record.id]));
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('jinhak-navi-student-v1');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result; const tx = db.transaction(['applications','mocks'], 'readwrite');
          tx.objectStore('applications').clear(); tx.objectStore('applications').put(record); tx.objectStore('mocks').clear();
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
        };
      });
    }""", record)
    requests = []
    page.on('request', lambda req: requests.append(req.url) if '/data/minimum-references/' in req.url else None)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(app.url + '/score-trend', wait_until='networkidle')
    summary = page.get_by_text('수능 최저 원문·근거', exact=True)
    expect(summary).to_be_visible()
    assert not requests, 'Reference files should not load until opened'
    summary.click()
    expect(page.get_by_text('검수 전 참고자료', exact=True)).to_be_visible()
    detail = page.locator('.trd-reference')
    assert scope['unit'] in detail.inner_text()
    expect(detail.get_by_role('link', name='전형계획 원문 찾아보기 ›')).to_be_visible()
    links = detail.locator('a[target="_blank"]')
    assert links.count() > 0
    assert '#page=' in links.first.get_attribute('href')
    expect(page.locator('.trd-result')).to_have_count(0)
    assert len(requests) == 2 and requests[1].endswith(entry['file'])
    page.screenshot(path=str(ROOT / 'work/_pending/minimum-reference-mobile.png'), full_page=True)
    page.set_viewport_size({'width': 320, 'height': 700})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.get_by_text('수능 최저 원문·근거', exact=True).click()
    expect(page.get_by_text('검수 전 참고자료', exact=True)).to_be_visible()
    expect(page.locator('.trd-result')).to_have_count(0)
    print(json.dumps({'pass': True, 'package': entry['package_id'], 'requests': len(requests),
                      'checks': ['lazy load', 'real source links/pages', 'no grade verdict', '320/390/1440 layouts']}, ensure_ascii=False))
finally:
    app.close()
