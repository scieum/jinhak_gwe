"""Read-only master audit. Raw observations stay unchanged; findings use CSV record numbers."""
from pathlib import Path
from collections import Counter, defaultdict
import csv, hashlib, json, re, sys
from urllib.parse import urlparse
import merge

P = Path(__file__).parent
OUT = P / 'quality-review'
def read(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        r = csv.DictReader(f)
        assert r.fieldnames == merge.COLS, (path, r.fieldnames)
        rows = list(r)
        assert all(None not in r and all(v is not None for v in r.values()) for r in rows), path
        return rows
def write(name, rows, fields):
    with (OUT/name).open('w', encoding='utf-8-sig', newline='') as f:
        w=csv.DictWriter(f, fields); w.writeheader(); w.writerows(rows)
def key(r): return tuple(r[k] for k in merge.COLS)
def number(v):
    s=v.replace(',','').strip()
    return float(s) if re.fullmatch(r'\d+(?:\.\d+)?',s) else None

def main():
    OUT.mkdir(exist_ok=True)
    master=P/'_all.csv'; before=hashlib.sha256(master.read_bytes()).hexdigest()
    rows=read(master); expected=[]; row_slugs=defaultdict(set); excluded=Counter(); file_rows={}
    for slug in sorted(merge.allowed()):
        path=P/(slug+'.csv')
        if not path.exists(): continue
        source=read(path); accepted=[]
        for r in source:
            reason=merge.exclusion_reason(r)
            if reason: excluded[(slug,reason)]+=1; continue
            # Mirror the existing merge rules solely for a read-only reconciliation.
            n=r.copy() if slug in merge.GYEONGGI_FOUR_YEAR | merge.CHUNGCHEONG_FOUR_YEAR else merge.normalize(r.copy())
            expected.append(n); accepted.append(n); row_slugs[key(n)].add(slug)
        file_rows[slug]=accepted
    counts=Counter(map(key,rows)); exp=Counter(map(key,expected))
    findings=[]; logical=defaultdict(list)
    def issue(i,r,code,detail,severity='review'):
        findings.append(dict(record=i,slug=' | '.join(sorted(row_slugs[key(r)])),university=r['university'],result_year=r['result_year'],round=r['round'],program=r['program'],recruit_unit=r['recruit_unit'],code=code,severity=severity,detail=detail,metric=r['metric'],basis=r['basis'],cut_50=r['cut_50'],cut_70=r['cut_70'],source_url=r['source_url'],source_page=r['source_page']))
    for i,r in enumerate(rows,2):
        for col in ['university','result_year','round','program','recruit_unit','source_url','source_page']:
            if not r[col].strip(): issue(i,r,'required_missing',col,'error')
        if r['result_year'] not in ['2024','2025','2026']: issue(i,r,'year_invalid',r['result_year'],'error')
        if merge.exclusion_reason(r): issue(i,r,'excluded_source',merge.exclusion_reason(r),'error')
        if any('\ufffd' in v for v in r.values()): issue(i,r,'replacement_character','문자 디코딩 손실 의심','error')
        if urlparse(r['source_url']).scheme not in ['http','https']: issue(i,r,'source_url_invalid',r['source_url'],'error')
        if r['cut_50'] or r['cut_70']:
            if not r['metric']: issue(i,r,'cut_without_metric','50/70% 값이 있으나 지표 종류 없음','error')
            if not r['basis']: issue(i,r,'cut_without_basis','50/70% 값이 있으나 산출 대상 기준 없음')
        for col in ['cut_50','cut_70']:
            value=number(r[col])
            if value is not None and r['metric'] in ['교과등급','수능등급'] and not 1<=value<=9:
                issue(i,r,'grade_out_of_range',f'{col}={r[col]}','error')
        a,b=number(r['cut_50']),number(r['cut_70'])
        if a is not None and b is not None:
            if r['metric'] in ['교과등급','수능등급'] and a>b:
                issue(i,r,'cut_order','등급 50% > 70%; 서로 다른 정렬 기준 또는 원문 확인 필요')
            elif r['metric'] in ['환산점수','백분위','표준점수'] and a<b:
                issue(i,r,'cut_order','점수 50% < 70%; 서로 다른 정렬 기준 또는 원문 확인 필요')
        if r['metric']=='교과등급' and not r['grade_system']:
            issue(i,r,'grade_system_missing','교과등급 행의 등급제 공란')
        q,a,c=(number(r[k]) for k in ['quota','applicants','competition_rate'])
        if all(x is not None for x in (q,a,c)) and q>0 and abs(a/q-c)>.12:
            issue(i,r,'ratio_mismatch',f'모집 {r["quota"]}, 지원 {r["applicants"]}, 경쟁률 {r["competition_rate"]}; 원문 검토용 검산, 값 변경 안 함')
        # Do not merge these: repeated keys can be distinct cohorts, formulas, sources or metrics.
        logical[tuple(r[k] for k in ['university','result_year','round','admission_type','program','recruit_unit','metric','basis'])].append((i,r))
    dup=[]
    for group in logical.values():
        if len(group)<2: continue
        values={tuple(r[k] for k in ['quota','applicants','competition_rate','fill_count','fill_rate','cut_50','cut_70','cut_other']) for _,r in group}
        kind='same_values_multiple_sources' if len(values)==1 else 'same_key_different_values'
        for i,r in group:
            dup.append(dict(group=min(x[0] for x in group),record=i,kind=kind,university=r['university'],result_year=r['result_year'],round=r['round'],program=r['program'],recruit_unit=r['recruit_unit'],metric=r['metric'],basis=r['basis'],cut_50=r['cut_50'],cut_70=r['cut_70'],cut_other=r['cut_other'],source_url=r['source_url'],source_page=r['source_page'],note=r['note']))
    scope={slug:'경기' for slug in merge.GYEONGGI_FOUR_YEAR}
    scope.update({slug:'충청' for slug in merge.CHUNGCHEONG_FOUR_YEAR|{'chungbuk'}})
    scope.update({slug:'강원' for slug in merge.GANGWON_FOUR_YEAR|{'kangwon','gwnu','cku'}})
    limits={}; names={}
    for filename in ['_gyeonggi-coverage.csv','_chungcheong-coverage.csv']:
        with (P/filename).open(encoding='utf-8-sig',newline='') as f:
            for r in csv.DictReader(f):
                scope.setdefault(r['slug'],r.get('region','경기'))
                names[r['slug']]=r['university']
                limits[(r['slug'],r['result_year'],r.get('round',''))]=r.get('limitations',r.get('note',''))
    # Existing capital-area files include campuses in the requested region.
    regional_labels={'khu':{'경희대(국제)'},'hufs':{'한국외대(글로벌)'},'mju':{'명지대(자연)'},'hanyang':{'한양대(ERICA)'},'cau':{'중앙대(안성)'}}
    for slug in ['kyonggi','khu','hufs','mju','hanyang','cau','skku']:scope[slug]='경기'
    scope['kyungdong-goseong']='강원';names['kyungdong-goseong']='경동대학교(고성)'
    gap_reasons={
        'yonsei-mirae':('출처 기준 제외','입학처 Q&A(2026-09-02)가 어디가 조회를 안내. 기존 어디가 221행은 출처 정책으로 제외. 대학 도메인 자체 성적 원문 미확보.','https://admission.yonsei.ac.kr/mirae/admission/html/rolling/qnaView.asp?QNA_NO=34027','이번 공식 웹 재확인'),
        'woosuk-jincheon':('접근 차단','공식 목록 및 첨부 게시 흔적은 있으나 방화벽 정책에 따른 접근 차단. 검색 캐시 숫자는 채택하지 않음.','https://enter.woosuk.ac.kr/main/?menu=52','이번 공식 웹 재확인'),
        'calvin':('게시글 접근 오류','2024~2026 수시 경쟁률 목록은 있으나 공식 상세 조회 404.','http://www.calvin.ac.kr/iphak/boardList.do?brd_mgrno=730&menu_no=2509','이번 공식 조회 재확인'),
        'ggu':('해당 연도 게시 미확인','공식 결과 목록에 2025·2024 자료가 있고 2026은 확인되지 않음. 미공개 단정 안 함.','https://www.ggu.ac.kr/matriculation/sub030101','이번 공식 웹 재확인'),
        'jwu':('해당 모집시기 게시 미확인','목록의 2024~2026 결과는 수시. 같은 연도 정시 결과 미확보.','https://ipsi.jwu.ac.kr/boards/admission-results?page=1','이번 공식 웹 재확인'),
        'halla':('자료 제목·연도 불일치','파일명에 2024가 있으나 문서 제목은 2025학년도 정시 예상 모집인원·평균성적. 2024 실제 결과로 수록하지 않음.','https://ipsi.halla.ac.kr/pdf/lib/regular_web/ipsi_regular_before_2024.pdf','보존된 공식 PDF 재확인'),
        'kyungdong-goseong':('캠퍼스 결과 미확보','원주 메디컬 및 양주 메트로폴과 구분. 고성 글로벌캠퍼스 국내 신입학 결과 미확보.','','기존 기록/공식 PDF 범위 확인'),
    }
    coverage=[]
    for slug,region in sorted(scope.items()):
        source=file_rows.get(slug,[])
        if slug in regional_labels: source=[r for r in source if r['university'] in regional_labels[slug]]
        for y in ['2024','2025','2026']:
            for rd in ['수시','정시']:
                ss=[r for r in source if r['result_year']==y and r['round']==rd]
                scored=[r for r in ss if r['cut_50'] or r['cut_70'] or (r['metric'] not in ['','기타'] and r['cut_other'])]
                reason=gap_reasons.get(slug,('기존 누락/원문 확인 필요',limits.get((slug,y,rd),limits.get((slug,y,''),'')),'','기존 조사기록; 이번 개별 웹 재확인 아님'))
                limitation=limits.get((slug,y,rd),limits.get((slug,y,''),''))
                if slug in ['kyonggi','skku']:limitation+='; 캠퍼스 통합 발표 자료로 경기 소재 학과에 임의 배분하지 않음'
                coverage.append(dict(slug=slug,region=region,university=' / '.join(sorted({r['university'] for r in source})) or names.get(slug,slug),result_year=y,round=rd,rows=len(ss),score_candidate_rows=len(scored),status=reason[0] if not ss else '성적 포함 여부 확인 필요' if not scored else '자료 일부 수록',limitations=reason[1] if not ss else limitation,evidence_url=reason[2] if not ss else '',checked=reason[3] if not ss else '통합본·학교별 파일 대조; 전전형 완전성 확인 아님'))
    write('findings.csv',findings,list(findings[0]) if findings else ['record','code'])
    write('duplicate-candidates.csv',dup,list(dup[0]) if dup else ['group','record'])
    write('coverage.csv',coverage,list(coverage[0]))
    gaps=[r for r in coverage if not r['rows']]
    write('gaps.csv',gaps,list(coverage[0]))
    flags=defaultdict(set);groups={}
    for f in findings:flags[f['record']].add(f['code'])
    for d in dup:groups[d['record']]=(d['group'],d['kind'])
    index=[]; aliases=defaultdict(set);programs=defaultdict(Counter);units=defaultdict(set)
    for i,r in enumerate(rows,2):
        slugs=sorted(row_slugs[key(r)]);slug=' | '.join(slugs)
        aliases[r['university']].update(slugs)
        stat=[]
        if r['cut_50']:stat.append('50%컷')
        if r['cut_70']:stat.append('70%컷')
        # Descriptive tags only; never assign an unlabelled cut_other value to cut_70.
        text=r['cut_other']
        for pattern,label in [(r'평균','평균'),(r'최저','최저'),(r'최고','최고'),(r'표준\s*편차','표준편차'),(r'75\s*%','75%'),(r'80\s*%','80%'),(r'90\s*%','90%'),(r'100\s*%','100%'),(r'충원.*?순위|예비.*?번호|예비.*?순위','충원순위')]:
            if re.search(pattern,text):stat.append(label)
        population=' | '.join(s for s in ['최종등록자','최초합격자','최종합격자','지원자'] if s in r['basis']+' '+text)
        if not population and '합격자' in r['basis']+' '+text:population='합격자(세부 기준 원문 확인)'
        group,kind=groups.get(i,('',''))
        index.append(dict(record=i,row_sha256=hashlib.sha256(json.dumps(r,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),slug=slug,university=r['university'],result_year=r['result_year'],round=r['round'],metric=r['metric'],statistics=' | '.join(stat),population_mentions=population or '미명시/원문 확인',numeric_cut_50=number(r['cut_50']) is not None,numeric_cut_70=number(r['cut_70']) is not None,distribution='분포' in r['basis'],recalculated=bool(re.search('재산출|재계산|모집단위 변환|전형방법.*적용',r['note']+' '+r['basis']+' '+r['source_page'])),duplicate_group=group,duplicate_kind=kind,review_flags=' | '.join(sorted(flags[i])),review_status='draft'))
        if any(s in scope for s in slugs):
            programs[(slug,r['university'],r['round'],r['admission_type'],r['program'])][r['result_year']]+=1
            normalized=re.sub(r'[\s·ㆍ・\-()]','',r['recruit_unit'])
            units[(slug,r['university'],normalized)].add((r['result_year'],r['recruit_unit']))
    write('row-index.csv',index,list(index[0]))
    aliasrows=[dict(university=u,slug=' | '.join(sorted(s)),campus_label=' | '.join(re.findall(r'\((.*?)\)',u)) or '캠퍼스 미표기; 원문 확인',note='원문 대학명 유지; 표기가 비슷하다는 이유로 캠퍼스 병합하지 않음') for u,s in sorted(aliases.items())]
    write('university-aliases.csv',aliasrows,list(aliasrows[0]))
    programrows=[dict(slug=k[0],university=k[1],round=k[2],admission_type=k[3],program=k[4],rows_2024=c['2024'],rows_2025=c['2025'],rows_2026=c['2026'],status='연도별 존재' if all(c[str(y)] for y in [2024,2025,2026]) else '연도 공백; 신설·폐지·개명 여부 확인') for k,c in sorted(programs.items())]
    write('program-coverage.csv',programrows,list(programrows[0]))
    variants=[dict(slug=k[0],university=k[1],normalized_unit=k[2],observed_names=' | '.join(sorted({n for _,n in v})),year_name_pairs=' | '.join(f'{y}: {n}' for y,n in sorted(v)),status='띄어쓰기·기호 차이 후보; 공식 개편 이력 없이 통합 금지') for k,v in sorted(units.items()) if len({n for _,n in v})>1]
    write('unit-name-candidates.csv',variants,list(variants[0]) if variants else ['slug','university','observed_names'])
    summary=dict(rows=len(rows),university_labels=len({r['university'] for r in rows}),source_files=len(file_rows),sha256=before,exact_duplicate_excess=sum(n-1 for n in counts.values()),missing_from_master=sum((exp-counts).values()),master_not_in_source_files=sum((counts-exp).values()),excluded_by_policy=[dict(slug=s,reason=e,rows=n) for (s,e),n in excluded.items()],findings=dict(Counter(x['code'] for x in findings)),severities=dict(Counter(x['severity'] for x in findings)),duplicate_candidate_groups=len({r['group'] for r in dup}),duplicate_candidate_rows=len(dup),coverage_cells=len(coverage),empty_coverage_cells=sum(x['rows']==0 for x in coverage),metric_counts=dict(Counter(r['metric'] for r in rows)),source_only_differences=[dict(zip(merge.COLS,k),multiplicity=n) for k,n in (exp-counts).items()][:20],master_only_differences=[dict(zip(merge.COLS,k),multiplicity=n) for k,n in (counts-exp).items()][:20])
    assert hashlib.sha256(master.read_bytes()).hexdigest()==before,'Master changed during audit'
    (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({k:v for k,v in summary.items() if k not in ['source_only_differences','master_only_differences']},ensure_ascii=False,indent=2))

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8'); main()
