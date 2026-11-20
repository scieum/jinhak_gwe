from normalize_chungcheong import *

def u1():
 out=[]
 for i,line in enumerate((CACHE/'u1-verified-transcription.txt').read_text(encoding='utf8').splitlines(),1):
  if not line or line.startswith('#'):continue
  if line.startswith('@'):y,rd,key,pct,basis=line[1:].split('|');continue
  if line.startswith('>'):pg,campus,full=line[1:].split('|');continue
  unit,*v=line.split();q='';cut=''
  if rd=='수시':
   assert len(v)==4
   extra=pairs(['전형점수 평균','등급 평균','전형점수 '+pct+'%컷','등급 '+pct+'%컷'],v);cut=val(v[3]) if pct=='70' else '';metric='교과등급'
  else:
   if y=='2025':q=val(v.pop(0))
   assert len(v)==2
   extra=pairs(['전형점수 평균','전형점수 '+pct+'%컷'],v);cut=val(v[1]);metric='환산점수'
  out.append(row(key,'유원대학교('+campus+')',y,rd,pg,unit,f'이미지 전사 원장 행{i}',admission_type='종합' if '종합' in pg else ('수능' if rd=='정시' else '교과'),quota=q,cut_70=cut,cut_other=extra+'; 만점 '+full,metric=metric,basis=basis,grade_system='9' if rd=='수시' else '',note='draft; 공식 이미지 시각 대조 전사; 평균/70%/90% 구분; 원문 대시 보존; 당시 캠퍼스·학과명 사용; 2024 원문 평균과 컷의 순서 및 점수/등급 불일치도 임의 수정하지 않음'))
 save('u1',out)

def koreatech_reg():
 rs=list(csv.DictReader((ROOT/'koreatech.csv').open(encoding='utf-8-sig')));rs=[r for r in rs if r['round']!='정시']
 data=[
 (2024,'koreatech-scan06-39','가군','공학계열 통합모집','90','5','357','3.97','79.5','77.6','76.9'),
 (2024,'koreatech-scan06-39','다군','산업경영학부','18','3','116','6.44','77.6','75.3','73.3'),
 (2024,'koreatech-scan06-39','가군','고용서비스정책학과','11','1','58','5.27','77.9','77.1','76.7'),
 (2025,'koreatech-scan06-37','가군','공학계열 무전공모집','124','4','415','3.35','77.5','75.7','74.3'),
 (2025,'koreatech-scan06-37','나군','산업경영학부·고용서비스정책학과 무전공모집','30','','141','4.70','77.8','76.4','76.0'),
 (2026,'koreatech-auto7','가군','공학융합계열','52','2','354','','84.6','83.1','82.8'),
 (2026,'koreatech-auto7','나군','ICT융합계열','33','2','181','','84.9','83.3','82.7'),
 (2026,'koreatech-auto7','나군','사회융합계열','25','','94','3.76','80.6','79.7','78.8'),
 (2026,'koreatech-auto7','다군','자율전공(자연)','38','','394','10.37','86.6','84.9','83.9'),
 (2026,'koreatech-auto7','다군','자율전공(인문)','6','','55','9.17','83.2','82.9','82.4')]
 for y,key,gun,unit,q,carry,a,c,mean,c80,low in data:
  extra=pairs(['평균','80%컷','최하위'],[mean,c80,low])+('; 이월인원 '+carry if carry else '')
  if y==2026 and unit in ['공학융합계열','ICT융합계열']:extra+='; 공학융합·ICT융합 공동 경쟁률 6.60 (분등록 이전 정시 모집인원 기준)'
  rs.append(row(key,'한국기술교육대학교',y,'정시','일반전형('+gun+')',unit,'p.14' if y==2026 else 'p.2',admission_type='수능',quota=q,applicants=a,competition_rate=c,cut_other=extra,metric='백분위',basis='최종등록생',note='draft; 공식 PDF 시각 대조; 통합·무전공 모집은 학과별 인원으로 분해하지 않음; 80%컷은 cut_70에 넣지 않음; 모집인원 괄호 이월 별도 보존'))
 save('koreatech',rs)

