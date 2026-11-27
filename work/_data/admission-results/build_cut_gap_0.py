"""cut-gap-40 batch 0: 어디가 '대학 제공' 수시 결과표에서 50%·70% 컷만 <slug>-adiga.csv로 뽑는다.
2024·2025 = 상세 화면 안 표(공개표준안 옛 형식), 2026 = 2027 화면 아코디언(POST) 12열 표.
학생부등급 컷이 있으면 그것만, 없으면 환산점수 컷. '-'·0·미제출은 넣지 않는다. 원문 값 그대로.
usage: python build_cut_gap_0.py [slug ...]   (원본: national-expansion/<slug>-adiga-<year>*.html)"""
import csv,json,re,sys
from collections import Counter,defaultdict
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).parent; RAW=ROOT/'national-expansion'
sys.path.insert(0,str(ROOT))
from normalize_incheon_adiga import htmlgrid
COLS='university,result_year,round,admission_type,program,recruit_unit,quota,applicants,competition_rate,fill_count,fill_rate,cut_50,cut_70,cut_other,metric,basis,grade_system,source_url,source_page,note'.split(',')
PAGE='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=%s&searchSyr=%d'
# slug -> (existing csv slugs, [(unvCd, file suffix, fixed label or None=assign by unit)])
UNIS={
 'kangnam':(['kangnam'],[('0000051','','강남대학교')]),
 'kyungdong':(['kyungdong','kyungdong-yangju'],[('0000060','-0000060',None),('0002574','-0002574',None),('0002744','-0002744',None)]),
 'ginue':(['ginue'],[('0000256','','경인교육대학교(경기·인천 공통)')]),
 'gnue':(['gnue'],[('0000251','','공주교육대학교')]),
 'ut':(['ut'],[('0000034','',None)]),
 'kornu':(['kornu'],[('0000081','','나사렛대학교')]),
 'dankook':(['dankook','dankook-cheonan'],[('0000082','-0000082','단국대(죽전)'),('0002726','-0002726','단국대학교(천안)')]),
 'dju':(['dju'],[('0000095','','대전대학교')]),
 'dgau':([],[('0000087','','대구예술대학교')]),
}
C=lambda x:re.sub(r'\s','',x or '')
def num(x):
    x=C(x).replace(',','').replace(':1','')
    return x if re.fullmatch(r'\d+(\.\d+)?',x) else ''
def pos(x): return bool(num(x)) and float(num(x))>0
def cunit(u): return re.sub(r'[\s()\[\]・·ㆍ.,/\-]','',re.sub(r'\[[^\]]*\]','',u or ''))
def ualts(u):
    # 같은 모집단위의 표기 차이만 흡수: 괄호 부연(세부전공·년제), '구) 옛이름', 어디가 '□전' 머리표
    u=u or ''; base=re.sub(r'^□전','',u.strip())
    out={cunit(base),cunit(re.sub(r'\((?!\s*야)[^)]*\)','',re.sub(r'\s*구\).*$','',base)))}
    if '구)' in base: out.add(cunit(base.split('구)')[1]))
    return out-{''}
def cprog(p):
    p=C(p)
    for z in ['학생부종합','학생부교과','실기/실적위주','실기위주','전형','(',')','·','.','-','/','・']: p=p.replace(z,'')
    return p.replace('Ⅰ','1').replace('Ⅱ','2').replace('Ⅲ','3')
def subseq(a,b): it=iter(b); return all(ch in it for ch in a)
def section_type(t):
    for e in t.find_all_previous(string=True,limit=400):
        z=C(e)
        if not z or len(z)>80 or e.find_parent('table'): continue
        for k,v in [('학생부종합','종합'),('학생부교과','교과'),('실기','실기'),('논술','논술'),('수능','수능')]:
            if k in z: return v
    return ''
REPORT=defaultdict(list)

