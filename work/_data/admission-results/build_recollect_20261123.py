"""Build reviewed, source-specific additions for the targeted 2024–2026 gaps."""
from pathlib import Path
from collections import Counter, defaultdict
import csv, json, re, sys, hashlib, fitz, olefile, struct, zlib
from bs4 import BeautifulSoup
import normalize_national as national
import normalize_daegu_adiga as adiga
import merge

ROOT=Path(__file__).resolve().parent
CACHE=ROOT/'recollect-20261123'
FIELDS=merge.COLS
national.CACHE=CACHE
adiga.CACHE=CACHE
REVIEW=[]
QUARANTINE=[]
def read(path):
    return list(csv.DictReader(path.open(encoding='utf-8-sig',newline=''))) if path.exists() else []
def write(path,rows):
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,FIELDS);w.writeheader();w.writerows(rows)
def token(x):return re.sub(r'[^가-힣A-Za-z0-9]','',x)

def jnue():
    out=[]
    for key,rd in [('jnue-post14302-file0','수시'),('jnue-post14303-file0','정시')]:
        doc=fitz.open(CACHE/(key+'.pdf'))
        tables=[[t.extract() for t in page.find_tables().tables] for page in doc]
        (CACHE/(key+'-tables.json')).write_text(json.dumps(tables,ensure_ascii=False,indent=2),encoding='utf8')
        counts=tables[0][0][2:];cuts=tables[0][1][2 if rd=='수시' else 1:]
        cutmap={token(v[2] if rd=='수시' else v[0]):v for v in cuts}
        for i,v in enumerate(counts,3):
            pg=adiga.clean(v[1] if rd=='수시' else v[0])
            if not pg or any('합계' in adiga.clean(x) for x in v[:2]):continue
            offset=1 if rd=='수시' else 0
            q,ap,reg,co=v[1+offset],v[4+offset],v[10+offset],v[11+offset]
            raw=[f'입학자 현황 원문 행: {json.dumps(v,ensure_ascii=False)}']
            cut=cutmap.get(token(pg))
            if cut:
                raw.append(('1단계·최종입학자 교과등급 80%컷 및 예비후보순위' if rd=='수시' else '최종입학자 수능 환산점수 80%컷 및 예비후보순위')+': '+json.dumps(cut,ensure_ascii=False))
                if rd=='수시':raw.append(f'예비후보순위 {cut[3]}; 1단계 합격자 교과등급80%컷 {cut[4]}; 최종입학자 교과등급80%컷 {cut[5]}')
                else:raw.append(f'예비후보순위 {cut[1]}; 최종입학자 수능환산점수80%컷 {cut[2]}')
            more=tables[1] if rd=='수시' else tables[0][2:]
            for ti,table in enumerate(more):
                for vv in table[1:]:
                    if token(vv[0])==token(pg) or (pg=='농어촌학생' and token(vv[0])=='농어촌전형'):
                        raw.append(('서류평가(600점)' if ti==0 else '면접평가(400점)') if rd=='수시' else ('수능(900점)' if ti==0 else '면접(100점)'))
                        raw.append(json.dumps(dict(headers=table[0],values=vv),ensure_ascii=False))
            r=national.row(key,'전주교육대학교',2025,rd,pg,'초등교육과',f'PDF p.1 입학자현황 행{i}; 전형별 80%컷; '+('p.2' if rd=='수시' else 'p.1')+' 전형요소별 성적',admission_type='종합' if rd=='수시' else '수능',quota=adiga.number(q),applicants=adiga.number(ap),competition_rate=adiga.number(adiga.clean(co).replace(':1','')),cut_other='; '.join(raw),metric='교과등급' if rd=='수시' else '환산점수',grade_system='9' if rd=='수시' else '',basis='최종입학자; 80%컷은 원문 지표로 보존',note='draft; 2026-11-23 재수집; 80%컷은 cut_70으로 변환하지 않음; 예비후보번호는 충원인원 아님; 비공개·-는 원문 유지; 남녀별 통계와 구간 분포 원문 보존; 합계 행 미수록')
            out.append(r)
        if rd=='정시':REVIEW.append(dict(issue='전주교대 2025 정시 원문의 최종입학자 합계 및 성적분포 합계가 세부행 합과 불일치; 원문 세부행 유지, 합계 미수록',source=key))
    key='jnue-post15641-file0'
    ole=olefile.OleFileIO(CACHE/(key+'.ole'));preview=ole.openstream('PrvText').read().decode('utf-16le')
    paras=[]
    compressed=bool(struct.unpack_from('<I',ole.openstream('FileHeader').read(),36)[0]&1)
    for path in ole.listdir():
        if path[0]!='BodyText':continue
        buf=ole.openstream(path).read();buf=zlib.decompress(buf,-15) if compressed else buf;pos=0
        while pos+4<=len(buf):
            h=struct.unpack_from('<I',buf,pos)[0];pos+=4;tag=h&1023;size=h>>20
            if size==4095:size=struct.unpack_from('<I',buf,pos)[0];pos+=4
            data=buf[pos:pos+size];pos+=size
            if tag==67:paras.append(re.sub(r'[\x00-\x1f]','',data.decode('utf-16le',errors='replace')))
    (CACHE/(key+'-paragraphs.json')).write_text(json.dumps(paras,ensure_ascii=False,indent=2),encoding='utf8')
    (CACHE/(key+'-preview.txt')).write_text(preview,encoding='utf8')
    assert any('2026학년도 신입생 정시모집 입학전형 결과' in x for x in paras)
    assert all(x in paras for x in ['626','566','633.79','581.66'])
    first=preview.split('2. 전형별')[0]
    groups=[re.findall(r'<([^<>]*)>',line) for line in first.splitlines()]
    groups=[v for v in groups if len(v)==12 and v[0] in ['일반학생','농어촌학생','기회균형선발','장애인등 대상자']]
    assert len(groups)==4
    for v in groups:
        pg=v[0];extra={'일반학생':'수능 환산점수 80%컷 626; 수능 평균 633.79 (800점만점); 예비후보 21','농어촌학생':'수능 환산점수 80%컷 566; 수능 평균 581.66 (800점만점); 예비후보 0','기회균형선발':'성적 3명이하 미공개; 예비후보 0','장애인등 대상자':'지원인원 0; 등록인원·경쟁률 원문 -'}[pg]
        r=national.row(key,'전주교육대학교',2026,'정시',pg,'초등교육과','HWP 입학자현황; 전형별 수능 환산점수 현황; 본문 단락과 미리보기 교차대조',admission_type='수능',quota=adiga.number(v[1]),applicants=adiga.number(v[4]),competition_rate=adiga.number(v[11]),cut_other='입학자현황 원문: '+json.dumps(v,ensure_ascii=False)+'; '+extra,metric='환산점수',basis='최종입학자; 80%컷',note='draft; 2026-11-23 재수집; HWP 본문·미리보기 대조; 80%컷은 cut_70으로 변환하지 않음; 예비후보는 충원인원 아님; 합계 미수록')
        out.append(r)
    return out

