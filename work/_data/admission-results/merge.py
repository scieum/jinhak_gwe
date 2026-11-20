"""Merge per-university CSVs into _all.csv and print a coverage table.

Usage: python -I merge.py   (run from this folder)
"""
import csv, glob, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
COLS = ['university', 'result_year', 'round', 'admission_type', 'program', 'recruit_unit', 'quota',
        'applicants', 'competition_rate', 'fill_count', 'fill_rate', 'cut_50', 'cut_70', 'cut_other',
        'metric', 'basis', 'grade_system', 'source_url', 'source_page', 'note']
# Some agents put "예비순위/충원합격 순위" (rank of last admitted) into fill_count; it is not a head count.
RANK = re.compile(r'순위|예비|번호|석차')


# Current collection scope: four-year universities and education universities only.
EXCLUDED_UNIVERSITIES = {
    '강릉영동대학교', '강원도립대학교', '세경대학교', '송곡대학교',
    '송호대학교', '한국골프대학교', '한국골프과학기술대학교', '한림성심대학교',
}
ADIGA_SOURCE = re.compile(r'https?://(?:[^/]+\.)?adiga\.kr(?:[/:?#]|$)', re.I)


def exclusion_reason(row):
    if row['university'] in EXCLUDED_UNIVERSITIES or '한국폴리텍' in row['university']:
        return '전문대·폴리텍 제외'
    # 2026-11-19: adiga rows are allowed again as supplements, but only from <slug>-adiga.csv files.
    return ''


def normalize(row):
    if row['fill_count'] and RANK.search(row['note']):
        row['cut_other'] = '; '.join(x for x in [row['cut_other'], f"충원순위 {row['fill_count']}"] if x)
        row['fill_count'] = ''
    return row


PILOT = {'kangwon', 'gwnu', 'hallym', 'yonsei-mirae', 'cku', 'chungbuk', 'konkuk', 'khu', 'kookmin', 'inha'}
GANGWON_FOUR_YEAR = {'hallym', 'sangji', 'halla', 'kyungdong', 'chuncheon-education', 'yonsei-mirae'}
GYEONGGI_FOUR_YEAR = {'acts', 'ptu', 'hsmu', 'dankook', 'yewon', 'gachon', 'jbu', 'suwon', 'uhs', 'anyang', 'cuk', 'yongin', 'hknu', 'hs', 'stu', 'eulji', 'daejin', 'dyu', 'kau', 'sjs', 'cha', 'tukorea', 'kyungdong-yangju', 'shinhan', 'hansei', 'sungkyul', 'ajou', 'ginue', 'kangnam'}
CHUNGCHEONG_FOUR_YEAR = {'knue', 'ut', 'cje', 'cju', 'seowon', 'semyung', 'konkuk-glocal', 'kdu', 'u1', 'jwu', 'kkot', 'kongju', 'gnue', 'konyang', 'ggu', 'kornu', 'nsu', 'dankook-cheonan', 'bu', 'smu-cheonan', 'sunmoon', 'sch', 'jbu-geumsan', 'chungwoon', 'koreatech', 'nuch', 'hanseo', 'hoseo', 'cnu', 'hanbat', 'dju', 'mokwon', 'pcu', 'eulji-daejeon', 'hannam', 'wsu', 'kaist', 'woosuk-jincheon'}


NATIONAL_FOUR_YEAR = {'jejunu', 'inu', 'iccu', 'jiu', 'anyang-ganghwa', 'gachon-medical', 'chungwoon-incheon'}
DAEGU_GYEONGBUK_FOUR_YEAR = {'knu', 'kmu', 'dnue', 'ikw', 'kiu', 'gknu', 'kumoh', 'gimcheon', 'dcu', 'daegu', 'dgau', 'dhu', 'daeshin', 'dongguk-wise', 'dyu-yeongju', 'sgu', 'yu', 'uu', 'handong', 'ytus'}
BUSAN_ULSAN_GYEONGNAM_FOUR_YEAR = {'ks', 'kosin', 'pknu', 'kmou', 'tu', 'dongseo', 'donga', 'deu', 'cup', 'bnue', 'pusan', 'bufs', 'silla', 'ulsan', 'kaya', 'kyungnam', 'gnu', 'changwon', 'bpu', 'inje', 'cs', 'cnue', 'ysu-busan', 'ysu-yangsan'}
HONAM_FOUR_YEAR = {'sehan-yeongam', 'jbnu', 'jj', 'mmu', 'jesus', 'gwangju-catholic', 'hanil', 'dsu', 'jnu', 'scnu', 'howon', 'htus', 'woosuk-jeonju', 'yungsan', 'mcu', 'honam-extra-round', 'chodang', 'honam', 'jnue', 'jnu-yeosu', 'chosun', 'yewon-imsil', 'kwangshin', 'gwangju-edu', 'songwon', 'kunsan', 'mokpo', 'wku', 'kwu', 'nambu', 'gwangju'}
INCHEON = {'inha', 'inu', 'iccu', 'anyang-ganghwa', 'gachon-medical', 'chungwoon-incheon'}
SPECIAL_SCHOOLS = {'kaist', 'gist', 'dgist', 'unist', 'kentech', 'postech', 'kma', 'kna', 'afa', 'kafna', 'knpu', 'karts', 'nuch'}
# Capital-area files can hold several campuses; these campus names sit in Gyeonggi.
GYEONGGI_CAMPUS = re.compile(r'ERICA|안성|글로벌|\(자연\)|\(국제\)')


