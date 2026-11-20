from normalize_daegu import display,grid,heads
from normalize_national import *
from normalize_daegu_adiga import campus,number

def handong():
 out=[]
 for y in [2024,2025,2026]:
  key=f'handong-{y}';d=tables(key);pg=typ=group=''
  for i,v in enumerate(d[0]['tables'][0]['rows'][1:],2):
   if v[0]=='계':continue
   if v[0]:group=clean(v[0])
   if v[1]:typ=compact(v[1])
   if v[2]:pg=compact(v[2])
   q=len(v)-6;sub=' '.join(clean(x) for x in v[3:q] if x);program=pg+(' '+sub if sub else '')
   at='교과' if '교과' in typ else '종합' if '종합' in typ else '수능' if '수능' in typ else '기타'
   rd='수시' if at in ['교과','종합'] else '추가모집' if '추가모집' in sub else '정시' if at=='수능' else '재외국민' if pg=='재외국민' else '전형기간 자율화'
   metric='교과등급' if rd=='수시' else '백분위' if at=='수능' else '기타';c70='';note='draft; 공식 입학처 PDF; 전 모집단위 전형별 통계; 모집인원·최초합격·충원합격·입학인원 구분';other=pairs(['모집표 수치','지원인원','경쟁률','최초합격인원','충원합격인원','입학인원'],v[q:]);loc=f'p1 표1 행{i}'
   if at=='교과' and (pg in ['학생부교과(학생부교과)','학생부교과','한동인재']):
    mean,c70=({'학생부교과':('2.58','2.97'),'한동인재':('3.89','4.18')}[pg] if y==2026 else ('3.82','4.00') if y==2024 else ('3.77','4.03'))
    other+=' | 입학생 교과평균 '+mean;loc+='; p2 교과';note+='; 교과 반영교과목, 입학생 전체'
   if at=='종합' and pg in ['학생부종합(일반학생)','G-IMPACT인재']:
    mean,c70={2024:('3.35','3.65'),2025:('3.33','3.65'),2026:('3.85','4.09')}[y];other+=' | 입학생 교과평균 '+mean;loc+='; p2 종합';note+='; 일반고 출신 입학생 중 학생부 전산자료 제출자 전과목 기준'
   if at=='수능' and '일반학생' in pg and rd=='정시':
    mean,c70={2024:('81.81','79.67'),2025:('79.27','77.33'),2026:('82.14','80.33')}[y]
    other+=' | 입학생 수능백분위평균 '+mean+' | '+clean(d[1]['text'].split('정시(다)군)')[-1]);loc+='; p2 정시';note+='; 국어·수학·영어 기준(어디가 과목 구성과 구분)'
   if '*' in pg:note+='; 모집인원 미지정 전형의 모집표 수치는 최종 입학인원이라 quota 공란'
   out.append(row(key,'한동대학교',y,rd,program,'전 모집단위',loc,admission_type=at,quota='' if '*' in pg else number(v[q]),applicants=number(v[q+1]),competition_rate=number(v[q+2]),fill_count=number(v[q+4]),cut_70=c70,cut_other=other,metric=metric,basis='입학생; 통계별 대상 구분',grade_system='9' if metric=='교과등급' else '',note=note+'; '+group))
 save('handong',out)

def ikw():
 out=[];key='ikw-2026-1'
 for page in tables(key):
  g=page['tables'][0]['rows'];unit=''
  for i,v in enumerate(g[3:],4):
   if v[1]:unit=compact(v[1])
   member=compact(v[2]);u=unit+(' '+member if member else '')
   for st in [3,8,13,18]:
    if not num(v[st]):continue
    pg=compact(g[0][st]).lstrip('*')
    out.append(row(key,'경운대학교',2026,'수시',pg,u,f'p{page["page"]} 표1 행{i}',admission_type='종합' if '종합' in pg else '실기' if '실기' in pg else '교과',quota=val(v[st]),competition_rate=val(v[st+1]),cut_other=pairs(['최종합격자 등급평균','최종합격자 90%기준','최종합격 후보순위'],v[st+2:st+5]),metric='교과등급',basis='최종합격자',grade_system='9',note='draft; 공식 입학처; 90%컷을 70%컷으로 변경하지 않음; 후보순위와 충원인원 구분; 국영수 상위6과목·사과한국사 상위3과목'))
 save('ikw',out)

def kiu():
 key='kiu-2026';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s);out=[]
 for i in range(11,s.max_row):
  raw=[display(c) for c in s[i+1]]
  if not raw[1]:continue
  for st in [2,8,14,20]:
   if not num(raw[st+2]):continue
   pg=clean(g[8][st].split('【')[0])
   out.append(row(key,'경일대학교',2026,'수시',pg,compact(raw[1]),f'{s.title} 행{i+1}',admission_type='교과',quota=raw[st+2],applicants=raw[st+3],competition_rate=raw[st+1],cut_other=pairs(['2027계획모집인원','교과평균','교과85%컷'],[raw[st],raw[st+4],raw[st+5]]),metric='교과등급',basis='2026 최종등록자; 2027 교과반영방법 재산출',grade_system='9',note='draft; 원문 2027 모집단위 기준; 모집인원은 2026 실적 열; 85%컷은 70%로 변경하지 않음'))
 save('kiu',out)

