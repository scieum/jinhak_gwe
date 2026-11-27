"""학과별 구간표를 G5와 같은 빌드·시드로 열어 층마다 머리(구간·개수)·칸(대학·모집단위·전형·컷·위치)을 JSON으로,
전체 높이 캡처를 PNG로 남겨요. 입결 자료가 바뀌어 시안을 다시 그릴 때 디자이너가 보는 자료예요(2026-11-27).
실행: python work/dept-tier/dump_board.py
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'app' / 'tools'))
from impl_gate import App

OUT = ROOT / 'work' / '_cache' / 'impl'
JS = """() => { const board = document.querySelector('.dept-tier__board'); if (!board) return { board: null, text: document.querySelector('[data-slug="dept-tier"]')?.innerText.slice(0, 400) };
  const top = window.scrollY, r = e => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + top), w: Math.round(b.width), h: Math.round(b.height) }; };
  const t = (e, s) => e.querySelector(s)?.innerText.trim() ?? '';
  return { board: r(board), basis: t(document, '.dept-tier__basis'), controls: [...document.querySelectorAll('[aria-pressed="true"]')].map(b => b.innerText.trim()).filter(Boolean), chips: [...document.querySelectorAll('[aria-label="특별 전형 종류"] .filter-chip')].map(b => ({ text: b.innerText.trim(), w: Math.round(b.getBoundingClientRect().width) })),
    after: [...document.querySelectorAll('.trace-accordion, .disclaimer-note')].map(e => ({ cls: e.className, ...r(e) })),
    layers: [...board.querySelectorAll('.tier-layer')].map(l => ({ range: t(l, '.tier-layer__range'), count: t(l, '.tier-layer__head .t-caption'), box: r(l),
      empty: !l.querySelector('.tier-layer__cells'), cells: [...l.querySelectorAll('.tier-cell')].map(c => ({ ...r(c), university: t(c, '.tier-cell__univ'), unit: t(c, '.tier-cell__unit'),
        program: [...c.querySelectorAll('.tier-cell__program')].map(p => p.innerText.trim()), cut: t(c, '.tier-cell__cut'), logo: !!c.querySelector('img'), logo_src: c.querySelector('img')?.getAttribute('src') ?? '', plan: c.parentElement.querySelector('.tier-cell__plan')?.innerText.trim() ?? '' })) })) }; }"""
app = App()
try:
    for width, height in ((390, 844), (1440, 900)):
        app.page.set_viewport_size({'width': width, 'height': height})
        app.page.evaluate('sessionStorage.clear()')
        app.page.goto(app.url + '/dept-tier', wait_until='networkidle', timeout=120_000)
        app._settle()
        data = app.page.evaluate(JS)
        (OUT / f'dept-tier-board-{width}.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
        app.page.evaluate("document.querySelectorAll('.sample-band').forEach(e => e.remove()); window.scrollTo(0, 0)")
        (OUT / f'dept-tier-full-{width}.png').write_bytes(app.page.screenshot(full_page=True, animations='disabled'))
        print(width, data.get('board'), len(data.get('layers') or []), sum(len(l['cells']) for l in data.get('layers') or []))
finally:
    app.close()