def jwu():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 out=[];key='jwu-scan05-54';t=BeautifulSoup((CACHE/(key+'-converted.html')).read_text(encoding='utf8'),'html.parser').select_one('table');rr=html_grid(t);cells={}
 for i,tr in enumerate(t.find_all('tr')):
  j=0
  for cell in tr.find_all(['td','th'],recursive=False):
   while (i,j) in cells:j+=1
   rs=int(cell.get('rowspan',1));cs=int(cell.get('colspan',1))
   for a in range(rs):
    for b in range(cs):cells[i+a,j+b]=cell
   j+=cs
 for start,stop,head in [(11,32,7),(38,59,34)]:
  used=set()
  for i in range(start,stop):
   v=rr[i];unit=clean(v[1])
   for j in range(2,22,4):
    pg=compact(rr[head][j]);qcell=cells.get((i,j));shared=int(qcell.get('rowspan',1))>1;ident=id(qcell);q=val(v[j]);c=val(v[j+1]);cut=val(v[j+2]);rank=val(v[j+3]);typ='실기' if any(x in pg for x in ['실기','체육']) else '교과'
    def add(unit,q,c,cut,rank,agg=False):
     out.append(row(key,'중원대학교',2024,'수시',pg,unit,f'한글 표1 행{i+1} 열{j+1}',admission_type=typ,quota=q,competition_rate=c,cut_70=cut,cut_other=('충원합격 최종순위 '+rank if rank else ''),metric='교과등급',basis='최종등록자',grade_system='9',note='draft; 공동 모집인원·경쟁률은 합계 행, 성적·예비순위는 학과별 행; 원문 70%컷'))
    if shared:
     if ident not in used and q:add('전체 모집단위(공동 선발)',q,c,'','',True);used.add(ident)
     q=c=''
    if any([q,c,cut,rank]):add(unit,q,c,cut,rank)
 key='jwu-scan05-53';d=fitz.open(CACHE/(key+'.pdf'))
 for pi,page in enumerate(d):
  t=list(page.find_tables())[-1];rr=t.extract();seen=set()
  for i,v in enumerate(rr[5:],5):
   unit=clean(v[1])
   if not unit or unit in ['계','합계']:continue
   for j in range(2,len(v)-4,5):
    pg=compact(rr[1][j]);typ='종합' if '종합' in pg else ('실기' if any(x in pg for x in ['실기','체육']) else '교과')
    if pi==1 and j==22:pg+='(원문 오른쪽 동명 열; 명칭 확인 필요)'
    q,c,c50,low,rank=[val(x) for x in v[j:j+5]];box=t.rows[i].cells[j];ub=t.rows[i].cells[1];shared=box is not None and ub is not None and box[3]-box[1]>ub[3]-ub[1]+1
    def add(unit,q,c,c50,low,rank):
     out.append(row(key,'중원대학교',2026,'수시',pg,unit,f'p.{pi+1} 행{i+1} 열{j+1}',admission_type=typ,quota=q,competition_rate=c,cut_50=c50,cut_other=pairs(['최저등급','충원순위'],[low,rank]),metric='교과등급',basis='최종등록자',grade_system='9',note='draft; 50%와 최저 공개, 70%로 변환하지 않음; 공동 모집인원은 별도 합계; 원문 중복 전형명은 임의 교정하지 않음'))
    if shared:
     ident=tuple(box)
     if ident not in seen and q:add('전체 모집단위(공동 선발)',q,c,'','','');seen.add(ident)
     q=c=''
    if any([q,c,c50,low,rank]):add(unit,q,c,c50,low,rank)
 # 2025 image original: q, competition, final grade 70%, final waitlist rank.
 key='jwu-auto6-image3';pg=''
 data='''>일반전형Ⅰ
항공운항학과 15 3.00 4.70 18
항공서비스학과 7 4.29 4.40 18
무인항공기계학과 17 2.59 4.92 25
항공정비학과 15 4.07 4.95 39
간호학과 68 4.69 3.38 188
작업치료학과 19 2.00 5.41 17
임상병리학과 20 4.45 4.55 69
보건행정학과 15 1.27 4.20 1
뷰티메디컬학과 4 13.50 6.08 48
종교문화학부 12 1.17 4.74 1
경찰행정학과 12 3.92 4.63 32
드론봇군사학과 6 6.33 4.68 19
전기반도체컴퓨터공학과 13 1.85 4.46 11
바이오산업학과 12 1.08 3.50 -
운동레저학부 15 4.00 5.48 42
자율전공학부 31 1.52 4.81 16
>일반전형Ⅱ
항공서비스학과 18 4.11 4.25 33
무인항공기계학과 3 1.00 - -
항공정비학과 5 2.00 4.98 2
간호학과 28 4.54 3.43 27
작업치료학과 12 0.25 - -
임상병리학과 24 1.38 6.70 -
보건행정학과 3 1.00 - -
뷰티메디컬학과 12 4.75 5.51 5
종교문화학부 3 1.00 - -
경찰행정학과 13 1.00 - -
드론봇군사학과 16 2.00 4.85 1
경호학과 12 3.42 5.35 20
전기반도체컴퓨터공학과 12 1.33 4.01 -
바이오산업학과 5 0.20 - -
운동레저학부 11 5.09 4.70 12
>지역인재전형
항공운항학과 3 0.33 - -
항공서비스학과 2 2.00 - -
간호학과 33 3.15 4.8 68
임상병리학과 2 2.00 - -
보건행정학과 3 0.67 - -
>기회균형선발전형
항공서비스학과 3 2.00 - -
무인항공기계학과 3 0.00 - -
항공정비학과 3 0.00 - -
작업치료학과 3 2.00 - -
임상병리학과 3 1.00 - -
보건행정학과 3 0.00 - -
뷰티메디컬학과 2 1.00 - -
경찰행정학과 3 0.67 - -
드론봇군사학과 2 0.00 - -
경호학과 2 1.00 - -
전기반도체컴퓨터공학과 3 0.00 - -
바이오산업학과 4 0.00 - -
자율전공학부 5 1.00 6.45 -
>성인학습자전형Ⅰ
글로컬융합인재학과 30 1.03 3.7 -
>학생부종합전형
간호학과 30 3.10 - 35
글로컬융합인재학과 30 3.10 - 35
@jwu-auto6-image4
>실기중심전형
만화애니메이션학과 18 2.78 4.75 7
스포츠경영학부 19 1.79 5.1 12
운동레저학부 6 1.17 4 -
>체육우수인재전형
경호학과 8 0.88 5.13 -
스포츠경영학부 30 1.70 6.25 -
운동레저학부 48 1.83 5.84 9
>농어촌학생전형
전체모집단위(공동선발) 30 1.73 - -
항공운항학과 - - 3.75 -
항공정비학과 - - 3.33 -
간호학과 - - 4.00 4
드론봇군사학과 - - 3.89 1
만화애니메이션학과 - - 3.75 -
스포츠경영학부 - - 4 -
운동레저학부 - - 4.5 -
>특성화고교졸업자전형
전체모집단위(공동선발) 11 0.36 - -
>장애인등대상자전형
전체모집단위(공동선발) 2 - - -
>성인학습자전형Ⅱ
글로컬융합인재학과 8 - - -'''
 for i,line in enumerate(data.splitlines(),1):
  if line.startswith('>'):pg=line[1:];continue
  if line.startswith('@'):key=line[1:];continue
  unit,q,c,cut,rank=line.split()
  out.append(row(key,'중원대학교',2025,'수시',pg,unit,f'공식 이미지 대조전사 행{i}',admission_type='종합' if '종합' in pg else ('실기' if any(x in pg for x in ['체육','실기']) else '교과'),quota=val(q),competition_rate=val(c),cut_70=val(cut),cut_other='충원합격 최종순위 '+rank if val(rank) else '',metric='교과등급',basis='최종등록자',grade_system='9',note='draft; 공식 이미지 직접 대조 전사; 공동 모집인원 별도; 학생부종합의 동일 수치 2개 학과 표기는 원문 그대로 보존'))
 save('jwu',out)

