from pathlib import Path
import csv,json
P=Path(__file__).parent
def write(name,rows):
 with (P/name).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,list(rows[0]));w.writeheader();w.writerows(rows)
gaps=[]
def gap(u,y,scope,state,detail,source):gaps.append(dict(university=u,result_year=y,scope=scope,status=state,detail=detail,source_url=source))
gap('제주국제대학교','2026','수시·정시','결과 미존재 표시','공식 어디가 표에서 전형별 성적 전부 입시 결과 미존재; 0등급으로 기록하지 않음','https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=0000248&searchSyr=2027')
gap('제주국제대학교','2025','체육학부 외 학과별 수시·정시','일부 미공개','소수 인원 전형별 합산과 체육학부(주·야)만 확인; 합산을 학과로 복제하지 않음','https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=0000248&searchSyr=2026')
gap('제주국제대학교','2024~2026','입학처 원문 직접 저장','일부 접근 실패','입학처 TLS 연결 오류. 웹 도구로 2024 수시 PDF 확인·전사, 이후 입학처 게시판 최신 결과 없음','https://apply.jeju.ac.kr/admission/rolling/result.htm')
gap('인하대학교','2024~2026','실기·체육특기·평생학습·재직자 등','추가 확인 필요','입학처와 어디가 보충 후에도 모든 모집전형 완전 수록 아님; 기존 _sources-kookmin-inha.md 미확보 목록 중 이번 보완 외 항목','https://admission.inha.ac.kr/index.do')
gap('인천가톨릭대학교(송도)','2025','ICCU미래인재 학과 대응','원문 위치 불일치 검토','경쟁률 표 조형예술 위치와 성적 표 문화콘텐츠 위치를 원문대로 별도 보존','https://admission.iccu.ac.kr/bbs/board.php?bo_table=result&wr_id=27')
gap('인천대학교·인천가톨릭대학교(송도)·안양대학교(강화)','2024~2026','입학처에 없는 50%·70%컷 및 특별전형','추가 확인 필요','현재 입학처가 공개한 평균·순위 중심 자료를 수록; 어디가의 모든 추가 지표를 전수 대조한 것은 아님','')
gap('연세대학교(국제)','2024~2026','국제캠퍼스 독립 모집 결과','중복 검토 필요','기존 서울 본교 자료 참조; 송도 수학 여부로 통계 복제 안 함','https://admission.yonsei.ac.kr/seoul/')
for u in ['한국뉴욕주립대학교(SBU)','한국뉴욕주립대학교(FIT)','한국조지메이슨대학교','겐트대학교 글로벌캠퍼스','유타대학교 아시아캠퍼스']:
 gap(u,'2024~2026','외국교육기관 합격자 통계','별도 미조사','국내 수시·정시 교과등급과 선발 체계가 달라 별도 조사 대상으로 남김','https://www.incheon.go.kr/infohub/HUB050201')
gap('한국방송통신대학교(인천·제주 지역대학)','2024~2026','지역대학 독립 모집 입결','별도 확인 필요','지역별 독립 통계 여부를 확인하지 못함; 전국 공통 자료 복제 안 함','')
write('_incheon-jeju-gaps.csv',gaps)
rs=list(csv.DictReader((P/'_incheon-jeju.csv').open(encoding='utf-8-sig')));review=[]
for r in rs:
 reasons=[]
 if r['metric']=='교과등급' and r['cut_50'] and r['cut_70']:
  try:
   if float(r['cut_50'])>float(r['cut_70']):reasons.append('교과50%가70%보다 큼; 정렬 기준·원문 확인, 숫자 유지')
  except ValueError:reasons.append('숫자 이외 컷 표기')
 if r['university']=='제주국제대학교' and r['result_year']=='2025' and r['round']=='정시':reasons.append('총점과 괄호 안 수능점수 혼합 표기; cut_other 보존')
 if r['university']=='인천가톨릭대' and r['result_year']=='2025' and 'ICCU' in r['program']:reasons.append('학과별 경쟁률·성적 표의 위치 불일치 가능성')
 if reasons:review.append({k:r[k] for k in ['university','result_year','round','program','recruit_unit','cut_50','cut_70','source_url','source_page']}|{'review_reason':'; '.join(reasons)})
write('_incheon-jeju-review.csv',review)
print(json.dumps({'regional_rows':len(rs),'gaps':len(gaps),'review_rows':len(review)},ensure_ascii=False))
