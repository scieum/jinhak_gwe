from normalize_gangwon import *

def portal():
 for slug,school in [('songgok','송곡대학교'),('golf','한국골프과학기술대학교'),('sekyung','세경대학교'),('songho','송호대학교')]:
  out=[]
  for y in [2024,2025,2026]:
   keys=[f'portal-{slug}-{y}']+(['portal-songgok-2025-p2'] if slug=='songgok' and y==2025 else [])
   for key in keys:
    soup=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf-8'),'html.parser')
    for i,tr in enumerate(soup.select('table tbody tr'),1):
     v=[clean(td.get_text(' ',strip=True)) for td in tr.select('td')]
     if len(v)!=15:continue
     out.append(row(key,school,y,v[2].replace('정시모집','정시'),v[6]+' / '+v[7],v[3]+(' (야간)' if v[5]=='야간' else ''),f'표 행{i}',quota=v[4],competition_rate=v[10],metric='교과등급' if v[9]=='등급' and not v[8] else '기타',grade_system='9' if v[9]=='등급' else '',basis='대학이 전문대학포털에 제공한 합격자 평균/최저; 최초/최종 구분 미기재',cut_other='; '.join(label+' '+v[j] for j,label in [(11,'합격자 수능 평균'),(12,'합격자 학생부 평균'),(13,'합격자 수능 최저'),(14,'합격자 학생부 최저')] if v[j]),note=f'draft; 원문대학명 {v[1]}; 수능단위 {v[8]}; 학생부단위 {v[9]}; 원문 0 보존(실제 0등급으로 해석 금지); 모집시기별 입학정원은 대학별 PDF의 전형 모집인원과 다를 수 있음; 포털 표시년도와 강릉영동대 2024~2026 원본의 경쟁률/최저값 대조하여 결과년도 확인'))
  save(slug+'-portal',out)

def gw():
 out=[]
 for y in [2024,2025,2026]:
  key=f'gw-{y}'
  for p in tables(key):
   n=p['page'];rnd='수시1차' if n<=3 else ('수시2차' if n==4 else '정시');pg=['일반고전형','특성화고전형','체육특기자전형','일반전형','일반전형'][n-1]
   rr=p['tables'][0]['rows']
   for i in range(2,len(rr),2):
    v=rr[i];av=rr[i+1];parts=[]
    for vv in [v,av]:
     for j,label in [(5,'최초합격 내신등급'),(6,'최초합격 실기고사'),(7,'최초합격 출석점수'),(8,'최초합격 총점'),(9,'최종합격 내신등급'),(10,'최종합격 실기고사'),(11,'최종합격 출석점수'),(12,'최종합격 총점')]:
      if val(vv[j]):parts.append(label+' '+clean(vv[4])+' '+val(vv[j]))
    out.append(row(key,'강원도립대학교',y,rnd,pg,compact(v[0]),f'p.{n} 행{i+1}~{i+2}',admission_type='실기' if n==3 else '교과',quota=val(v[1]),applicants=val(v[2]),competition_rate=val(v[3]),cut_other='; '.join(parts),metric='교과등급',grade_system='9',basis='최초합격자/최종합격자 커트 및 평균',note='draft; 예비후보 최종합격 커트순위 '+val(v[13])+'; 원문 대시와 빈칸은 결측 처리'))
 save('gangwon-state',out)

def sekyung_direct():
 key='sekyung-results';soup=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf-8'),'html.parser');out=[]
 for i,tr in enumerate(soup.select('table tr'),1):
  v=[clean(td.get_text(' ',strip=True)) for td in tr.select('th,td')]
  if len(v)!=12:continue
  for start,rnd in [(3,'수시1차'),(6,'수시2차'),(9,'정시')]:
   out.append(row(key,'세경대학교',2026,rnd,'일반전형(정원내 통합)',v[0],f'표 행{i} 열{start+1}~{start+3}',admission_type='교과',competition_rate=v[start],cut_other='최초합격자 최저 '+v[start+1]+'; 최초합격자 평균 '+v[start+2],metric='교과등급',grade_system='9',basis='최초합격자',note='draft; 학제 '+v[1]+'; 학년별 30%/30%/40%; 면접학과 학생부60%+면접40%; 포털과 상이한 수치는 별도 출처로 보존'))
 save('sekyung',out)