def old_rows(slug,y,suffix):
    key=f'{slug}-adiga-{y}{suffix}'; f=RAW/(key+'.html')
    if not f.exists(): return []
    s=BeautifulSoup(f.read_text(encoding='utf8'),'html.parser'); out=[]
    for ti,t in enumerate(s.find_all('table')):
        if '70%' not in C(t.get_text()): continue
        g=htmlgrid(t)
        h=next((i for i,v in enumerate(g) if not any(k in C(' '.join(v)) for k in ['cut','%','모집인원','경쟁률','모집단위'])),len(g))
        if h==0 or h==len(g): continue
        labs=[C('/'.join(dict.fromkeys(v[j] for v in g[:h] if v[j]))) for j in range(len(g[0]))]
        if any('수능' in l or '백분위' in l for l in labs) or any(re.match(r'(가|나|다)군|정시',C(v[0])) for v in g[h:]):
            REPORT[slug].append(f'{key} 표{ti+1}: 정시(수능) 표 제외'); continue
        head=C(g[0][0]); byprog=head=='전형명'
        if head not in ('모집단위','전형명'):
            REPORT[slug].append(f'{key} 표{ti+1}: 머리말 "{g[0][0]}" 형식 달라 제외'); continue
        grade=[j for j,l in enumerate(labs) if ('50%' in l or '70%' in l) and '등급' in l]
        conv=[j for j,l in enumerate(labs) if ('50%' in l or '70%' in l) and '등급' not in l and '환산' in l]
        sets=[]  # (metric, j50, j70, basis): 학생부등급 먼저, 없는 행은 환산점수
        for cols,metric in [(grade,'교과등급'),(conv,'환산점수')]:
            if not cols: continue
            c50=[j for j in cols if '50%' in labs[j]]; c70=[j for j in cols if '70%' in labs[j]]
            if len(c50)>1 or len(c70)>1:
                REPORT[slug].append(f'{key} 표{ti+1}: {metric} 50/70 열 여러 개라 제외 {labs}'); continue
            j50=c50[0] if c50 else None; j70=c70[0] if c70 else None; jb=j50 if j50 is not None else j70
            sets.append((metric,j50,j70,' '.join(dict.fromkeys(g[i][jb] for i in range(h) if g[i][jb] and '%' not in g[i][jb] and C(g[i][jb])!=C(g[0][1] if not byprog else '')))))
        if not sets:
            REPORT[slug].append(f'{key} 표{ti+1}: 50/70 열 판단 불가 {labs}'); continue
        qc=[j for j,l in enumerate(labs) if '모집인원' in l]; q=next((j for j in qc if '최종' in labs[j]),qc[0] if qc else None)
        co=next((j for j,l in enumerate(labs) if '경쟁률' in l),None)
        fr=next((j for j,l in enumerate(labs) if '충원' in l and '순위' in l),None)
        fc=next((j for j,l in enumerate(labs) if '충원' in l and '순위' not in l),None)
        prog=g[0][1] if not byprog else ''
        typ=section_type(t)
        for ri,v in enumerate(g[h:],h+1):
            unit=v[0]
            if not C(unit) or C(unit) in ('합계','계','소계','총계'): continue
            pick=next(((m,v[j5] if j5 is not None else '',v[j7] if j7 is not None else '',bs) for m,j5,j7,bs in sets
                        if pos(v[j5] if j5 is not None else '') or pos(v[j7] if j7 is not None else '')),None)
            if not pick: continue
            metric,a,b,basis=pick
            p,u=(unit,'전체') if byprog else (prog,unit)
            out.append(dict(result_year=str(y),round='수시',admission_type=typ,program=p,recruit_unit=u,
              quota=num(v[q]) if q is not None else '',competition_rate=num(v[co]) if co is not None else '',
              fill_count=num(v[fc]) if fc is not None else '',
              cut_50=num(a) if pos(a) else '',cut_70=num(b) if pos(b) else '',
              cut_other=('충원합격 순위 '+v[fr]) if fr is not None and num(v[fr]) else '',
              metric=metric,basis=(basis or '최종등록자')+' 50% cut·70% cut',grade_system='9' if metric=='교과등급' else '',
              source_page=f'어디가 {y}학년도 결과공개 / HTML 표{ti+1} 행{ri}',_key=key,_raw_unit=unit,_raw_prog=p))
    return out