def cnu24():
 out=[r for r in csv.DictReader((ROOT/'cnu.csv').open(encoding='utf-8-sig')) if r['result_year']!='2024'];issues=[]
 for key,rd in [('cnu-scan06-17','수시'),('cnu-scan06-20','정시')]:
  d=fitz.open(CACHE/(key+'.pdf'))
  for pi,page in enumerate(d):
   ts=list(page.find_tables())
   if not ts:continue
   left=ts[0];rr=left.extract();words=page.get_text('words');heads=[w for w in words if 90<w[1]<105];uh=[w for w in heads if w[4]=='모집단위'];assert uh,(key,pi)
   ux=uh[0][0]-5;pgsub='';gun=''
   def vals(x0,x1,y0,y1):return [w[4] for w in sorted(words,key=lambda w:w[0]) if x0<=(w[0]+w[2])/2<x1 and y0<=(w[1]+w[3])/2<y1]
   if rd=='수시':base='학생부교과' if pi<9 else ('학생부종합' if pi<21 else '실기/실적');default='일반전형' if pi<5 else ('지역인재전형' if pi<7 else '')
   else:base='수능';default='일반전형' if pi<6 else ''
   for i,v in enumerate(rr[2:],2):
    qbox=left.rows[i].cells[1]
    if not qbox:continue
    x0,y0,x1,y1=qbox;vv=vals(x0,x1,y0,y1)
    if len(vv)<3 or not num(vv[0]) or not num(vv[1]):continue
    unit=''.join(vals(ux,x0,y0,y1))
    if not unit or any(z in unit for z in ['합계','소계','총계']):continue
    meta=vals(left.bbox[0],ux,y0,y1)
    for m in meta:
     if m in ['가군','나군','다군']:gun=m
     if re.match(r'^(?:Ⅰ|Ⅱ|Ⅲ|지역인재|고른기회|실기위주|체육특기|특성화|농어촌|저소득|국가보훈|일반$)',m):pgsub=m
    pg=base+' '+(pgsub or default)+(('('+gun+')') if gun else '')
    # Statistics are retained in the exact horizontal order when headers contain blank fields.
    extra='지원통계 원문 ['+' '.join(vv)+']';cut='';fr=''
    fillbox=left.rows[0].cells[2]
    if fillbox:
     fv=vals(fillbox[0],fillbox[2],y0,y1);extra+='; 충원 1차/2차/3차/4차/최종순위/충원률 ['+' '.join(fv)+']'
     if len(fv)==6:fr=val(fv[-1])
    if len(ts)>1:
     right=ts[1];sr=right.extract();final=right.rows[0].cells[3]
     fs=vals(final[0],final[2],y0,y1);expected=7 if rd=='수시' and pi<9 else 4
     labs=['최종 교과환산평균','최종 교과환산70%','최종 교과환산표준편차','최종등급 평균','최종등급70%','최종등급최저','최종등급표준편차'] if expected==7 else ['최종 평균','최종70%','최종최저','최종표준편차']
     if len(fs)==expected:cut=val(fs[4 if expected==7 else 1]);extra+='; '+pairs(labs,fs)
     elif fs:issues.append([key,pi+1,i+1,'final-column-count',fs]);extra+='; 최종통계 원문 ['+' '.join(fs)+']'
     for j in [1,2]+([4] if rd=='정시' else []):
      b=right.rows[0].cells[j]
      if b:extra+='; '+clean(sr[0][j] or sr[1][j])+' ['+' '.join(vals(b[0],b[2],y0,y1))+']'
    elif rd=='정시' and len(rr[0])==9:
     # Other regular tracks use a single wide table; column 7 is the final score group.
     b=left.rows[0].cells[7];fs=vals(b[0],b[2],y0,y1)
     if len(fs)==4:cut=val(fs[1]);extra+='; '+pairs(['최종평균','최종70%','최종최저','최종표준편차'],fs)
     for j in [5,6,8]:
      b=left.rows[i].cells[j]
      if b:extra+='; '+clean(rr[1][j] or rr[0][j])+' ['+' '.join(vals(b[0],b[2],y0,y1))+']'
    out.append(row(key,'충남대학교',2024,rd,pg,unit,f'p.{pi+1} 행{i+1}',admission_type='실기' if '실기' in pg else ('종합' if '종합' in pg else ('수능' if rd=='정시' else '교과')),quota=vv[0],applicants=vv[1],competition_rate=vv[2],fill_rate=fr,cut_70=cut,cut_other=extra,metric='환산점수' if rd=='정시' else ('기타' if base=='실기/실적' else '교과등급'),basis='최종등록자; 최초·1단계 수치는 별도 원문 표기',grade_system='9' if rd=='수시' and base!='실기/실적' else '',note='draft; 공식 PDF 좌표 복원; 2명 미만 비공개 성적은 빈칸; 2024 원문 약칭 전형명 보존; 합계 제외'))
 save('cnu',out);(CACHE/'cnu24-extraction-issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2),encoding='utf8');print('cnu24 issues',len(issues))

def hanbat_fixed():
 out=[]
 from normalize_gyeonggi import header_labels
 for key,y in [('hanbat-auto1',2026),('hanbat-auto2',2025),('hanbat-auto3',2024)]:
  for s in list(openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True))[1:]:
   rr=excel_grid(s);raw=list(s.values);rd='정시' if s.title=='정시' else '수시';pg=s.title.replace('수시_','');seen=set();header=None
   for i,v in enumerate(rr):
    if any(compact(x)=='모집단위명' for x in v):
     # Only the first of vertically merged header rows contains raw text.
     if not any(compact(x)=='모집단위명' for x in raw[i]):continue
     header=i;uc=next(j for j,x in enumerate(v) if compact(x)=='모집단위명');q=next(j for j,x in enumerate(v) if compact(x) in ['모집인원','최종모집인원']);a=next(j for j,x in enumerate(v) if compact(x)=='지원인원');c=next(j for j,x in enumerate(v) if compact(x)=='경쟁률');labs=header_labels(rr[i-1:i+2],len(v));sec=clean(rr[i-1][uc]);pg=sec.replace('수시 ','') if sec.startswith('수시 ') else s.title.replace('수시_','');continue
    if header is None or i<header+2 or not num(raw[i][a]):continue
    unit=v[uc]
    if q>uc+2:unit+=' / '+v[uc+1]
    if not unit or unit in ['계','합계'] or '※' in unit:continue
    qr=next((m for m in s.merged_cells.ranges if m.min_col<=q+1<=m.max_col and m.min_row<=i+1<=m.max_row and m.max_row>m.min_row),None)
    kw={}
    for pct in ['50','70']:
     ix=next((j for j,l in enumerate(labs) if '최종' in l and pct+'%' in l and ('내신등급' in l if rd=='수시' else '수능' in l and ('점수' in l or '총점' in l))),None)
     if ix is not None:kw['cut_'+pct]=val(v[ix])
    program=(v[1]+' ' if rd=='정시' else '')+pg;typ='실기' if '실기' in pg else ('수능' if rd=='정시' else ('종합' if any(x in pg for x in ['종합','소프트웨어','특수교육']) else '교과'))
    def add(unit,quota,app,comp,extra,**cuts):
     out.append(row(key,'국립한밭대학교',y,rd,program,unit,f'{s.title} 행{i+1}',admission_type=typ,quota=quota,applicants=app,competition_rate=comp,cut_other=extra,metric='교과등급' if rd=='수시' else '환산점수',basis='최초합격자·최종등록자 구분; 전형총점 순위의 해당 성적',grade_system='9' if rd=='수시' else '',note='draft; 엑셀 병합셀 복원; 공동 인원과 학과별 성적 분리; 실기일반/실기우수자 구분',**cuts))
    if qr and str(qr) not in seen:
     seen.add(str(qr));units=list(dict.fromkeys(clean(rr[j][uc]) for j in range(qr.min_row-1,qr.max_row)));add('공동 선발: '+' | '.join(units),val(v[q]),'','','모집인원 공유; 지원인원은 학과별 행')
    add(unit,'' if qr else val(v[q]),val(raw[i][a]),val(raw[i][c]),pairs(labs[c+1:],v[c+1:]),**kw)
 save('hanbat',out)

