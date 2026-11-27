"""전국 배치표 점 그래프를 G5와 같은 빌드·시드로 열어 행마다 대학·높이·점·숫자를 JSON으로, 전체 높이 캡처를 PNG로 남겨요.
시안을 새 자료에 맞출 때 디자이너가 보는 자료예요(2026-11-27). 실행: python work/national-placement/dump_plot.py
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'app' / 'tools'))
from impl_gate import App

OUT = ROOT / 'work' / '_cache' / 'impl'
JS = """() => { const plot = document.querySelector('.np-plot'); if (!plot) return null; const base = plot.getBoundingClientRect();
  const r = e => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x - base.x), y: Math.round(b.y - base.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  return { plot: r(plot), rows: [...plot.querySelectorAll('.np-row:not(.np-bubble-row)')].map(row => ({
    university: row.querySelector('.np-row__head')?.innerText.trim(), box: r(row), lanes: getComputedStyle(row).getPropertyValue('--np-lanes').trim(),
    dots: [...row.querySelectorAll('.np-dot')].map(d => ({ ...r(d), label: d.getAttribute('aria-label'), mark: d.querySelector('svg')?.getAttribute('class'), text: d.innerText.trim() })) })) }; }"""
app = App()
try:
    for width in (390, 1440):
        app.page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 900})
        app.page.evaluate('sessionStorage.clear()')
        app.page.goto(app.url + '/national-placement', wait_until='networkidle', timeout=120_000)
        app._settle()
        data = app.page.evaluate(JS)
        (OUT / f'national-placement-plot-{width}.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
        app.page.evaluate("document.querySelectorAll('.sample-band').forEach(e => e.remove())")
        (OUT / f'national-placement-full-{width}.png').write_bytes(app.page.screenshot(full_page=True, animations='disabled'))
        print(width, data and data['plot'], data and len(data['rows']))
finally:
    app.close()