def new_rows(slug,suffix):
    out=[]
    for code,typ in [('20','종합'),('30','교과')]:
        key=f'{slug}-adiga-2026{suffix}-{code}'; f=RAW/(key+'.html')
        if not f.exists(): continue
        s=BeautifulSoup(f.read_text(encoding='utf8'),'html.parser')
        for ti,t in enumerate(s.find_all('table'),1):
            cap=t.find_previous(['h3','h4','h5','strong','p']).get_text(' ',strip=True)
            g=htmlgrid(t); assert len(g[0])==12 and C(g[1][7])=='환산점수' and C(g[1][9])=='환산등급' and C(g[2][7])=='50%' and C(g[2][10])=='70%',(key,ti,g[:3])
            for ri,v in enumerate(g[3:],4):
                if not v[0].startswith('수시'): continue
                g50,g70,s50,s70=v[9],v[10],v[7],v[8]
                if pos(g50) or pos(g70): a,b,metric,basis=g50,g70,'교과등급','학생부 환산등급 50%·70%'
                elif pos(s50) or pos(s70): a,b,metric,basis=s50,s70,'환산점수','학생부 환산점수 50%·70% (총점 %s)'%v[11]
                else: continue
                prog=re.sub(r'^학생부(종합|교과)\((.*)\)$',r'\2',cap)
                out.append(dict(result_year='2026',round='수시',admission_type=typ,program=prog,recruit_unit=v[1],
                  quota=num(v[4]),competition_rate=num(v[5]),fill_count=num(v[6]),cut_50=num(a) if pos(a) else '',cut_70=num(b) if pos(b) else '',
                  metric=metric,basis=basis,grade_system='9' if metric=='교과등급' else '',
                  source_page=f'어디가 2027학년도 화면 / {cap} / 전년도 전형결과(입시결과 상세정보 펼침) 표{ti} 행{ri}',_key=key,_raw_unit=v[1],_raw_prog=cap))
    return out