def kornu24():
 out=[r for r in csv.DictReader((ROOT/'kornu.csv').open(encoding='utf-8-sig')) if not (r['result_year']=='2024' and r['round']=='정시')];key='kornu-3133-pdf'
 data='''>일반학생|백분위
자율전공선택계열 338 2.27 410 49.8 24.8
간호학과 14 5.79 34 79.9 78.0
물리치료학과 6 6.50 4 79.0 77.4
임상병리학과 1 6.00 3 66.7 53.3
응급구조학과 10 3.40 21 63.9 45.2
유아특수교육과 19 1.00 - 64.0 52.4
특수교육과 14 1.50 4 59.6 47.6
중등특수교육과 5 1.20 1 62.8 55.8
재활스포츠학부 30 9.03 16 43.4 22.5
실용음악학과 32 1.59 8 - -
태권도학과 11 2.09 4 - -
>특성화고졸업자|교과등급
자율전공선택계열 10이내 1.00 - - -
>농어촌학생|교과등급
자율전공선택계열 10이내 4.00 2 5.8 5.8
재활스포츠학부 1 3.00 - 5.5 5.5
실용음악학과 2 0.50 - - -
>기초생활수급자|교과등급
자율전공선택계열 10이내 3.00 1 7.3 7.3
태권도학과 1 0.00 - - -
>장애학생|교과등급
기독교학부 2 1.50 - 7.8 8.1
사회복지학부 2 0.00 - - -
휴먼재활학부 3 0.00 - - -
항공호텔관광경영학과 5 0.00 - - -
금융부동산학과 1 0.00 - - -
재활의료공학과 1 0.00 - - -
아동심리교육학과 5 0.00 - - -
유아특수교육과 2 0.00 - - -
특수교육과 2 0.50 - - -
중등특수교육과 1 - - - -
재활스포츠학부 5 0.40 - 3.9 3.9
실용음악학과 5 0.00 - - -
태권도학과 1 1.00 - 5.7 5.7'''
 for i,line in enumerate(data.splitlines(),1):
  if line.startswith('>'):pg,metric=line[1:].split('|');continue
  unit,q,c,rank,avg,cut=line.split();out.append(row(key,'나사렛대학교',2024,'정시',pg,unit,f'p.1 공식 이미지 대조전사 행{i}',admission_type='수능' if metric=='백분위' else '교과',quota=q,competition_rate=val(c),cut_other=pairs(['충원합격','평균','컷(비율 미명시)'],[rank,avg,cut]),metric=metric,basis='최종등록자',grade_system='9' if metric=='교과등급' else '',note='draft; 공식 PDF 이미지 시각 대조; 자율전공선택계열 공동 수치 보존; 컷 비율 미명시로 cut_70에 넣지 않음'))
 save('kornu',out)

