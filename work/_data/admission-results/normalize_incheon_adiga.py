"""Official university-provided Adiga supplements, kept separate from admission-office CSVs."""
from normalize_national import *
from bs4 import BeautifulSoup

def htmlgrid(t):
 cells={};origins={};n=0
 for i,tr in enumerate(t.find_all('tr')):
  j=0
  for c in tr.find_all(['td','th'],recursive=False):
   while (i,j) in cells:j+=1
   txt=clean(c.get_text(' ',strip=True));rs=int(c.get('rowspan',1));cs=int(c.get('colspan',1))
   section=tr.parent
   if section.name in ['thead','tbody','tfoot']:
    siblings=section.find_all('tr',recursive=False);rs=min(rs,len(siblings)-siblings.index(tr))
   for a in range(rs):
    for b in range(cs):cells[i+a,j+b]=txt;origins[i+a,j+b]=(i,j)
   j+=cs;n=max(n,j)
 return [[cells.get((i,j),'') for j in range(n)] for i in range(len(t.find_all('tr')))]

def oldtable(key,index):
 s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');return htmlgrid(s.find_all('table')[index])

def iccu():
 out=[]
 for y in [2024,2025]:
  key=f'iccu-theology-adiga-{y}';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  ts=[t for t in s.find_all('table') if '신학과' in t.get_text() and '70%' in compact(t.get_text())]
  assert len(ts)==1
  v=htmlgrid(ts[0])[-1];assert len(v)==9,v
  out.append(row(key,'인천가톨릭대학교(강화)',y,'수시','대건안드레아 전형',v[0],'학생부교과 전형 결과 / 신학과',admission_type='교과',quota=v[1],competition_rate=v[2].replace(':1','').strip(),cut_50=v[7],cut_70=v[8],cut_other=pairs(['충원합격순위','환산점수50%','환산점수70%','학생부총점'],v[3:7]),metric='교과등급',grade_system='9',basis='최종등록자',note='draft; 입학처 미수록 강화 신학대학을 대학 제공 어디가 자료로 보충; 안내학년도보다 1년 앞선 결과학년도 확인'))
 key='iccu-theology-adiga-2026-30';v=oldtable(key,0)[3];assert len(v)==12
 out.append(row(key,'인천가톨릭대학교(강화)',2026,'수시','대건안드레아 전형',v[1],'학생부교과(대건안드레아) / 신학과',admission_type='교과',quota=v[4],competition_rate=v[5],fill_count=v[6],cut_50=v[9],cut_70=v[10],cut_other=pairs(['최초모집','이월','환산점수50%','환산점수70%','학생부총점'],[v[2],v[3],v[7],v[8],v[11]]),metric='교과등급',grade_system='9',basis='최종등록자',note='draft; 입학처 미수록 강화 신학대학을 대학 제공 어디가 자료로 보충; 2027 안내 내 2026 결과; 충원인원은 해당 표 머리말 그대로'))
 save('iccu-adiga',out)

