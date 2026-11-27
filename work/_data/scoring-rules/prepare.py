"""2028 시행계획 원문에서 수시 교과전형 환산 규칙 초안을 만들 입력을 준비해요.

- 입력: app/public/data/admission-plans.json + work/_data/admission-plans/ 아래 내려받은 원본(sha256으로 찾음)
- 출력(로컬 전용, git 제외 폴더): work/_data/admission-plans/scoring-rules-work/
    files/<entry>/<name>   원문 파일(ZIP 안 파일은 꺼내서)
    text/<entry>.txt       쪽 표시(=== <파일> p.N ===)를 붙인 추출 텍스트
    inputs.json            대학·캠퍼스 항목별 교과전형 목록 + 원문 위치 + https 출처
실행: python work/_data/scoring-rules/prepare.py
"""
import glob, hashlib, io, json, os, re, subprocess, sys, zipfile
from pypdf import PdfReader

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PLANS = os.path.join(ROOT, 'app', 'public', 'data', 'admission-plans.json')
SRC = os.path.join(ROOT, 'work', '_data', 'admission-plans')
OUT = os.path.join(SRC, 'scoring-rules-work')


def sha_index():
    idx = {}
    for f in glob.glob(os.path.join(SRC, '**', '*'), recursive=True):
        if OUT in f or not os.path.isfile(f) or not f.lower().endswith(('.pdf', '.hwp', '.hwpx', '.zip')):
            continue
        idx.setdefault(hashlib.sha256(open(f, 'rb').read()).hexdigest(), f)
    return idx


def pdf_text(path, label):
    try:
        reader = PdfReader(path)
    except Exception as e:  # 깨진 PDF는 텍스트 없이 파일만 넘겨요(에이전트가 쪽을 직접 읽어요)
        return f'=== {label} 읽기 실패: {e} ===\n'
    parts = []
    for i, page in enumerate(reader.pages, 1):
        try:
            t = page.extract_text() or ''
        except Exception:
            t = ''
        parts.append(f'=== {label} p.{i} ===\n{t}\n')
    return ''.join(parts)


def hwp_text(path, label):
    r = subprocess.run(['hwp5txt', path], capture_output=True)
    return f'=== {label} (HWP, 쪽 구분 없음) ===\n{r.stdout.decode("utf-8", "replace")}\n'


def hwpx_text(path, label):
    with zipfile.ZipFile(path) as z:
        names = sorted(n for n in z.namelist() if re.match(r'Contents/section\d+\.xml', n))
        text = ' '.join(re.sub(r'<[^>]+>', ' ', z.read(n).decode('utf-8', 'replace')) for n in names)
    return f'=== {label} (HWPX, 쪽 구분 없음) ===\n{re.sub(r"[ \t]+", " ", text)}\n'


def extract(path, label):
    low = path.lower()
    if low.endswith('.pdf'):
        return pdf_text(path, label)
    if low.endswith('.hwp'):
        return hwp_text(path, label)
    if low.endswith('.hwpx'):
        return hwpx_text(path, label)
    return ''


def safe(name):
    return re.sub(r'[\\/:*?"<>|]', '_', name)


def main():
    plans = json.load(open(PLANS, encoding='utf-8'))
    idx = sha_index()
    inputs = []
    os.makedirs(os.path.join(OUT, 'text'), exist_ok=True)
    for e in plans['entries']:
        programs = [p for p in e['programs'] if p['round'] == '수시' and p['type'] == '교과']
        if not programs:
            continue
        folder = os.path.join(OUT, 'files', e['id'])
        os.makedirs(folder, exist_ok=True)
        files, text = [], []
        for doc in e['documents']:
            src = idx.get(doc.get('sha256'))
            if not src:
                continue
            url = doc.get('download_url') or doc.get('source_url')
            if doc['format'] == 'zip':
                with zipfile.ZipFile(src) as z:
                    members = [n for n in z.namelist() if n.lower().endswith(('.pdf', '.hwp', '.hwpx'))]
                    if doc.get('filename'):  # 모음집: 이 대학 파일만
                        members = [n for n in members if os.path.basename(n) == doc['filename'] or n.endswith(doc['filename'])]
                    for n in members:
                        dest = os.path.join(folder, safe(os.path.basename(n)))
                        open(dest, 'wb').write(z.read(n))
                        files.append({'path': os.path.relpath(dest, ROOT).replace('\\', '/'), 'document_id': doc['id'], 'source': url})
                        text.append(extract(dest, os.path.basename(dest)))
            else:
                dest = os.path.join(folder, f"{doc['id']}.{doc['format']}")
                if not os.path.exists(dest):
                    open(dest, 'wb').write(open(src, 'rb').read())
                files.append({'path': os.path.relpath(dest, ROOT).replace('\\', '/'), 'document_id': doc['id'], 'source': url})
                text.append(extract(dest, os.path.basename(dest)))
        text_path = os.path.join(OUT, 'text', f"{e['id']}.txt")
        open(text_path, 'w', encoding='utf-8').write(''.join(text))
        inputs.append({
            'entry': e['id'], 'university': e['university'], 'campus': e.get('campus', ''),
            'programs': [{'name': p['name'], 'method': p.get('method', ''), 'pages': p.get('pages', []), 'document_id': p.get('document_id')} for p in programs],
            'files': files, 'text': os.path.relpath(text_path, ROOT).replace('\\', '/'),
            'text_chars': sum(len(t) for t in text),
        })
        print(e['university'], len(programs), len(files), inputs[-1]['text_chars'], flush=True)
    json.dump(inputs, open(os.path.join(OUT, 'inputs.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('entries', len(inputs), 'programs', sum(len(i['programs']) for i in inputs))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