def build(slug):
    csvs,codes=UNIS[slug]
    ex=[r for s in csvs for r in csv.DictReader(open(ROOT/(s+'.csv'),encoding='utf-8-sig')) if r['round']=='수시']
    unit_label=defaultdict(set)
    for r in ex:
        for a in ualts(r['recruit_unit']): unit_label[a].add(r['university'])
    rows=[];seen=set()
    for cd,suf,label in codes:
        for y in (2024,2025):
            for r in old_rows(slug,y,suf): r['_cd']=cd; r['_label']=label; rows.append(r)
        for r in new_rows(slug,suf): r['_cd']=cd; r['_label']=label; rows.append(r)
    out=[]
    for r in rows:
        notes=['draft; 대학 제공 어디가']
        label=r['_label']
        if not label:
            ls=set().union(*[unit_label.get(a,set()) for a in ualts(r['recruit_unit'])])
            if len(ls)==1: label=next(iter(ls)); notes.append('캠퍼스는 기존 입학처 행의 모집단위로 배정')
            else:
                REPORT[slug].append(f"캠퍼스 미확인 제외: {r['result_year']} {r['_raw_prog']} / {r['_raw_unit']} (후보 {sorted(ls)})"); continue
        cand=[e for e in ex if e['university']==label and e['result_year']==r['result_year'] and (ualts(e['recruit_unit'])&ualts(r['recruit_unit']) or r['recruit_unit']=='전체')]
        exact=[e for e in cand if cunit(e['recruit_unit'])==cunit(r['recruit_unit'])]
        if exact: cand=exact
        pa=cprog(r['program'])
        hit=[e for e in cand if cprog(e['program'])==pa] or [e for e in cand if pa.startswith(cprog(e['program'])) or cprog(e['program']).startswith(pa)] or [e for e in cand if subseq(cprog(e['program']),pa)]
        progs={(e['program'],e['admission_type'],e['recruit_unit']) for e in hit}
        if len(progs)==1:
            p,typ,u=next(iter(progs))
            if any(e[c] and e['metric']==r['metric'] for e in hit for c in ('cut_50','cut_70')):
                REPORT[slug].append(f"입학처 컷 있음 제외: {r['result_year']} {p} {u}"); continue
            if p!=r['program'] or u!=r['recruit_unit']: notes.append('어디가 원문: %s / %s'%(r['_raw_prog'],r['_raw_unit']))
            r.update(program=p,admission_type=typ,recruit_unit=u); notes.append('입학처 행 보완')
        else:
            if len(progs)>1: REPORT[slug].append(f"전형 대응 여러 개라 원문명 유지: {r['result_year']} {r['_raw_prog']} / {r['_raw_unit']} -> {sorted(progs)}")
            notes.append('입학처 미수록 전형·모집단위(또는 명칭 대응 불명) — 어디가 원문명')
            r['_unmatched']=True
        if r['metric']=='환산점수': notes.append('학생부등급 컷 없음, 환산점수 원문')
        if r['recruit_unit']=='전체': r['recruit_unit']='전체(전형별 공개)'; notes.append('원문 표가 전형별 합계(모집단위 구분 없음)')
        k=(label,r['result_year'],r['program'],r['recruit_unit'],r['cut_50'],r['cut_70'],r['metric'])
        if k in seen: continue  # 같은 표가 다른 unvCd 화면에 반복
        seen.add(k)
        r.update(university=label,source_url=PAGE%(r['_cd'],int(r['result_year'])+1),note='; '.join(notes))
        out.append(r)
    tmap=defaultdict(set)
    for o in out:
        if not o.get('_unmatched') or o['result_year']=='2026':  # 2026 유형은 아코디언 코드(20 종합/30 교과)에서 옴
            tmap[cprog(re.sub(r'^학생부(종합|교과)\((.*)\)$',r'\2',o['_raw_prog']))].add(o['admission_type'])
    for o in out:
        if o.get('_unmatched'):
            t=tmap.get(cprog(re.sub(r'^학생부(종합|교과)\((.*)\)$',r'\2',o['_raw_prog'])),set())
            if len(t)!=1:  # 같은 대학 입학처 전형명 중 이름이 겹치는 것의 유형(하나일 때만)
                pa=cprog(o['_raw_prog'])
                t={e['admission_type'] for e in ex if e['university']==o['university'] and (lambda q:q and (subseq(q,pa) or subseq(pa,q) or q[:3]==pa[:3]))(cprog(e['program']))}
            o['admission_type']=next(iter(t)) if len(t)==1 else (o['admission_type'] or '기타')
    out.sort(key=lambda o:(o['university'],o['result_year'],o['program'],o['recruit_unit']))
    if out:
        p=ROOT/(slug+'-adiga.csv')
        assert not p.exists() or slug not in ('dgau',), 'dgau-adiga.csv already exists; merge by hand'
        w=csv.DictWriter(open(p,'w',encoding='utf-8-sig',newline=''),COLS); w.writeheader()
        for o in out: w.writerow({c:o.get(c,'') for c in COLS})
    return out

if __name__=='__main__':
    summary={}
    for slug in (sys.argv[1:] or UNIS):
        out=build(slug)
        summary[slug]={'rows':len(out),'by':{f'{u} {y} {m}':n for (u,y,m),n in sorted(Counter((o['university'],o['result_year'],o['metric']) for o in out).items())},
                       'matched':sum('입학처 행 보완' in o['note'] for o in out),'log':REPORT[slug]}
    print(json.dumps(summary,ensure_ascii=False,indent=1))
