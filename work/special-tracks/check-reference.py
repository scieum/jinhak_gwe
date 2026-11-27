"""G5 plus real-data desktop/mobile smoke checks, sharing one isolated build."""
import json
import re
import sys
from pathlib import Path
from playwright.sync_api import expect

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'app' / 'tools'))
from impl_gate import App, check, record

app = App()
try:
    gate = record('special-tracks', *check('special-tracks', app))
    print(json.dumps({'G5': gate['pass'], 'errors': gate['errors']}, ensure_ascii=False), flush=True)
    context = app.browser.new_context(viewport={'width': 1440, 'height': 900}, locale='ko-KR')
    context.add_init_script("localStorage.setItem('jinhak-navi-sample','off')")
    page = context.new_page()
    page_errors = []
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    page.goto(app.url + '/special-tracks', wait_until='networkidle', timeout=120000)
    page.locator('.st-reference-table tbody tr').first.wait_for()
    assert page.get_by_role('alert').count() == 0
    counts = page.get_by_role('radiogroup', name='계열').get_by_role('radio').all_text_contents()
    page.locator('.st-reference-table tbody tr').first.get_by_role('button').click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('heading', name='과거 입결 · 70% 컷 · 9등급').wait_for()
    assert dialog.get_by_role('link', name='대학 상세 보기 ›').count() == 1
    dialog.get_by_role('button', name='닫기').click()
    page.get_by_role('radio', name=re.compile(r'^보건,')).click()
    expect(page.get_by_role('radio', name=re.compile(r'^보건,'))).to_have_attribute('aria-checked', 'true')
    page.get_by_role('searchbox').fill('간호')
    page.locator('.st-reference-table tbody tr').first.wait_for()
    assert 'q=' in page.url
    page.get_by_role('searchbox').fill('찾을수없는학과xyz')
    page.get_by_role('heading', name='조건에 맞는 자료가 없어요').wait_for()
    page.get_by_role('button', name='조건 초기화').click()
    page.locator('.st-reference-table tbody tr').first.wait_for()
    page.get_by_role('radio', name=re.compile(r'^교육,')).click()
    expect(page.get_by_role('radio', name=re.compile(r'^교육,'))).to_have_attribute('aria-checked', 'true')
    page.get_by_role('button', name='사범대', exact=True).click()
    expect(page.get_by_role('button', name='사범대', exact=True)).to_have_attribute('aria-pressed', 'true')
    page.get_by_role('combobox', name='세부 학과').select_option('국어교육')
    expect(page.get_by_role('combobox', name='세부 학과')).to_have_value('국어교육')
    page.locator('.st-reference-table tbody tr').first.wait_for()
    assert all('국어교육' in name and '한국어교육' not in name for name in page.locator('.st-reference-table tbody tr td:nth-child(2)').all_text_contents())
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('combobox', name='세부 학과')).to_have_value('국어교육')
    page.locator('.st-reference-table tbody tr').first.wait_for()
    out = ROOT / 'work' / '_cache' / 'impl'
    out.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(out / 'special-tracks-reference-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.st-reference .st-card').first.wait_for()
    page.get_by_role('combobox', name='세부 학과').select_option('영어교육')
    expect(page.get_by_role('combobox', name='세부 학과')).to_have_value('영어교육')
    page.locator('.st-reference .st-card').first.wait_for()
    assert all('영어교육' in name for name in page.locator('.st-reference .st-card__unit').all_text_contents())
    assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    page.locator('.st-reference .st-card__open').first.click()
    page.get_by_role('dialog').wait_for()
    page.keyboard.press('Escape')
    assert page.get_by_role('dialog').count() == 0
    page.evaluate('window.scrollTo(0, 0)')
    page.screenshot(path=str(out / 'special-tracks-reference-mobile.png'), full_page=True)
    assert not page_errors, page_errors
    result = {'pass': True, 'counts': counts, 'checks': ['real data', 'detail', 'search', 'empty/reset', 'education departments', 'department reload', 'mobile department selection', 'mobile cards', 'no horizontal overflow', 'no page errors']}
    (ROOT / 'work' / 'special-tracks' / 'reference-check.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False), flush=True)
    context.close()
    if not gate['pass']:
        sys.exit(1)
finally:
    app.close()