def region(slug, university):
    if slug in SPECIAL_SCHOOLS - {'kaist', 'nuch'}:
        return '특수'
    if slug in HONAM_FOUR_YEAR:
        return '호남'
    if slug in BUSAN_ULSAN_GYEONGNAM_FOUR_YEAR:
        return '부울경'
    if slug in DAEGU_GYEONGBUK_FOUR_YEAR:
        return '대구경북'
    if slug in {'jejunu', 'jiu'}:
        return '제주'
    if slug in GANGWON_FOUR_YEAR | {'kangwon', 'gwnu', 'cku'}:
        return '강원'
    if slug in CHUNGCHEONG_FOUR_YEAR | {'chungbuk'}:
        return '충청'
    if slug in INCHEON:
        return '인천'
    if slug in GYEONGGI_FOUR_YEAR | {'kyonggi'} or GYEONGGI_CAMPUS.search(university):
        return '경기'
    return '서울'


def allowed():
    # Include the pilot, capital-area list and requested Gangwon four-year universities.
    # Preserve other source CSVs without automatically including them in the master.
    with open(os.path.join(HERE, '_capital-area-list.md'), encoding='utf-8') as f:
        return PILOT | GANGWON_FOUR_YEAR | GYEONGGI_FOUR_YEAR | CHUNGCHEONG_FOUR_YEAR | NATIONAL_FOUR_YEAR | DAEGU_GYEONGBUK_FOUR_YEAR | BUSAN_ULSAN_GYEONGNAM_FOUR_YEAR | HONAM_FOUR_YEAR | SPECIAL_SCHOOLS | set(re.findall(r'^\| [A-Z] \| ([a-z-]+) \|', f.read(), re.M))


def main():
    rows, bad, special_rows = [], [], []
    by_region = {}
    excluded = Counter()
    ok = allowed()
    for path in sorted(glob.glob(os.path.join(HERE, '*.csv'))):
        slug = os.path.basename(path)[:-4]
        is_adiga = slug.endswith('-adiga')
        if is_adiga:
            slug = slug[:-6]
        if slug not in ok:
            continue
        with open(path, encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)
            if reader.fieldnames != COLS:
                bad.append(f'{os.path.basename(path)}: header {reader.fieldnames}')
                continue
            for i, r in enumerate(reader, 2):
                reason = exclusion_reason(r)
                if reason:
                    excluded[reason] += 1
                    continue
                if not r['source_url']:
                    bad.append(f'{os.path.basename(path)}:{i} no source_url')
                if bool(ADIGA_SOURCE.search(r['source_url'])) != is_adiga:
                    bad.append(f'{os.path.basename(path)}:{i} adiga rows belong only in <slug>-adiga.csv')
                # These source parsers distinguish fill counts from ranks explicitly.
                r = r if slug in GYEONGGI_FOUR_YEAR | CHUNGCHEONG_FOUR_YEAR | NATIONAL_FOUR_YEAR | DAEGU_GYEONGBUK_FOUR_YEAR | BUSAN_ULSAN_GYEONGNAM_FOUR_YEAR | HONAM_FOUR_YEAR | SPECIAL_SCHOOLS else normalize(r)
                rows.append(r)
                if slug in SPECIAL_SCHOOLS:
                    special_rows.append(r)
                by_region.setdefault(region(slug, r['university']), []).append(r)
    # Category view also includes KAIST/NUCH already classified geographically.
    # This does not append those rows to the master a second time.
    by_region['특수'] = special_rows
    for name, part in [('_all', rows)] + [(f'_all-{k}', v) for k, v in sorted(by_region.items())]:
        with open(os.path.join(HERE, f'{name}.csv'), 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.DictWriter(f, COLS)
            w.writeheader()
            w.writerows(part)
    cov = Counter((r['university'], r['result_year'], r['round']) for r in rows)
    out = ['| 대학 | 학년도 | 수시 | 정시 |', '|---|---|---|---|']
    for u, y in sorted({(u, y) for u, y, _ in cov}):
        out.append(f"| {u} | {y} | {cov[(u, y, '수시')]} | {cov[(u, y, '정시')]} |")
    with open(os.path.join(HERE, '_coverage.md'), 'w', encoding='utf-8') as f:
        f.write(f'총 {len(rows)}행\n\n' + '\n'.join(out) + '\n')
    print(f'{len(rows)} rows, {len(bad)} problems')
    print('  ' + ', '.join(f'{k} {len(v)}' for k, v in sorted(by_region.items())))
    for reason, count in sorted(excluded.items()):
        print(f'  excluded {count}: {reason}')
    for b in bad[:30]:
        print(' ', b)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