def inha():
 out=[]
 # Missing 2024 regular results: source supplies the average percentile at 70% only.
 key='inha-adiga-2024';g=oldtable(key,36)
 for i,v in enumerate(g):
  if len(v)!=8 or not num(v[2]):continue
  out.append(row(key,'인하대',2024,'정시',v[0]+' 수능(일반)',compact(v[1]),f'수능위주 전형 결과 표37 행{i+1}',admission_type='수능',quota=v[2],competition_rate=v[3],cut_70=v[7] if num(v[7]) else '',cut_other=pairs(['충원합격순위','대학별환산70%','수능총점'],v[4:7]),metric='백분위',basis='최종등록자 70% 해당자 평균백분위',note='draft; 입학처 미공개 정시 수능 결과를 대학 제공 어디가로 보충'))
 key='inha-adiga-2025'
 for ix,pg in [(13,'학생부종합(농어촌학생)'),(14,'학생부종합(고른기회)')]:
  g=oldtable(key,ix)
  for i,v in enumerate(g):
   if not num(v[1]) or '모집단위' in v[0]:continue
   sup=next((x for x in v[2:] if '이하' in x),'')
   out.append(row(key,'인하대',2025,'수시',pg,compact(v[0]),f'학생부종합 전형 결과 표{ix+1} 행{i+1}',admission_type='종합',quota=v[1],competition_rate=v[2] if num(v[2]) else '',cut_50=v[4] if num(v[4]) else '',cut_70=v[5] if num(v[5]) else '',cut_other='충원합격순위 '+v[3] if num(v[3]) else '',metric='교과등급',grade_system='9',basis='최종등록자; 계열별 반영교과 이수단위 적용',note='draft; 입학처 미수록 종합전형을 대학 제공 어디가로 보충; '+sup))
 g=oldtable(key,36)
 for i,v in enumerate(g):
  if len(v)!=25 or not num(v[4]):continue
  out.append(row(key,'인하대',2025,'정시',v[0]+' 수능(일반)',compact(v[1]),f'수능위주 전형 결과 표37 행{i+1}',admission_type='수능',quota=v[4],competition_rate=v[5],cut_50=v[7] if num(v[7]) else '',cut_70=v[8] if num(v[8]) else '',cut_other=pairs(['최초모집','이월','충원합격순위','수능총점']+['50% '+x for x in ['국어','수학','탐구1','탐구2','영어등급','한국사등급']]+['70% '+x for x in ['국어','수학','탐구1','탐구2','영어등급','한국사등급']]+['수학 확통비율','수학 미적분비율','수학 기하비율'],v[2:4]+v[6:7]+v[9:]),metric='환산점수',basis='최종등록자 대학별 환산점수; 과목별 백분위는 별도',note='draft; 입학처 미공개 정시 수능 결과를 대학 제공 어디가로 보충; 평균백분위 임의 계산 안 함'))
 for suffix in ['20','40']:
  key='inha-adiga-2026-'+suffix;s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for ti,t in enumerate(s.find_all('table')):
   pg=t.find_previous(['h3','h4','h5','strong','p']).get_text(' ',strip=True)
   # Already published general/regular and the two future-talent routes are retained in inha.csv.
   if '인하미래인재' in pg or pg=='수능(일반)':continue
   g=htmlgrid(t);labels=[' / '.join(dict.fromkeys(v[j] for v in g[:3] if v[j])) for j in range(len(g[0]))]
   for i,v in enumerate(g[3:],4):
    if not num(v[4]):continue
    sup=next((x for x in v if '미제출 사유' in x),'');reg=suffix=='40'
    c50,c70=(v[17],v[28]) if reg else (v[9],v[10])
    c50=c50 if num(c50) and float(c50)>0 else '';c70=c70 if num(c70) and float(c70)>0 else ''
    out.append(row(key,'인하대',2026,'정시' if reg else '수시',(v[0]+' ' if reg else '')+pg,compact(v[1]),f'{pg} 표{ti+1} 행{i}',admission_type='수능' if reg else '종합',quota=v[4],competition_rate=v[5],fill_count=v[6],cut_50=c50,cut_70=c70,cut_other=pairs(labels[7:],v[7:]) if not sup else '',metric='백분위' if reg else '교과등급',grade_system='' if reg else '9',basis='최종등록자',note='draft; 입학처 미수록 전형을 대학 제공 어디가로 보충; 원문 충원인원 표기; 미사용 영역 0은 원문 보존; '+sup))
 assert out
 save('inha-adiga',out)