def mokwon_fixed():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 from normalize_gyeonggi import header_labels
 out=[];seen=set()
 for f in sorted(CACHE.glob('mokwon-*.html')):
  key=f.stem;m=json.loads((CACHE/(key+'.meta.json')).read_text());u=m['url'].split('#')[0].replace('http://','https://');mt=re.search(r'/0([13])04(11|10|09)\d\d.html$',u)
  if not mt or u in seen:continue
  seen.add(u);y={'11':2026,'10':2025,'09':2024}[mt[2]];rd='수시' if mt[1]=='1' else '정시'
  for ti,t in enumerate(BeautifulSoup(f.read_text(encoding='utf8'),'html.parser').select('table')):
   rr=html_grid(t)
   if len(rr)<4:continue
   n=len(rr[0]);labs=header_labels(rr[:3],n);q=next((i for i,a in enumerate(labs) if '모집인원' in compact(a)),None)
   if q is None:continue
   pg=rr[0][q];cells={};orig={}
   for i,tr in enumerate(t.select('tr')):
    j=0
    for cell in tr.find_all(['td','th'],recursive=False):
     while (i,j) in cells:j+=1
     rs=int(cell.get('rowspan',1));cs=int(cell.get('colspan',1));orig[i,j]=(cell,rs,cs)
     for a in range(rs):
      for b in range(cs):cells[i+a,j+b]=cell
     j+=cs
   units={i:' / '.join(dict.fromkeys(clean(x) for x in v[1:q] if clean(x))) for i,v in enumerate(rr) if i>=3}
   groups={}
   for (i,j),(cell,rs,cs) in orig.items():
    if i<3 or j<q:continue
    value=clean(cell.get_text(' ',strip=True))
    if not re.search(r'\d',value):continue
    scope=tuple(k for k in range(i,i+rs) if k in units and units[k] and units[k] not in ['계','합계','총계'])
    if not scope:continue
    g=groups.setdefault(scope,{})
    # A horizontal merged value is retained with its combined original headers.
    g[j]=(value,cs)
   for scope,g in groups.items():
    names=list(dict.fromkeys(units[i] for i in scope));unit=' | '.join(names);shared=len(scope)>1
    extra=[]
    for j,(v,cs) in g.items():
     if j>=q+3:extra.append(' / '.join(dict.fromkeys(labs[j:j+cs]))+' '+v)
    out.append(row(key,'목원대학교',y,rd,pg,unit,f'표{ti+1} 원문행 '+','.join(str(i+1) for i in scope),admission_type='종합' if '종합' in pg else ('실기' if any(z in pg for z in ['실기','특기']) else ('수능' if rd=='정시' else '교과')),quota=g.get(q,('',''))[0],applicants=g.get(q+1,('',''))[0],competition_rate=g.get(q+2,('',''))[0],cut_other='; '.join(extra),metric='교과등급' if rd=='수시' else '환산점수',basis='합격자; 최초평균·최종평균·최저 구분',grade_system='9' if rd=='수시' else '',note='draft; 병합셀 범위가 같은 통계끼리 묶음; '+('공동 수치는 학과별로 분해하지 않음' if shared else '학과별 수치')+'; 충원순위는 인원과 구분; 동일 학과의 공동 모집/개별 성적 행은 별도'))
 save('mokwon',out)

