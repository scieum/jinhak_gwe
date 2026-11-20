"""Read explicitly labelled statistics; never estimate percentiles or convert scores.

The collected row remains authoritative. Ambiguous populations, subjects, ranges,
suppression marks and multiple values for the same statistic remain source-only.
"""
import re

EXTRA_KEYS = ('cut_75', 'cut_80', 'cut_85', 'cut_90', 'cut_100', 'mean', 'mean_university', 'mean_all', 'mean_top9', 'mean_main')
NUMBER = r'(?P<value>[0-9]+(?:\.[0-9]+)?)(?![0-9.,~～%]|\s*[-~～]\s*[0-9])'
SEP = r'\s*[:：=/]?\s*'
PERCENT = re.compile(r'(?:(?P<pct>75|80|85|90|100)\s*%\s*(?:컷|cut)?|(?:컷|최저)\s*\((?P<bracket>75|80|85|90|100)\s*%\))' + SEP + NUMBER, re.I)
MEAN = re.compile(r'(?:평균\s*/?\s*등급|등급\s*평균|내신\s*평균|최종평균|최초평균|평균\s*성적|평균)' + SEP + NUMBER)
POPULATIONS = re.compile(r'최종\s*등록(?:자|생)?|최종\s*합격(?:자|생)?|최초\s*합격(?:자|생)?|최초평균|최초\+추가합격자|제?1단계\s*합격자|지원자|원서접수|등록자|등록생|합격자')
METRICS = re.compile(r'수능\s*등급|(?:학생부|교과|내신|성적)[^;:/]{0,12}?등급|교과성적|전과목|상위\d+과목|환산점수|총점|서류평가|면접점수|백분위|표준점수|평균점수')


def population(text):
    matches = list(POPULATIONS.finditer(text))
    if not matches:
        return None
    name = re.sub(r'\s', '', matches[-1].group())
    if '등록' in name:
        return '최종등록자' if '최종' in name else '등록자'
    if '1단계' in name:
        return '1단계 합격자'
    if name == '최초+추가합격자':
        return '최초·추가합격자'
    if '최초' in name:
        return '최초합격자'
    if name in ('지원자', '원서접수'):
        return '지원자'
    return '최종합격자' if '최종' in name else '합격자'


def extract_statistics(row):
    if row['grade_system'] != '9' or row['metric'] not in ('교과등급', '수능등급'):
        return {}
    text = row['cut_other']
    basis_populations = {population(m.group()) for m in POPULATIONS.finditer(row['basis'])}
    fallback = next(iter(basis_populations)) if len(basis_populations) == 1 else '대상 미명시'
    candidates = {}
    for segment in re.split(r'[;\n]', text):
        segment = segment.strip()
        if not segment:
            continue
        # A combined-program statistic cannot be assigned to one constituent program.
        if '통합' in segment and '통합' not in row.get('program', ''):
            continue
        for pattern in (PERCENT, MEAN):
            for match in pattern.finditer(segment):
                value = match.group('value')
                if not 1 <= float(value) <= 9:
                    continue
                prefix = segment[:match.start()]
                label = segment[match.start():match.start('value')]
                markers = list(METRICS.finditer(prefix))
                marker = markers[-1].group() if markers else ''
                explicit_grade_label = bool(re.search(r'등급|내신', label))
                if explicit_grade_label and re.search(r'점수|총점|서류평가|백분위', marker):
                    marker = ''
                # A grade-valued number in a score/percentile block is still a score.
                if marker and re.search(r'점수|총점|서류평가|백분위', marker):
                    continue
                if marker and (('수능' in marker) != (row['metric'] == '수능등급')):
                    continue
                # Without a local metric, mixed metric text cannot be disambiguated.
                if not marker and not explicit_grade_label and re.search(r'환산점수|총점|서류평가|면접점수|백분위|수능등급', text):
                    continue
                key = 'mean' if pattern is MEAN else 'cut_' + (match.group('pct') or match.group('bracket'))
                # A mean of a percentile subset is not an overall mean.
                if key == 'mean' and re.search(r'\([^)]*%[^)]*\)\s*$', prefix):
                    continue
                scope = population(prefix + label) or population(segment) or fallback
                if '최종평균' in label:
                    scope += ' · 최종평균'
                subject = re.findall(r'상위\d+과목|전과목|국영수사과|대학반영|교과환산등급', prefix)
                subject = subject[-1] if subject else ''
                if key == 'mean' and subject:
                    key = {'대학반영': 'mean_university', '교과환산등급': 'mean_university', '전과목': 'mean_all', '상위9과목': 'mean_top9', '국영수사과': 'mean_main'}.get(subject)
                    if key is None:
                        continue
                candidates.setdefault(key, []).append({'value': value, 'population': scope, 'evidence': segment, '_subject': subject})
    result = {}
    for key, items in candidates.items():
        # Prefer an explicitly registered population; never average conflicting values.
        registered = [item for item in items if item['population'] in ('최종등록자', '등록자')]
        items = registered or items
        if len({(float(item['value']), item['population'], item['_subject']) for item in items}) == 1:
            result[key] = {field: items[0][field] for field in ('value', 'population', 'evidence')}
    return result