def sehan():
    # 2026 official guide p.5 explicitly labels these departments as Yeongam.
    units={'기술교육과','특수교육과','유아교육과','글로벌복지한국어학과','간호학과','물리치료학과','스포츠융합복지학부'}
    data=json.loads((CACHE/'sehan-2026-results.json').read_text(encoding='utf8'))['rows']
    meta=json.loads((CACHE/'sehan-2026-results.meta.json').read_text(encoding='utf8'))
    out=[]
    for i,v in enumerate(data,1):
        if v['SELT_DPTMJ_NM'] not in units or v['COLL_DIV_CD'] not in ['21','31','32']:continue
        rd='수시' if v['COLL_DIV_CD']=='21' else '정시';pg=v['SELT_TYPE_NM'];reg=rd=='정시'
        raw=[]
        labels={'SCGD_AVG_GRD_NUM':'최초합격자 학생부평균등급','FL_SCGD_AVG_GRD_NUM':'최종등록자 학생부평균등급','FL_SCGD_80_GRD_NUM':'최종등록자 학생부80%컷','FL_SCGD_100_GRD_NUM':'최종등록자 학생부100%컷','SABTY_AVG_SCOR':'최초합격자 수능평균등급','FL_SABTY_AVG_SCOR':'최종등록자 수능평균등급','FL_SABTY_80_SCOR':'최종등록자 수능80%컷','FL_SABTY_100_SCOR':'최종등록자 수능100%컷','RIFC_PREPA_RNK':'충원합격 예비순위'}
        for k,label in labels.items():
            if v.get(k) not in ['',None]:raw.append(label+' '+str(v[k]))
        raw.append('모집구분 '+v['COLL_DIV_CD']+'; 원문 전체 '+json.dumps(v,ensure_ascii=False))
        r=dict.fromkeys(FIELDS,'');r.update(university='세한대학교(영암)',result_year='2026',round=rd,admission_type='실기' if '실기' in pg else '수능' if reg else '교과',program=('가군 ' if v['COLL_DIV_CD']=='31' else '나군 ' if v['COLL_DIV_CD']=='32' else '')+pg,recruit_unit=v['SELT_DPTMJ_NM'],quota=str(v['COLL_NUMP']),applicants=str(v['APLY_NUMP']),competition_rate=str(v['COMP_RATE']),cut_other='; '.join(raw),metric='수능등급' if reg else '교과등급',grade_system='' if reg else '9',basis='공식 공개 입시결과; 최초합격자·최종등록자 구분; 수시80%·정시100%컷 원문 보존',source_url=meta['source_page'],source_page=f'2026학년도 전년도 입시 결과 조회 / JSON 행{i}; SADASEAM02.xml 열 정의',note='draft; 2026-11-23 재수집; 2026 모집요강 p.5 영암 캠퍼스 구분 확인; 80%·100%컷을 50%·70%로 변환하지 않음; 원문 0·공란 보존; 충원예비순위는 인원 아님; 캠퍼스별 공통합계 복제 안 함')
        if pg.startswith('기타('):r['admission_type']='기타'
        out.append(r)
    return out