def halla_regular():
 out=list(csv.DictReader((ROOT/'halla.csv').open(encoding='utf-8-sig')));out=[r for r in out if r['round']!='정시']
 for y in [2025,2026]:
  key=f'halla-{y}-regular';rr=tables(key)[0]['tables'][0]['rows'];g=''
  for i,v in enumerate(rr[2 if y==2025 else 3:],3):
   if v[0]:g=clean(v[0]).split(' ')[0]
   if not v[1] or '학' not in v[1]:continue
   for start,pg in ([(2,'수능중심'),(4,'교과중심')] if y==2025 else [(3,'수능중심'),(8,'교과중심')]):
    if val(v[start]) in ['','·']:continue
    out.append(row(key,'한라대학교',y,'정시',g+' '+pg+'전형',compact(v[1]),f'p.1 행{i}',admission_type='수능' if pg=='수능중심' else '교과',quota=val(v[start]),competition_rate=val(v[start+2]) if y==2026 else '',cut_other=('최종등록자 75% ' if y==2025 else '최종등록자 100% ')+val(v[start+1]),metric='환산점수' if pg=='수능중심' else '교과등급',grade_system='9' if pg=='교과중심' else '',basis='최종등록자',note='draft; '+('충원순위 '+val(v[start+3]) if y==2026 else '모집인원과 결과 모두 2025학년도 표 제목 기준')))
 save('halla',out)


def songgok_direct():
 key='songgok-2024-guide';out=[]
 for p in tables(key):
  if p['page'] not in [32,33]:continue
  rr=p['tables'][0]['rows'];unit=rnd=score=group=''
  for i,v in enumerate(rr[1:],2):
   if v[0]:unit=clean(v[0])
   if v[1]:rnd=clean(v[1]).replace('정시모집','정시')
   if v[2]:score=clean(v[2])
   if v[3]:group=clean(v[3])
   off=6 if p['page']==32 else 5
   pg=group+' '+(' '.join(clean(x) for x in v[4:off] if clean(x)))
   out.append(row(key,'송곡대학교',2024,rnd,pg.strip(),unit,f'p.{p["page"]} 행{i}',quota=val(v[off]),applicants=val(v[off+1]),competition_rate=val(v[off+2]),cut_other='합격자 최저 '+val(v[off+3])+'; 합격자 평균 '+val(v[off+4]),metric='교과등급' if '학생부' in score else '기타',basis='합격자(최초/최종 구분 없음)',grade_system='9' if '학생부' in score else '',note='draft; 점수산출기준 '+score+'; 예비번호(추가합격/예비전체) '+val(v[off+5])))
 save('songgok',out)


def halla_adiga():
 out=[]
 for y in [2024,2025]:
  key=f'halla-{y}-adiga';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf-8'),'html.parser')
  for ti,t in enumerate(s.select('table'),1):
   rr=html_grid(t);tx=compact(t.get_text())
   if not ('경쟁률' in tx and '충원합격순위' in tx and ('50%cut' in tx or '70%cut' in tx)):continue
   data=[]
   for ri,v in enumerate(rr):
    o=2 if v and v[0] in ['가군','나군','다군'] else 1
    if len(v)>o+3 and re.fullmatch(r'\d+',v[o].replace(',','')):data.append((ri,v,o))
   if not data:continue
   h=rr[:data[0][0]];regular=data[0][2]==2
   for ri,v,o in data:
    pg=v[0]+' 수능중심전형' if regular else h[0][1];unit=v[o-1]
    complexreg=regular and y==2025
    q=o+2 if complexreg else o;comp=q+1;rank=q+2;start=q+3
    c50=v[start] if not regular or complexreg else '';c70=v[start+1] if not regular or complexreg else v[start]
    if not regular and '대학별환산' in tx:c50=v[o+6];c70=v[o+7]
    labels=[]
    for col in range(start,len(v)):
     labs=[]
     for hd in h:
      if col<len(hd) and hd[col] and hd[col] not in labs:labs.append(hd[col])
     if v[col]:labels.append('/'.join(labs)+' '+v[col])
    out.append(row(key,'한라대학교',y,'정시' if regular else '수시',pg,unit,f'HTML 표{ti} 행{ri+1}',admission_type='수능' if regular else ('종합' if '운곡' in pg else '교과'),quota=v[q],competition_rate=v[comp],cut_50=val(c50),cut_70=val(c70),cut_other='; '.join(labels),metric='환산점수' if regular else '교과등급',grade_system='' if regular else '9',basis='최종등록자',note='draft; 충원합격순위 '+v[rank]+'; 대학 PDF의 75%컷과 다른 지표; 어디가 화면 기준학년도=결과학년도+1'+('; 최초모집 '+v[o]+'; 수시이월 '+v[o+1] if complexreg else '')))
 save('halla-adiga',out)

if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf-8')
 for n in sys.argv[1:]:globals()[n]()
