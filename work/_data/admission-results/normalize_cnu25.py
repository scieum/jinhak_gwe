"""CNU 2025 official raster tables, with explicit transcription review ledger."""
from normalize_chungcheong import *
from cnu25_grid import D,geometry
from PIL import Image
import numpy as np

VERIFIED_NAMES='''일어일문학과
도시·자치융합학과
문화와사회융합전공
공공안전융합전공
농생명융합학부
자율전공융합학부
천문우주과학과
반도체융합학과
스마트시티건축공학과
자율운항시스템공학과
정보통신융합학부
전기·전자·통신공학교육과
미생물·분자생명과학과
생명정보융합학과
자율운항시스템공학과
미생물·분자생명과학과
국토안보학전공(남자)
국토안보학전공(여자)
해양안보학전공(남자)
해양안보학전공(여자)
문화와사회융합전공
국토안보학전공(공통)
국토안보학전공(여자)
해양안보학전공(여자)
농생명융합학부
자율운항시스템공학과
전기·전자·통신공학교육과
기술교육과
미생물·분자생명과학과
생명정보융합학과
전기·전자·통신공학교육과
일어일문학과
미생물·분자생명과학과
관현악과(Cello)
관현악과(Viola)
회화과(서양화)
체육교육과(체조)
체육교육과(테니스)
스포츠과학과(배구-공격수)
스포츠과학과(핸드볼-피벗)
스포츠과학과(핸드볼-라이트백)
스포츠과학과(핸드볼-레프트윙)
스포츠과학과(핸드볼-골키퍼)
인문사회융합학부
자연과학융합학부
공학융합학부
자율운항시스템공학과
전기·전자·통신공학교육과
체육교육과
관현악과(Bassoon)
관현악과(Clarinet)
관현악과(Flute)
관현악과(Horn)
관현악과(Percussion)
관현악과(Trombone)
관현악과(Tuba)
관현악과(Viola)
관현악과(Violin)
디자인창의학과(도자·섬유디자인)
디자인창의학과(시각·제품디자인)'''.splitlines()