def chodang():
    # All 20 data rows visually transcribed from the official 2026 image.
    # Columns: unit, quota, competition, first-admit mean, registered mean, 70%, minimum.
    data=[
      ('일반학생전형','간호학과','100','4.48','3.30','4.92','5.17','8.00'),
      ('일반학생전형','치위생학과','25','2.68','5.59','5.60','6.42','6.58'),
      ('일반학생전형','항공운항학과','25','5.56','2.34','3.08','3.58','3.92'),
      ('일반학생전형','항공관광서비스학과','20','1.25','5.27','5.35','5.42','5.92'),
      ('일반학생전형','항공학부','50','1.76','4.96','4.85','5.08','7.42'),
      ('일반학생전형','스포츠과학부','40','1.48','5.89','5.90','6.38','7.58'),
      ('일반학생전형','웰니스라이프학부','75','1.88','5.37','5.61','6.00','7.58'),
      ('일반학생전형','호텔조리관광학부','50','2.92','5.40','5.78','7.00','8.08'),
      ('일반학생전형','국방소방안전학부','50','1.24','5.63','5.97','6.58','7.75'),
      ('일반학생전형','UCC자율전공학부','32','1.00','5.72','5.52','6.50','7.50'),
      ('지역인재전형','간호학과','50','3.24','3.62','5.22','5.75','7.17'),
      ('지역인재전형','항공운항학과','5','2.80','4.62','4.84','','5.67'),
      ('지역인재전형','항공학부','20','1.45','5.40','5.49','','7.42'),
      ('일반고전형','간호학과','70','1.39','4.79','5.32','5.42','7.50'),
      ('일반고전형','항공운항학과','20','4.45','2.80','3.42','3.83','4.00'),
      ('만학도전형','미래평생교육학부','80','1.44','5.23','5.27','6.42','8.67'),
      ('농어촌학생전형','간호학과','11','1.18','5.15','4.25','','4.42'),
      ('농어촌학생전형','항공운항학과','6','1.33','4.77','5.50','','6.00'),
      ('기초생활차상위전형','간호학과','16','1.69','5.08','5.49','','5.83'),
      ('기초생활차상위전형','항공운항학과','4','1.50','4.29','6.17','','6.83'),
    ]
    key='chodang-board-link132';meta=json.loads((CACHE/f'{key}.meta.json').read_text(encoding='utf8'))
    assert meta['sha256']==hashlib.sha256((ROOT/'national-expansion/chodang-file1.jpg').read_bytes()).hexdigest()
    out=[]
    for i,(pg,u,q,co,first,avg,c70,low) in enumerate(data,1):
        r=dict.fromkeys(FIELDS,'');r.update(university='초당대학교',result_year='2026',round='수시',admission_type='교과',program=pg,recruit_unit=u,quota=q,competition_rate=co,cut_70=c70,
            cut_other=f'최초합격 평균 등급 {first}; 최종등록자 평균 등급 {avg}; 최종등록자 70% CUT 등급 {c70 or "-"}; 최종등록자 최저점 등급 {low}',metric='교과등급',basis='최종등록자; 최초합격 평균은 별도 원문 지표',grade_system='9',source_url=meta['url'],source_page=f'2026수시입결.jpg / 표1 데이터행{i}',note='draft; 2026-11-23 재수집; 공식 이미지 전체 20행 시각 전사; 원문 -는 공란; 최초합격·최종등록 평균과 70%컷 구분')
        out.append(r)
    return out

