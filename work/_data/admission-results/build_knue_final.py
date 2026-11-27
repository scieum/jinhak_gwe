import csv,re,sys
from pathlib import Path
from bs4 import BeautifulSoup
P=Path(sys.argv[1]); X=P/'chungcheong-expansion'
COLS='university,result_year,round,admission_type,program,recruit_unit,quota,applicants,competition_rate,fill_count,fill_rate,cut_50,cut_70,cut_other,metric,basis,grade_system,source_url,source_page,note'.split(',')
PAGE='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=0000031&searchSyr=%d'
def short(u): return re.sub(r'(교육)?과$','',u) if u!='교육학과' else '교육학'
def rows_of(t): return [[c.get_text(' ',strip=True) for c in tr.find_all(['td','th'])] for tr in t.find_all('tr')]
def blank(v): return '' if v in ('-','') else v
out=[]
known={(r['result_year'],r['program'],r['recruit_unit']) for r in csv.DictReader(open(P/'knue.csv',encoding='utf-8-sig'))}
# 2024, 2025: inline tables with 50%/70% cut of 최종등록자
for y,f,idx in [(2024,'knue-final-2024-adiga.html',{10:'학생부종합우수자 일반전형',11:'농어촌학생'}),(2025,'knue-final-2025-adiga.html',{14:'학생부종합우수자 일반전형',15:'농어촌학생'})]:
    ts=BeautifulSoup((X/f).read_text(encoding='utf-8'),'html.parser').find_all('table')
    for i,prog in idx.items():
        rs=rows_of(ts[i]); hdr=' '.join(' '.join(r) for r in rs[:3])
        assert '최종등록자' in hdr and '50% cut' in hdr, (y,i)
        for r in rs[3:]:
            unit,q,comp,fill,c50,c70=r[:6]
            out.append(dict(university='한국교원대학교',result_year=y,round='수시',admission_type='종합',program=prog,recruit_unit=short(unit),quota=q,competition_rate=comp,
              cut_50=c50,cut_70=c70,cut_other=('충원합격 순위 '+fill) if blank(fill) else '',metric='교과등급',basis='최종등록자 교과성적 학생부등급 50% cut·70% cut',grade_system=9,
              source_url=PAGE%(y+1),source_page='어디가 %d학년도 결과공개 / %s / 표 %d'%(y,prog,i),note='draft; 대학 제공 어디가; 어디가 원문 모집단위: %s; 입학처 행 보완'%unit))
# 2026: accordion tables (POST), 환산등급 50%/70%
for f,label in [('knue-final-2026-adiga-jonghap.html','학생부종합'),('knue-final-2026-adiga-gyogwa.html','학생부교과')]:
    s=BeautifulSoup((X/f).read_text(encoding='utf-8'),'html.parser')
    for t in s.find_all('table'):
        cap=t.find_previous(string=re.compile(r'^\s*학생부(종합|교과)\(')).strip()
        prog={'학생부종합(학생부종합우수자 일반전형)':'학생부종합우수자 일반전형','학생부종합(농어촌학생 특별전형)':'농어촌학생'}.get(cap)
        for r in rows_of(t)[3:]:
            if len(r)<12: continue  # 미제출 사유: 모집인원 3명 이하
            assert prog, cap
            _,unit,qa,qb,q,comp,fill,s50,s70,g50,g70,tot=r
            assert s50==s70==tot=='0.0' and qb=='0'
            out.append(dict(university='한국교원대학교',result_year=2026,round='수시',admission_type='종합',program=prog,recruit_unit=short(unit),quota=q,competition_rate=comp,fill_count=fill,
              cut_50=g50,cut_70=g70,metric='교과등급',basis='학생부 환산등급 50%·70%',grade_system=9,source_url=PAGE%2027,
              source_page='어디가 2027학년도 화면 / %s / 전년도 전형결과(입시결과 상세정보 펼침)'%cap,
              note='draft; 대학 제공 어디가; 어디가 원문 모집단위: %s; 표에 최종등록자 문구 없음(공개표준안 표 형식). 환산점수·총점 칸 0.0은 미사용 표기로 보고 넣지 않음; 입학처 행 보완'%unit))
# 입학처 PDF: 일반전형 최종 등록자 교과 평균·최고·최저 (knue.csv 추출값을 PDF 텍스트와 대조)
txt={2024:'knue-scan06-24.txt',2025:'knue-scan05-70.txt',2026:'knue-auto2.txt'}
for r in csv.DictReader(open(P/'knue.csv',encoding='utf-8-sig')):
    if r['round']!='수시' or r['program']!='학생부종합우수자 일반전형': continue
    m={k:re.search(r'최종 등록자 / 학생부 교과\(등급\) / %s ([\d.]+)'%k,r['cut_other']) for k in ('평균','최고','최저')}
    v={k:x.group(1) for k,x in m.items()}
    pdf=(X/txt[int(r['result_year'])]).read_text(encoding='utf-8')
    line=next(l for l in pdf.splitlines() if l.split()[:1]==[r['recruit_unit']])
    assert ' '.join([v['평균'],v['최고'],v['최저']]) in ' '.join(line.split()), (r['result_year'],r['recruit_unit'],line)
    out.append(dict(university=r['university'],result_year=r['result_year'],round='수시',admission_type='종합',program=r['program'],recruit_unit=r['recruit_unit'],quota=r['quota'],applicants=r['applicants'],competition_rate=r['competition_rate'],
      cut_other='평균 %s / 최고 %s / 최저 %s'%(v['평균'],v['최고'],v['최저']),metric='교과등급',basis='최종 등록자 학생부 교과(등급) 평균·최고·최저',grade_system=9,source_url=r['source_url'],source_page=r['source_page'],
      note='draft; 입학처 원문; knue.csv cut_other의 최종 등록자 값만 분리; 50%·70% 컷은 원문에 없음'))
for o in out:
    o['result_year']=str(o['result_year'])
    assert (str(o['result_year']),o['program'],o['recruit_unit']) in known, o
w=csv.DictWriter(open(P/'knue-final.csv','w',encoding='utf-8-sig',newline=''),COLS); w.writeheader()
out.sort(key=lambda o:(int(o['result_year']),o['program'],o['recruit_unit'],o['basis']))
for o in out: w.writerow({c:o.get(c,'') for c in COLS})
from collections import Counter
for k,n in sorted(Counter((o['result_year'],o['program'],o['basis']) for o in out).items()): print(k,n)
print('total',len(out))