def main():
 old=list(csv.DictReader((ROOT/'cnu.csv').open(encoding='utf-8-sig')))
 known={compact(r['recruit_unit']) for r in old if r['result_year']!='2025'}
 reviews=json.loads((D/'unit-review.json').read_text(encoding='utf8'))
 assert len(reviews)==len(VERIFIED_NAMES)
 corrected={x['left']:name for x,name in zip(reviews,VERIFIED_NAMES) if x['left']}
 ledger=[dict(x,verified=name,method='원본 모집단위 확대 이미지 대조') for x,name in zip(reviews,VERIFIED_NAMES)]
 (D/'unit-verified.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2),encoding='utf8')
 data=json.loads((D/'numeric-grid.json').read_text(encoding='utf8'));out=[];suppressed=0;issues=[]
 for p in data:
  reg=p['key'].endswith('19');pn=p['page'];extra=p['extra'];im=np.array(Image.open(D/f"{p['key']}-p{pn}.png").convert('L'));lb,rb,_=geometry(p['width'])
  for r in p['rows']:
   l=r['leftnum'];v=r.get('rightnum',[]).copy();ri=r['row'];ci=3 if extra else 2
   lunit=l[ci];runit=r['right'][0] if r['right'] else ''
   unit=corrected.get(lunit) or (lunit if lunit in known else runit if runit in known else None)
   if reg and pn==4 and ri in (35,36):unit={35:'공학융합학부',36:'첨단융합학부'}[ri]
   assert unit,(p['key'],pn,ri,lunit,runit)
   if not reg:
    typ='교과' if pn<=11 else '종합' if pn<29 else '실기'
    if not extra:pg=('학생부교과 '+p['title'] if typ=='교과' else p['title'])
    elif pn==10:pg='학생부교과 고른기회'
    elif pn==11:pg='학생부교과 '+('고른기회' if ri<=6 else '국가보훈' if ri<=24 else '국가안보' if ri<=28 else '지역인재(저)')
    elif pn==22:pg='종합Ⅱ '+('소프트웨어' if ri<=2 else '영농창업' if ri<=5 else '지역인재(의)' if ri==6 else '국가안보')
    elif pn in range(23,28):pg='종합Ⅲ '+{23:'농어촌',24:'농어촌',25:'특성화',26:'저소득층',27:'특수교육'}[pn]
    else:pg='실기 '+('일반' if ri<=12 else '체육특기')
   else:
    typ='수능'
    pg=p['title']
    if extra:pg='일반_실기' if ri<=21 else '지역인재(저)' if ri==22 else '국가안보_국토' if ri<=24 else '국가안보_해양' if ri<=26 else '농어촌' if ri<=28 else '저소득층'
    if pg=='일반_실기':typ='실기'
   for j,s in enumerate(v[1:],1):
    if s!='?':continue
    patch={(8,26,8):'78.44',(14,30,1):'2.44'}.get((pn,ri,j)) if not reg else None
    if patch:v[j]=patch;continue
    a=im[r['y'][0]+2:r['y'][1]-2,rb[j]+2:rb[j+1]-4]
    assert float((a<110).mean())>=.2,(p['key'],pn,ri,j,s)
    v[j]='';suppressed+=1
   q,a,c=l[ci+1:ci+4];assert num(q) and num(a) and re.fullmatch(r'\d+\.\d+:1',c),(pn,ri,l)
   if abs(float(a)/float(q)-float(c[:-2]))>.011:issues.append([p['key'],pn,ri,'ratio',q,a,c])
   if reg:
    labels=['최초합격인원','최종등록인원','1차 충원','2차 충원','3차 충원','4차 충원','최종충원순위','충원률(%)'];scorelabels=['수능 반영총점','최초합격 수능 평균','최종등록 수능 평균','최종등록 수능 70%컷','최종등록 수능 최저','최종등록 수능 표준편차','최종등록 국어 백분위 평균','최종등록 수학 백분위 평균','최종등록 영어 등급 평균','최종등록 탐구2개 평균 백분위 평균'];cut=val(v[4]);metric='환산점수'
   elif typ=='실기':
    labels=['최초합격인원','최종등록인원']+[f'{i}차 충원' for i in range(1,6)]+['최종충원순위','충원률(%)'];scorelabels=[];cut='';metric=''
   else:
    labels=['최저충족률(%)','실질경쟁률','최초합격인원','최종등록인원']+[f'{i}차 충원' for i in range(1,6)]+['최종충원순위','충원률(%)']
    scorelabels=['1단계 학생부등급 최고','1단계 학생부등급 평균','1단계 학생부등급 최저','최초합격 학생부등급 최고','최초합격 학생부등급 평균','최초합격 학생부등급 최저']+(['최종등록 교과환산점수 평균','최종등록 교과환산점수 70%컷','최종등록 교과환산점수 표준편차'] if typ=='교과' else [])+['최종등록 학생부등급 평균','최종등록 학생부등급 70%컷','최종등록 학생부등급 최저','최종등록 학생부등급 표준편차']
    cut=val(v[-3]);metric='교과등급'
   assert len(labels)==len(l[ci+4:]),(pn,ri,len(labels),l)
   assert len(scorelabels)==max(0,len(v)-1)
   for lab,s in zip(scorelabels,v[1:]):
    assert not val(s) or num(s),(pn,ri,lab,s)
    if '학생부등급' in lab and val(s):assert 0<=float(s)<=9,(pn,ri,lab,s)
   out.append(row(p['key'],'충남대학교',2025,'정시' if reg else '수시',pg,unit,f'p.{pn} 이미지 표 데이터행{ri}',admission_type=typ,quota=q,applicants=a,competition_rate=c[:-2],fill_rate=val(l[-1]),cut_70=cut,cut_other=pairs(labels,l[ci+4:])+'; '+pairs(scorelabels,v[1:]),metric=metric,basis='최종등록자; 단계별 통계는 cut_other에 구분',grade_system='9' if metric=='교과등급' else '',note='draft; 재조사 보완; 확대 OCR·원본 숫자 글리프 대조 및 모집단위명 육안 검수; 충원순위는 충원인원과 구분; 사선 음영 성적 비공개와 대시는 공란'+('; 학생부 전학년 전교과 100%, 진로선택 환산점수 '+('포함' if typ=='교과' else '제외') if not reg and typ!='실기' else '; 실기 성적 미공개' if typ=='실기' and not reg else '; 면접고사를 제외한 수능환산점수')))
 assert not issues,issues
 (D/'transcription-check.json').write_text(json.dumps({'rows':len(out),'suppressed_cells':suppressed,'quota_applicant_ratio_issues':issues,'manual_numeric_patches':[{'page':8,'row':26,'right_column':8,'value':'78.44'},{'page':14,'row':30,'right_column':1,'value':'2.44'}],'note':'숫자 글리프 원본 대조, OCR 불일치 49셀 확대 대조; 원문 비공개 음영 검출; 앱 반영 전 독립 2인 검수 대기'},ensure_ascii=False,indent=2),encoding='utf8')
 save('cnu',[r for r in old if r['result_year']!='2025']+out)
if __name__=='__main__':main()
