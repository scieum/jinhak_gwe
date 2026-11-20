from normalize_chungcheong import *
D=CACHE/'kongju-counts'
def main():
 old=list(csv.DictReader((ROOT/'kongju.csv').open(encoding='utf-8-sig')))
 known={r['recruit_unit'] for r in old}
 names={'경영•금융교육과':'경영·금융교육과','기술•가정교육과':'기술·가정교육과','도시•교통공학과':'도시·교통공학과','문현정보교육과':'문헌정보교육과','미래자동자공학과':'미래자동차공학과','관광&영어통역융복합학..':'관광&영어통역융복합학과'}
 data=json.loads((D/'numeric-grid.json').read_text(encoding='utf8'));out=[]
 for p in data:
  for r in p['rows']:
   if 'numeric' not in r:continue
   unit=names.get(r['unit'],r['unit']);assert unit in known or unit in names.values(),unit
   q,comp,minimum,real,registered,fill=r['numeric'];m=re.fullmatch(r'(\d+)\((\d+)\)',q);assert m and re.fullmatch(r'\d+\.\d+:1',comp),(p,r)
   assert num(registered) and num(fill),(p,r)
   assert minimum in ['-','.'] and real in ['-','.'],(p['page'],r)
   out.append(row('kongju-results','국립공주대학교',r['year'],'수시','종합일반',unit,f'p.{p["page"]} 그래프 옆 수치표 y={r["y"]}',admission_type='종합',quota=m[1],competition_rate=comp[:-2],fill_count=fill,cut_other=f'최종등록인원 {registered}; 이월인원 {m[2]}',basis='모집·지원·최종등록·추가합격 현황',note='draft; 재조사 보완; 공식 그래프 옆 표의 숫자만 전사; OCR와 원본 숫자 이미지 대조; 성적 분포의 점 위치를 50/70%컷으로 추정하지 않음'))
 assert len(out)==254
 assert len({(r['result_year'],r['recruit_unit']) for r in out})==len(out)
 (D/'transcription-check.json').write_text(json.dumps({'rows':len(out),'units':len({r['recruit_unit'] for r in out}),'pages':'22~57 (20~21 자율전공 표에는 종합 없음)','review':'OCR 불일치 또는 낮은 일치도 123셀과 전형명 14곳 원본 이미지 대조; 모집단위명은 본문 수치표와 대조','limitations':'종합 일반 공개 인원·경쟁률만; 분포 그래프를 성적 수치로 변환하지 않음'},ensure_ascii=False,indent=2),encoding='utf8')
 save('kongju',[r for r in old if not (r['admission_type']=='종합' and '그래프 옆 수치표' in r['source_page'])]+out)
if __name__=='__main__':main()