def jiu():
 out=[]
 key='jiu-adiga-2024'
 for ix,pg in [(8,'일반학생'),(9,'기회균형')]:
  for i,v in enumerate(oldtable(key,ix)):
   if not num(v[1]):continue
   # Existing official 2024 general-grade cuts take precedence.
   if pg=='일반학생' and compact(v[0])!='체육학부(야)':continue
   out.append(row(key,'제주국제대학교',2024,'수시',pg,compact(v[0]),f'학생부교과 결과 표{ix+1} 행{i+1}',admission_type='교과',quota=v[1],competition_rate=val(v[2]),cut_50=v[7] if num(v[7]) else '',cut_70=v[8] if num(v[8]) else '',cut_other=pairs(['충원합격순위','환산50%','환산70%','학생부총점'],v[3:7]),metric='교과등급',grade_system='9',basis='최종등록자',note='draft; 입학처 행 보완 또는 미수록 전형; 원문 -는 미공개'))
 for i,v in enumerate(oldtable(key,15)):
  if not num(v[2]):continue
  out.append(row(key,'제주국제대학교',2024,'정시',v[0]+' 일반학생',compact(v[1]),f'수능위주 결과 표16 행{i+1}',admission_type='수능',quota=v[2],competition_rate=val(v[3]),cut_70=v[7] if num(v[7]) else '',cut_other=pairs(['충원합격순위','환산70%','수능총점'],v[4:7]),metric='백분위',basis='최종등록자 70% 해당자 평균백분위',note='draft; 입학처 미수록 결과 보충; 원문 -는 미공개'))
 key='jiu-adiga-2025';v=oldtable(key,7)[-1]
 out.append(row(key,'제주국제대학교',2025,'수시','일반학생',v[0],'학생부교과 결과 표8',admission_type='교과',quota=v[1],competition_rate=v[2],cut_50=v[7],cut_70=v[8],cut_other=pairs(['충원합격순위','환산50%','환산70%','학생부총점'],v[3:7]),metric='교과등급',grade_system='9',basis='최종등록자',note='draft; 입학처 미수록 결과 보충'))
 v=oldtable(key,8)[-1]
 out.append(row(key,'제주국제대학교',2025,'수시','일반학생','선발인원 3명 이하 모집단위 합산','학생부교과 소수인원 전형별 공개 표9',admission_type='교과',quota=v[1],competition_rate=v[2],cut_50=v[4],cut_70=v[5],cut_other='충원합격인원 원문 '+v[3],metric='교과등급',grade_system='9',basis='최종등록자; 모든 교과목',note='draft; 입학처 미수록 결과 보충; 학과를 특정하거나 학과별로 복제하지 않음'))
 g=oldtable(key,13);labs=[' / '.join(dict.fromkeys(v[j] for v in g[:4] if v[j])) for j in range(len(g[0]))]
 for i,v in enumerate(g[4:],5):
  out.append(row(key,'제주국제대학교',2025,'정시',v[0]+' 일반학생',compact(v[1]),f'수능위주 결과 표14 행{i}',admission_type='수능',quota=v[4],competition_rate=v[5],cut_other=pairs(labs[6:],v[6:]),metric='환산점수',basis='최종등록자',note='draft; 입학처 미수록 결과 보충; 총점과 괄호 안 수능점수를 함께 표기한 원문 보존; 351.40 (0) 등을 단일 컷으로 변환하지 않음'))
 # 2026 public rows explicitly say results do not exist. Keep the evidence separately,
 # not as dozens of zero-score admission records.
 absent=[]
 for suffix in ['30','40']:
  key='jiu-adiga-2026-'+suffix;s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for t in s.find_all('table'):
   pg=t.find_previous(['h3','h4','h5','strong','p']).get_text(' ',strip=True)
   for v in htmlgrid(t)[3:]:
    assert not (num(v[9]) and float(v[9])>0),v
    absent.append({'result_year':2026,'program':pg,'round':v[0],'unit':v[1],'quota_as_published':v[4],'reason':next((x for x in v if '미제출 사유' in x),'수치 미기재'),'source_url':json.loads((CACHE/(key+'.meta.json')).read_text())['url']})
 (CACHE/'jiu-2026-unavailable.json').write_text(json.dumps(absent,ensure_ascii=False,indent=2),encoding='utf8')
 save('jiu-adiga',out)