def collect():
    out={'woosuk-jincheon':read(ROOT/'honam-woosuk-jincheon-reference.csv'),'chodang':chodang(),'jnue':jnue(),'sehan-yeongam':sehan()}
    for r in out['woosuk-jincheon']:r['note']+='; 2026-11-23 기존 참조파일 원문 대조 후 통합'
    targets={'ggu':'금강대학교','u1':'유원대학교','chungwoon':'청운대학교(홍성)','jwu':'중원대학교','hsmu':'화성의과학대학교','chodang':'초당대학교'}
    for slug,u in targets.items():
        rows=adiga.newer(slug,u)
        if slug in ['u1','chungwoon','jwu','hsmu']:rows=[r for r in rows if r['round']=='정시']
        if slug=='u1':
            campus=defaultdict(set)
            for existing in read(ROOT/'u1.csv'):
                if existing['result_year']=='2026':campus[token(existing['recruit_unit'])].add(existing['university'])
            kept=[]
            for r in rows:
                matches=campus[token(r['recruit_unit'])]
                if len(matches)!=1:
                    QUARANTINE.append(dict(reason='유원대 2026 캠퍼스 확인 필요; 계약형 문화복지학과를 문화복지융합학부로 임의 대응하지 않음',row=r));continue
                r['university']=next(iter(matches))
                r['note']+='; 2026 입학처 모집단위-캠퍼스 대응표와 대조; 이전 연도 캠퍼스 이동 반영'
                kept.append(r)
            rows=kept
        if slug=='chungwoon':
            hong={token(r['recruit_unit']) for r in read(ROOT/'chungwoon.csv')}
            inch={token(r['recruit_unit']) for r in read(ROOT/'chungwoon-incheon.csv')}
            kept=[]
            for r in rows:
                t=token(r['recruit_unit'])
                if t in hong and t not in inch:kept.append(r)
                elif t not in inch:QUARANTINE.append(dict(reason='청운대 캠퍼스 대응 추가 확인',row=r))
            rows=kept
        out[slug+'-adiga']=rows
    for slug,u in [('jwu','중원대학교'),('hsmu','화성의과학대학교')]:
        for year in [2024,2025]:
            rows=[r for r in adiga.older(slug,u,year) if r['round']=='정시']
            if slug=='jwu':
                rows=[r for r in rows if r['recruit_unit'] not in ['계','합계','총계']]
                for r in rows:
                    if year==2024:
                        r['program']=re.sub(r'\s*\*.*','',r['program']).strip()
                    else:r['program']='가군 수능위주(원문 전형 미구분)'
                    r['note']+='; 표 앞 다른 모집시기 전형명은 사용하지 않음; 2024 구분 열 전형명/2025 전형 미구분 보존'
            out[slug+'-adiga']+=rows
    # Campus assignment from official same-year and adjacent-year source rows.
    campus=defaultdict(set)
    for slug in ['jbu','jbu-geumsan']:
        for r in read(ROOT/(slug+'.csv')):campus[token(r['recruit_unit'])].add((slug,r['university']))
    for year in [2024]:
        for r in adiga.older('jbu','중부대학교',year):
            if r['round']!='정시':continue
            matches=campus[token(r['recruit_unit'])]
            if len(matches)!=1:
                QUARANTINE.append(dict(reason='중부대 캠퍼스·학과 대응 추가 확인',row=r));continue
            slug,u=next(iter(matches));r['university']=u
            r['note']+='; 기존 입학처 모집단위-캠퍼스 대응표와 대조; 캠퍼스 공통 합계 복제 안 함'
            out.setdefault(slug+'-adiga',[]).append(r)
    # 2025 table includes an explicit campus column and cannot use the generic layout.
    key='jbu-adiga-2025';s=BeautifulSoup((CACHE/(key+'.html')).read_bytes(),'html.parser')
    t=s.find_all('table')[28];g=adiga.htmlgrid(t);labs=adiga.labels(g,4)
    assert len(g[0])==26 and token(g[0][1])=='캠퍼스'
    for i,v in enumerate(g[4:],5):
        assert token(v[1]) in ['충청국제','고양창의']
        slug='jbu-geumsan' if token(v[1])=='충청국제' else 'jbu'
        u='중부대학교(금산)' if slug=='jbu-geumsan' else '중부대학교(고양)'
        r=adiga.emit(key,slug,u,2025,'정시',v[0]+' 수능위주(원문 전형 미구분)',v[2],f'HTML 표29 행{i}',labs,v,dict(admission_type='수능',quota=v[5],competition_rate=v[6],cut_50=v[8],cut_70=v[9]),'환산점수','2025 결과 표의 캠퍼스 열로 구분; 충원합격순위는 인원 아님; 기존 2025 지원현황과는 출처별 값 유지, 세부전형 대응 추가 검수')
        out.setdefault(slug+'-adiga',[]).append(r)
    # Official 70% values take precedence where Adiga supplies an additional 50%.
    office=out['chodang']
    for r in out['chodang-adiga']:
        if r['round']!='수시':continue
        pg=adiga.canon(r['program'])
        matches=[o for o in office if token(o['recruit_unit'])==token(r['recruit_unit']) and (adiga.canon(o['program'])==pg or (o['program']=='농어촌학생전형' and '농어촌' in r['program']) or (o['program']=='기초생활차상위전형' and '기초생활' in r['program']))]
        if len(matches)==1:
            o=matches[0]
            if o['cut_70'] and r['cut_70']:
                if float(o['cut_70'])!=float(r['cut_70']):REVIEW.append(dict(issue='입학처와 어디가 70%컷 상이; 입학처 우선, 어디가 값 원문 열 보존',office=o,adiga=dict(r)))
                r['note']+='; 입학처 행 보완(50%컷); 70%는 입학처 우선 사용, 어디가 70% 원문은 cut_other에 보존'
                r['cut_70']=''
            else:r['note']+='; 입학처 행 보완(미공개 50%·70%컷)'
    for slug,rows in out.items():
        for r in rows:
            if '-adiga' in slug:r['note']+='; 2026-11-23 누락 범위 재수집; 대학 제공 어디가 보충'
        write(CACHE/(slug+'-candidate.csv'),rows)
        print(slug,len(rows),dict(Counter((r['result_year'],r['round']) for r in rows)))
    for name,data in [('review',REVIEW),('quarantine',QUARANTINE),('table-audit',adiga.AUDIT),('unavailable',adiga.ABSENT),('parser-review',adiga.REVIEW)]:
        (CACHE/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
    return out

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf8')
    collect()
