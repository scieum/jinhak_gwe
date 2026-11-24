"""Create review-only historical links; a shared label never proves continuity."""
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'work/_data/admission-plans/structured'
RESULTS=ROOT/'app/public/data/collected-results'
TYPE_LABELS={
    '학생부교과':'교과',
    '학생부종합':'종합',
    '실기/실적':'실기',
    '특기자':'실기',
    '실적':'실기',
    '수능실기':'수능',
    '학생부교과·실기':'교과/실기',
}


def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def norm(text):return re.sub(r'\s+','',text or '')
def admission_type(text):
    value=norm(text)
    return TYPE_LABELS.get(value,value)


def program_label(text):
    text=norm(text)
    text=re.sub(r'^(수시|정시)(?=[가-힣])', '', text)
    text=re.sub(r'\((?:학생부교과|학생부종합)[^)]*\)$', '', text)
    text=re.sub(r'^(학생부교과|학생부종합|실기/실적|수능)\(', '', text)
    text=re.sub(r'\([가나다]군[^)]*\)', '', text)
    text=text.rstrip(')')
    return text.removesuffix('전형')


def build():
    out=DATA/'result-links';out.mkdir(exist_ok=True)
    summaries=[];csvrows=[];unique_source_rows=set();source_usage={}
    for path in sorted((DATA/'universities').glob('*.json')):
        pkg=read(path);rows=[];sources=[]
        for item in pkg['historical_results'].get('entries',[]):
            file=RESULTS/item['file']
            assert hashlib.sha256(file.read_bytes()).hexdigest()==item['sha256']
            packed=read(file)
            assert packed['format']=='jinhak-navi-collected-results' and packed['version']==1
            assert len(packed['rows'])==item['rows']
            usage=source_usage.setdefault(item['file'],{'file':item['file'],'sha256':item['sha256'],'rows':item['rows'],'package_ids':[]})
            assert usage['sha256']==item['sha256'] and usage['rows']==item['rows']
            usage['package_ids'].append(pkg['university_id'])
            for i,encoded in enumerate(packed['rows']):
                assert len(encoded)==len(packed['columns'])
                row={k:packed['strings'][v] for k,v in zip(packed['columns'],encoded)}
                row['reference']={'file':item['file'],'file_sha256':item['sha256'],'row_index':i,
                                  'university_label':item['university']}
                unique_source_rows.add((item['sha256'],i))
                rows.append(row)
            sources.append({'university_label':item['university'],'file':item['file'],'sha256':item['sha256']})
        unit_index={}
        for row in rows:unit_index.setdefault(norm(row['recruit_unit']),[]).append(row)
        unit_links=[];pair_links=[]
        for unit in pkg['recruit_units']:
            excluded_reason=unit.get('historical_matching_disabled_reason')
            labels=[] if excluded_reason else [('canonical_name',unit['name'])]
            if not excluded_reason and unit.get('source_name') and norm(unit['source_name'])!=norm(unit['name']):
                labels.append(('explicit_source_name',unit['source_name']))
            allowed_sources=unit.get('historical_source_labels')
            label_hits=[(basis,label,[r for r in unit_index.get(norm(label),[])
                if allowed_sources is None or r['reference']['university_label'] in allowed_sources])
                for basis,label in labels]
            hits=[r for _,_,matches in label_hits for r in matches]
            matched_labels=[{'basis':basis,'label':label} for basis,label,matches in label_hits if matches]
            unit_links.append({'unit_id':unit['id'],'unit_name':unit['name'],
                'status':'explicit_scope_excluded' if excluded_reason else 'same_label_candidate' if hits else 'no_exact_label_candidate',
                'excluded_reason':excluded_reason,'allowed_source_labels':allowed_sources,
                'matched_labels':matched_labels,
                'years':sorted({r['result_year'] for r in hits}),'historical_rows':len(hits),
                'confirmed_continuity':False})
            for program in pkg['programs']:
                if unit['id'] not in program['recruit_unit_ids']:continue
                # Explicit source labels are permitted; renamed or cross-round links are not inferred.
                same_round=[r for r in hits if r['round']==program['round']]
                category=admission_type(program['type'])
                same_program=[r for r in same_round if category and admission_type(r['admission_type'])==category and
                              program_label(r['program'])==program_label(program['name'])]
                refs=[{**r['reference'],'result_year':r['result_year'],'program_raw':r['program'],
                    'admission_type_raw':r['admission_type'],'unit_raw':r['recruit_unit'],
                    'metric':r['metric'],'basis':r['basis'],'grade_system':r['grade_system'],
                    'cut_50':r['cut_50'],'cut_70':r['cut_70'],'cut_other':r['cut_other'],
                    'source_url':r['source_url'],'source_page':r['source_page'],'note':r['note']} for r in same_program]
                status='explicit_scope_excluded' if excluded_reason else 'same_label_candidate' if refs else 'unit_label_only' if same_round else 'no_exact_label_candidate'
                pair={'program_id':program['id'],'program_name':program['name'],'unit_id':unit['id'],'unit_name':unit['name'],
                    'unit_matched_labels':matched_labels,
                    'status':status,'historical_rows':refs,'review_status':'draft','confirmed_continuity':False,
                    'excluded_reason':excluded_reason,
                    'calculation_enabled':False,'comparison_status':'requires_year_specific_method_and_reorganization_review',
                    'group_matching':'not_verified' if program['round']=='정시' else 'not_applicable'}
                pair['program_annotation_review_required']=any('학생부' in r['program'] and ',' in r['program'] for r in same_program)
                pair_links.append(pair)
                csvrows.append({'university_id':pkg['university_id'],'university':pkg['university'],'campus':pkg['campus'],
                    'program_id':program['id'],'program':program['name'],'unit_id':unit['id'],'unit':unit['name'],
                    'status':status,'candidate_rows':len(refs),'years':','.join(sorted({r['result_year'] for r in refs})),
                    'continuity_confirmed':False})
        report={'format':'admission-result-link-candidates','version':1,'university_id':pkg['university_id'],
            'package_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'review_status':'draft','calculation_enabled':False,
            'matching_policy':'Whitespace-only normalization of canonical unit name and explicitly preserved source_name; matched label basis retained. Explicit unit-scope exclusions suppress all automatic candidates. Program round prefix, category wrapper/annotation and suffix removed for label comparison only; round and standardized program type must match. Original program type and annotations retained for review. No inferred renamed-unit aliases.',
            'limitation':'Same names are review candidates only. Explicit per-unit historical source labels restrict campus matching. Group, eligibility, score basis and department changes remain unverified.',
            'sources':sources,'unit_links':unit_links,'program_unit_links':pair_links}
        (out/path.name).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        summaries.append({'id':pkg['university_id'],'historical_rows_read':len(rows),'units':len(unit_links),
            'units_with_label_candidate':sum(x['historical_rows']>0 for x in unit_links),
            'pair_statuses':dict(Counter(x['status'] for x in pair_links))})
    (out/'summary.json').write_text(json.dumps(summaries,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    rollup={'package_count':len(summaries),'historical_rows_read_across_packages':sum(x['historical_rows_read'] for x in summaries),
        'unique_historical_source_rows':len(unique_source_rows),'source_row_identity':'SHA-256 of immutable packed source file plus row index',
        'units_with_label_candidate':sum(x['units_with_label_candidate'] for x in summaries),
        'program_unit_label_candidates':sum(x['pair_statuses'].get('same_label_candidate',0) for x in summaries),
        'confirmed_continuity':0,'calculation_enabled':False,'source_usage':list(source_usage.values())}
    (out/'rollup.json').write_text(json.dumps(rollup,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if csvrows:
        with (out/'review.csv').open('w',encoding='utf-8-sig',newline='') as f:
            w=csv.DictWriter(f,fieldnames=list(csvrows[0]));w.writeheader();w.writerows(csvrows)
    print(json.dumps(summaries,ensure_ascii=True))


if __name__=='__main__':build()