def kdu25():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 out=[r for r in csv.DictReader((ROOT/'kdu.csv').open(encoding='utf-8-sig')) if r['result_year']!='2025'];key='kdu-scan05-59-older141';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
 for ti,t in enumerate(s.select('table')[1:],2):
  rr=html_grid(t);rd='수시' if ti==2 else '정시';pg=''
  for i,v in enumerate(rr,1):
   if '◎' in v[0]:pg=v[0].split('_')[-2];continue
   q=1 if rd=='수시' else 2
   if not num(v[q]):continue
   unit=v[q-1];program=pg
   if pg=='특별전형(정원외)':program=unit+'(정원외)';unit='전체 모집단위(전형 합계)'
   if rd=='정시':program=v[0]+' '+pg
   labels=['등록인원','환산 최저','환산80%','환산70%','환산50%','환산최고','환산만점']+(['등급최저','등급80%','등급70%','등급50%','등급최고'] if rd=='수시' else ['70%국어백분위','70%수학백분위','70%탐구백분위','70%평균백분위','70%영어등급'])
   out.append(row(key,'극동대학교',2025,rd,program,unit,f'HTML 표{ti} 행{i}',admission_type='교과' if rd=='수시' else '수능',quota=v[q],competition_rate=val(v[q+1]),cut_50=val(v[13 if rd=='수시' else 8]),cut_70=val(v[12 if rd=='수시' else 7]),cut_other=pairs(labels,v[q+2:]),metric='교과등급' if rd=='수시' else '환산점수',basis='최종등록자',grade_system='9' if rd=='수시' else '',note='draft; 공식 HTML 수치 원문; 최상단 전형명 적용(내부 소제목 재사용 오기); 정원외 통계는 전형 합계'))
 save('kdu',out)

def chungwoon_reg():
 out=[r for r in csv.DictReader((ROOT/'chungwoon.csv').open(encoding='utf-8-sig')) if r['round']!='정시']
 for y,key in [(2025,'chungwoon-reg-post200-file199'),(2024,'chungwoon-reg-post202-file199')]:
  camp='';unit=''
  for p in tables(key):
   for t in p['tables']:
    for i,v in enumerate(t['rows'][4:],5):
     if v[0]:camp=compact(v[0])
     if v[2]:unit=clean(v[2])
     if '홍성' not in camp or not num(v[4]):continue
     pg='청운인재전형' if '*' in unit else '일반전형'
     labels=['수능 최초평균','수능 최초70%','수능 최종평균','수능 최종70%','학생부 최초평균','학생부 최초'+('70%' if y==2025 else '최저'),'학생부 최종평균','학생부 최종'+('70%' if y==2025 else '최저')]
     out.append(row(key,'청운대학교(홍성)',y,'정시',pg,unit,f'p.{p["page"]} 행{i}',admission_type='수능',quota=val(v[4]),applicants=val(v[5]),competition_rate=val(v[6]),cut_70=val(v[10]),cut_other=pairs(labels,v[7:]),metric='백분위',basis='최종합격자; 수능시험 미응시자 제외',note='draft; 일반/청운인재는 원문 별표 기준; 음악 세부전공 공동 수치는 학과 단위 유지'))
 save('chungwoon',out)