def dyu():
 import normalize_gyeonggi as gg
 from normalize_gyeonggi import header_labels
 out=[]
 for y,rd,key in [(2024,'수시','dyu-2024-susi'),(2025,'수시','dyu-2025-susi'),(2026,'수시','dyu-susi-file0'),(2024,'정시','dyu-2024-jeongsi'),(2025,'정시','dyu-jeongsi-file0')]:
  for p in gg.tables(key):
   g=p['tables'][0]['rows'];labs=header_labels(g,2);unit='';gun=''
   for i,v in enumerate(g[2:],3):
    if y==2024:
     if v[1]:unit=compact(v[1])
     if rd=='수시':pg=clean(v[2]);st=4
     else:
      if v[2]:gun=clean(v[2])
      pg=clean(v[3])+' '+gun+'군';st=4
    else:
     if v[0]:unit=compact(v[0])
     pg=clean(v[1]);st=2
    if not campus('dyu-yeongju',unit) or not any(num(x) for x in v[st:]):continue
    r=gg.row(key,'동양대학교(영주)',y,rd,pg,unit,f'p{p["page"]} 표1 행{i}',admission_type='교과' if rd=='수시' else '수능' if '수능' in pg else '교과',cut_other=pairs(labs[st:],v[st:]),metric='교과등급' if rd=='수시' else '기타',basis='최초합격자·최종합격자(충원 포함)' if y>2024 and rd=='수시' else '최종합격자',grade_system='9' if rd=='수시' else '',note='draft; 공식 입학처 영주 모집단위; 2024 원문의 캠퍼스 구분과 대조; 최고·평균·최저·표준편차 보존; 2024 원문은 차년도 모집단위명 포함')
    out.append(r)
 save('dyu-yeongju',out)

def dhu():
 out=[]
 for y,key in [(2024,'dhu-2024-susi-0'),(2025,'dhu-2025-susi-1')]:
  s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s);h=4 if y==2024 else 2;labs=heads(g,[h-1,h])
  for i in range(h+1,s.max_row):
   v=[display(c) for c in s[i+1]]
   if v[0]!=str(y) or not num(v[3]):continue
   pg=compact(v[2]);out.append(row(key,'대구한의대학교',y,'수시',pg,compact(v[1]),f'{s.title} 행{i+1}',admission_type='종합' if '종합' in pg else '실기' if '실기' in pg else '교과',quota=v[3],applicants=v[4],competition_rate=v[5],cut_other=pairs(labs[6:12],v[6:12]),metric='교과등급',basis='최종등록자; 표별 산출기준',grade_system='9',note='draft; 공식 입학처; 교과는 평균·90%컷만 공개; 총점50%를 교과50%로 넣지 않음; 어디가 50%·70% 표제와 입학처 평균·90% 표제가 다른 값은 원문별 구분 필요'))
 key='dhu-2026-susi-0'
 for p in tables(key):
  g=p['tables'][0]['rows']
  for i,v in enumerate(g[2:],3):
   if v[0]!='2026' or not num(v[3]):continue
   pg=compact(v[2]);out.append(row(key,'대구한의대학교',2026,'수시',pg,compact(v[1]),f'p{p["page"]} 표1 행{i}',admission_type='종합' if '종합' in pg else '실기' if '실기' in pg else '교과',quota=val(v[3]),applicants=val(v[4]),competition_rate=val(v[5]),cut_70=val(v[13]) if num(v[13]) else '',cut_other=pairs(['추가합격후보순번','최저통과비율','등록자수','총점50%','총점70%','총점90%','교과평균','교과70%','교과90%'],v[6:15]),metric='교과등급',basis='최종등록자',grade_system='9',note='draft; 공식 입학처; 총점·교과등급 통계 구분'))
 for y,key in [(2024,'dhu-2024-jeongsi-0'),(2025,'dhu-2025-jeongsi-1'),(2026,'dhu-2026-jeongsi-0')]:
  s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s);labs=heads(g,[0,1])
  for i in range(2,s.max_row):
   v=[display(c) for c in s[i+1]]
   if not num(v[5]) or not v[2]:continue
   out.append(row(key,'대구한의대학교',y,'정시',v[0]+'군 '+('실기전형' if v[2]=='체육학과' else '일반전형'),compact(v[2]),f'{s.title} 행{i+1}',admission_type='실기' if v[2]=='체육학과' else '수능',quota=v[5],applicants=v[6],competition_rate=v[7],cut_70=v[11] if y==2026 and num(v[11]) else '',cut_other=pairs(labs[8:],v[8:]),metric='환산점수',basis='등록자; 표별 산출기준',note='draft; 공식 입학처; 백분위합 300점 만점, 한국사 가산점 포함; 90%컷은 70%로 변경하지 않음; 통합모집단위 구성 '+v[3]))
 save('dhu',out)

def gimcheon():
 key='gimcheon-official';g=tables(key)[0]['tables'][0]['rows'];out=[]
 for i,v in enumerate(g[3:],4):
  if not v[0] or '합계' in v[0]:continue
  for st in [1,6,11]:
   if not any(num(z) for z in v[st+1:st+5]):continue
   pg=compact(g[0][st]);out.append(row(key,'김천대학교',2026,'수시',pg,compact(v[0]),f'p1 표1 행{i}',admission_type='교과',competition_rate=val(v[st+3]),cut_70=val(v[st+2]) if num(v[st+2]) else '',cut_other=pairs(['2027계획모집인원','평균등급','70%컷','경쟁률','충원순위'],v[st:st+5]),metric='교과등급',basis='2026 최종등록자; 검정고시 포함',grade_system='9',note='draft; 공식 입학처; 모집인원 열은 2027 계획이라 quota에 넣지 않음; 충원순위는 인원으로 변경하지 않음; 검정고시 포함 자료로 어디가 결과와 차이가 있음을 원문에 명시'))
 save('gimcheon',out)

if __name__=='__main__':
 for arg in sys.argv[1:]:globals()[arg]()