def chungwoon():
 out=[];existing=list(csv.DictReader((ROOT/'chungwoon-incheon.csv').open(encoding='utf-8-sig')));units={compact(x['recruit_unit']) for x in existing}
 for y in [2024,2025]:
  key=f'chungwoon-adiga-{y}'
  for ix,pg in ([(9,'일반전형'),(10,'청운인재전형')] if y==2024 else [(7,'일반전형'),(8,'청운인재전형')]):
   for i,v in enumerate(oldtable(key,ix)):
    if compact(v[0]) not in units or not num(v[1]):continue
    c50,c70=(v[7],v[8]) if y==2024 else (v[4],v[5]);other=pairs(['충원합격순위','환산50%','환산70%','학생부총점'],v[3:7]) if y==2024 else '충원합격순위 '+v[3]
    out.append(row(key,'청운대학교(인천)',y,'수시',pg,compact(v[0]),f'교과 결과 표{ix+1} 행{i+1}',admission_type='교과',quota=v[1],competition_rate=v[2],cut_50=c50 if num(c50) else '',cut_70=c70 if num(c70) else '',cut_other=other,metric='교과등급',grade_system='9',basis='최종등록자',note='draft; 입학처 행 보완(50%·70%컷); 인천 모집단위는 입학처 캠퍼스 표와 대조'))
  g=oldtable(key,16);nh=2 if y==2024 else 3;labs=[' / '.join(dict.fromkeys(v[j] for v in g[:nh] if v[j])) for j in range(len(g[0]))]
  for i,v in enumerate(g[nh:],nh+1):
   if compact(v[1]) not in units:continue
   q,co=(v[2],v[3]) if y==2024 else (v[4],v[5]);c50='' if y==2024 else v[7];c70=v[7] if y==2024 else v[8]
   out.append(row(key,'청운대학교(인천)',y,'정시',v[0]+' 일반전형',compact(v[1]),f'수능 결과 표17 행{i}',admission_type='수능',quota=q,competition_rate=co,cut_50=c50 if num(c50) else '',cut_70=c70 if num(c70) else '',cut_other=pairs(labs[4 if y==2024 else 6:],v[4 if y==2024 else 6:]),metric='백분위' if y==2024 else '환산점수',basis='최종등록자',note='draft; 입학처 행 보완(50%·70%컷); 인천 모집단위는 입학처 캠퍼스 표와 대조; 2025 필수·선택 백분위는 영역 임의 지정 안 함'))
 for suffix in ['20','30','40']:
  key='chungwoon-adiga-2026-'+suffix;s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for ti,t in enumerate(s.find_all('table'),1):
   pg=t.find_previous(['h3','h4','h5','strong','p']).get_text(' ',strip=True);g=htmlgrid(t);labs=[' / '.join(dict.fromkeys(v[j] for v in g[:3] if v[j])) for j in range(len(g[0]))]
   for i,v in enumerate(g[3:],4):
    if compact(v[1]) not in units or not num(v[4]) or float(v[4])<=0:continue
    reg=suffix=='40';c50,c70=(v[17],v[28]) if reg else (v[9],v[10]);sup=next((x for x in v if '미제출 사유' in x),'')
    out.append(row(key,'청운대학교(인천)',2026,'정시' if reg else '수시',pg,compact(v[1]),f'{pg} 표{ti} 행{i}',admission_type='수능' if reg else '종합' if suffix=='20' else '교과',quota=v[4],competition_rate=v[5],fill_count=v[6],cut_50=c50 if num(c50) and float(c50)>0 else '',cut_70=c70 if num(c70) and float(c70)>0 else '',cut_other=pairs(labs[7:],v[7:]) if not sup else '',metric='백분위' if reg else '교과등급',grade_system='' if reg else '9',basis='최종등록자',note='draft; 입학처 행 보완 또는 입학처 미수록 전형; 인천 모집단위는 입학처 캠퍼스 표와 대조; 원문 충원인원 표기; 미사용 영역 0 원문 보존; '+sup))
 save('chungwoon-incheon-adiga',out)

if __name__=='__main__':
 for arg in sys.argv[1:]:globals()[arg]()