def kdu24():
 out=[r for r in csv.DictReader((ROOT/'kdu.csv').open(encoding='utf-8-sig')) if r['result_year']!='2024']
 for i,line in enumerate((CACHE/'kdu-2024-verified-transcription.txt').read_text(encoding='utf8').splitlines(),1):
  if not line or line.startswith('#'):continue
  if line.startswith('@'):key,rd,pg=line[1:].split('|');continue
  unit,*v=line.split();assert len(v)==14,(i,v)
  labels=['등록인원','환산최저','환산80%','환산70%','환산50%','환산최고','환산만점']+(['등급최저','등급80%','등급70%','등급50%','등급최고'] if rd=='수시' else ['70%국어백분위','70%수학백분위','70%탐구백분위','70%평균백분위','70%영어등급'])
  out.append(row(key,'극동대학교',2024,rd,pg,unit,f'공식 이미지 대조전사 원장 행{i}',admission_type='교과' if rd=='수시' else '수능',quota=v[0],competition_rate=v[1],cut_50=val(v[12 if rd=='수시' else 6]),cut_70=val(v[11 if rd=='수시' else 5]),cut_other=pairs(labels,v[2:]),metric='교과등급' if rd=='수시' else '환산점수',basis='최종등록자',grade_system='9' if rd=='수시' else '',note='draft; 원본 이미지 시각 대조 전사; 정원외는 합계; 경쟁률0 또는 등록인원 공란인데 성적이 있는 경우도 원문 그대로 유지; 점수/등급 순서 불일치 임의 보정하지 않음'))
 save('kdu',out)

def hanseo_images():
 out=[r for r in csv.DictReader((ROOT/'hanseo.csv').open(encoding='utf-8-sig')) if not (r['round']=='수시' and r['result_year'] in ['2025','2026'])]
 for y,key in [(2025,'hanseo-scan05-42'),(2026,'hanseo-scan05-41')]:
  groups=([('학생부교과1',3),('학생부교과2',3)] if y==2025 else [('학생부교과',3)])+[('지역인재',2),('사회기여(배려)자',2),('한서인재',3),('융합인재',2),('일반전형',2)]
  for i,line in enumerate((CACHE/f'hanseo-{y}-verified-transcription.txt').read_text(encoding='utf8').splitlines(),1):
   if not line or line.startswith('#'):continue
   unit,*v=line.split();assert len(v)==sum(n for _,n in groups),(i,len(v));st=0
   for pg,n in groups:
    vs=v[st:st+n];st+=n
    if not any(num(x) for x in vs):continue
    out.append(row(key,'한서대학교',y,'수시',pg,unit,f'p.1 시각 대조전사 원장 행{i}',admission_type='종합' if pg=='융합인재' else ('실기' if pg=='일반전형' else '교과'),cut_other=pairs(['평균','80%','추가합격'] if n==3 else ['평균','추가합격'],vs),metric='교과등급',basis=f'최종입학자; {y}학년도 성적산출방법',grade_system='9',note='draft; 공식 PDF 시각 대조 전사; 80%컷 보존; 융합인재는 서류평가100%로 교과등급은 참고자료; 대시는 모집/등록인원 없음'))
 save('hanseo',out)

