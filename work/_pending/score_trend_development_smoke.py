"""Seeded local preview only: mobile target selection and responsive shell."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'app/tools'))
from impl_gate import App
from playwright.sync_api import expect

app = App()
checks = []
try:
    page = app.page
    app.measure('/score-trend', (390, 844), [])
    action = page.locator('#appbar-actions').get_by_role('button', name='목표 대학', exact=True)
    expect(action).to_be_visible()
    logo = page.locator('.appbar__logo').bounding_box()
    box = action.bounding_box()
    assert box['x'] >= logo['x'] + logo['width'] + 16
    assert box['x'] + box['width'] <= 390
    page.screenshot(path=str(ROOT / 'work/_pending/score-trend-mobile-developed.png'))
    action.click()
    dialog = page.get_by_role('dialog', name='목표 대학 정하기', exact=True)
    expect(dialog).to_be_visible()
    original = dialog.get_by_role('combobox', name='2순위', exact=True).input_value()
    assert original
    dialog.get_by_role('combobox', name='2순위', exact=True).select_option('')
    dialog.get_by_role('button', name='취소', exact=True).click()
    confirm = page.get_by_role('dialog', name='저장하지 않고 닫을까요?', exact=True)
    expect(confirm).to_be_visible()
    confirm.get_by_role('button', name='계속 고르기').click()
    expect(dialog.get_by_role('combobox', name='2순위', exact=True)).to_have_value('')
    page.screenshot(path=str(ROOT / 'work/_pending/score-trend-mobile-picker.png'))
    dialog.get_by_role('button', name='저장', exact=True).click()
    expect(page.get_by_role('status')).to_have_text('목표 대학을 저장했어요')
    expect(action).to_be_focused()
    saved = page.evaluate("JSON.parse(localStorage.getItem('jinhak-navi-score-trend-targets'))")
    assert len(saved) == 2
    page.reload(wait_until='networkidle')
    action.click()
    assert dialog.get_by_role('combobox', name='1순위', exact=True).input_value() == saved[0]
    assert dialog.get_by_role('combobox', name='2순위', exact=True).input_value() == saved[1]
    dialog.get_by_role('button', name='취소', exact=True).click()
    checks.append('390px: header placement, edit/confirm/save, focus restoration, reload persistence')
    page.set_viewport_size({'width': 320, 'height': 700})
    expect(action).to_be_visible()
    action.click()
    expect(dialog).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert dialog.evaluate('(e) => e.scrollWidth <= e.clientWidth')
    dialog.get_by_role('button', name='취소', exact=True).click()
    checks.append('320px: picker visible without horizontal overflow')
    page.set_viewport_size({'width': 1440, 'height': 900})
    expect(page.locator('#appbar-actions button')).to_have_count(0)
    page.get_by_role('button', name='목표 대학 바꾸기').click()
    expect(dialog).to_be_visible()
    dialog.get_by_role('button', name='취소', exact=True).click()
    checks.append('1440px: mobile action removed, desktop action remains functional')
    print(json.dumps({'pass': True, 'checks': checks}, ensure_ascii=False))
finally:
    app.close()