def cju25():
 import collections
 out=[r for r in csv.DictReader((ROOT/'cju.csv').open(encoding='utf-8-sig')) if r['result_year']!='2025']
 units=(CACHE/'cju-2025-verified-units.txt').read_text(encoding='utf8').splitlines()
 for rd,key in [('수시','cju-scan05-16'),('정시','cju-scan06-12')]:
  us=units[:]
  if rd=='정시':
   us.remove('군사학과(여)');us.insert(us.index('간호학과')+1,'간호학과(지역인재)');us.insert(us.index('물리치료학과')+1,'물리치료학과(지역인재)')
  d=fitz.open(CACHE/(key+'.pdf'));groups=collections.defaultdict(list)
  for w in d[0].get_text('words'):groups[round(w[1],1)].append(w)
  assert len(groups)==len(us),(rd,len(groups),len(us))
  first=sorted(groups[min(groups)],key=lambda w:w[0]);xs=[(w[0]+w[2])/2 for w in first]
  for i,((yy,ww),unit) in enumerate(zip(sorted(groups.items()),us),1):
   values=['']*len(xs)
   for w in ww:
    xx=(w[0]+w[2])/2;c=min(range(len(xs)),key=lambda j:abs(xs[j]-xx));assert abs(xs[c]-xx)<5 and not values[c],(i,w);values[c]=w[4]
   pgs=['일반전형(군사학과 포함)','교과우수(예체능 포함)','담임추천','창의면접','지역인재'] if rd=='수시' else ['지역인재' if '지역인재' in unit else '정시 일반전형']
   for j,pg in enumerate(pgs):
    vs=values[j*10:j*10+10] if rd=='수시' else values
    if not num(vs[0]):continue
    labs=['표준점수 최고','표준점수 평균','표준점수70%','내신등급 최고','내신등급 평균','내신등급70%'] if rd=='수시' else [a+' '+b+' '+c for a in ['최종합격자','최초합격자'] for b in ['수능원백분위','수능등급'] for c in ['최고','평균','70%']]
    out.append(row(key,'청주대학교',2025,rd,pg,unit,f'p.1 본표 데이터행{i}',admission_type='교과' if rd=='수시' else '수능',quota=val(vs[0]),applicants=val(vs[1]),competition_rate=val(vs[2]),fill_count=val(vs[3]),cut_70=val(vs[9 if rd=='수시' else 6]),cut_other=pairs(labs,vs[4:]),metric='교과등급' if rd=='수시' else '백분위',basis='최종합격자',grade_system='9' if rd=='수시' else '',note='draft; 윤곽선 모집단위 시각 대조; 숫자는 PDF 단어좌표로 원문 추출; 예체능·군사학과별 실기·면접 기준 원문 참조'))
 for unit,vs in [('경영학과','1 3 3.0 2 - - - - - -'),('관광경영학과','1 2 2.0 1 57.66 57.66 57.66 7.88 7.88 7.88'),('광고홍보학과','2 4 2.0 1 73.72 73.39 73.25 5.13 5.32 5.39'),('지적학과','1 1 1.0 - - - - - - -'),('간호학과','3 8 2.7 3 84.55 79.40 74.77 3.50 4.54 5.78'),('농어촌','76 135 1.8 30 91.90 74.30 69.10 2.63 5.18 6.01'),('특성화고','37 156 4.2 75 92.80 81.92 79.09 2.13 3.94 4.36'),('기회균형','30 74 2.5 37 97.06 73.39 69.07 1.63 5.30 5.93')]:
  v=vs.split();outside=unit in ['농어촌','특성화고','기회균형']
  out.append(row('cju-scan05-16','청주대학교',2025,'수시',unit if outside else '국가보훈 / 지역기회균형','정원외 전체(전형 합계)' if outside else unit,'p.1 삽입표 시각 대조',admission_type='교과',quota=v[0],applicants=v[1],competition_rate=v[2],fill_count=val(v[3]),cut_70=val(v[9]),cut_other=pairs(['표준점수 최고','표준점수 평균','표준점수70%','내신등급 최고','내신등급 평균','내신등급70%'],v[4:]),metric='교과등급',basis='최종합격자',grade_system='9',note='draft; 원문 시각 대조 전사; 정원외는 전형 전체 합계'))
 save('cju',out)

def hannam25():
 out=[r for r in csv.DictReader((ROOT/'hannam.csv').open(encoding='utf-8-sig')) if not(r['result_year']=='2025' and r['round']=='수시')]
 for kind,step,pgs,labels,pi in [('gyogwa',11,['학생부교과 일반전형','학생부교과 지역인재교과우수자전형'],['최초교과 환산평균','최초교과 등급평균','최종교과 환산최고','최종교과 환산평균','최종교과 환산70%','최종교과 등급최고','최종교과 등급평균','최종교과 등급70%'],1),('jonghap',7,['학생부종합 한남인재Ⅰ(서류)전형','학생부종합 한남인재Ⅱ(서류+면접)전형'],['최초교과 등급평균','최종교과 등급최고','최종교과 등급평균','최종교과 등급70%'],2)]:
  for i,line in enumerate((CACHE/f'hannam-2025-{kind}-verified.txt').read_text(encoding='utf8').splitlines(),1):
   if not line or line.startswith('#'):continue
   unit,*v=line.split();assert len(v) in [step,step*2]
   for j,pg in enumerate(pgs):
    vs=v[j*step:(j+1)*step]
    if not vs or not num(vs[0]):continue
    out.append(row('hannam-2025-susi','한남대학교',2025,'수시',pg,unit,f'p.{pi} 시각 대조전사 원장 행{i}',admission_type='교과' if kind=='gyogwa' else '종합',quota=vs[0],competition_rate=vs[1],cut_70=vs[-1],cut_other='최종충원예비순위 '+vs[2]+'; '+pairs(labels,vs[3:]),metric='교과등급',basis='최종합격자; 2026 전형방법 적용 재산출',grade_system='9',note='draft; 공식 PDF 시각 대조 전사; 2026 모집단위 기준; 학생부종합은 교과 정량평가 아님; 예비순위를 충원인원으로 대입하지 않음; 소수인원 평균과70%컷 순서 역전 원문 유지'))
 save('hannam',out)

if __name__=='__main__':
 for name in sys.argv[1:]:globals()[name]()
