"""Curated official-source university succession registry, as of 2026-11-24.

Institution succession is NOT a department/program equivalence or a score conversion.
Generate shared JSON for Python collection and TypeScript search, plus survey reports.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'app/src/data/universityIdentities.json'
HISTORY = 'https://law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=002801'
ROSTER = 'https://www.law.go.kr/LSW/flDownload.do?bylClsCd=110201&flSeq=161877141&gubun='
MOE26 = 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105413&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W'
GK26 = 'https://ipsi.gknu.ac.kr/data/mojib/20250529165017683811b9384be.pdf'
MK26 = 'https://ipsi.mokpo.ac.kr/sites/ipsi/atchmnfl/pdfView/6/temp_1750313756781100.pdf'
KONGJU = 'https://education.kongju.ac.kr/bbs/ZA0330/1141/632870/download.do'


def build():
    events = []

    def event(key, when, before, after, detail, source=HISTORY, kind='merger', status='effective'):
        events.append(dict(id=key, effective_date=when, predecessors=before.split('|'), successor=after,
                           type=kind, status=status, detail=detail, source_url=source))

    event('kongju-yesan-1992', '1992-03-01', '공주대학교|예산농업전문대학', '국립공주대학교', '산업대학으로 통합; 예산 계열. 현재 입결의 미표기 캠퍼스를 임의 분리하지 않음.', KONGJU)
    event('pknu-1996', '1996-07-06', '부산수산대학교|부산공업대학교', '국립부경대학교', '통합 당시 부경대학교; 대연·용당 계열.', 'https://www.pknu.ac.kr/main/219')
    event('kongju-culture-2001', '2001-03-02', '공주대학교|공주문화대학', '국립공주대학교', '영상보건대학 통합; 2009년 신관 이전. 과거 옥룡 소재를 현재 캠퍼스로 자동 지정하지 않음.', KONGJU)
    event('kongju-cheonan-2005', '2005-03-01', '공주대학교|천안공업대학', '국립공주대학교', '천안캠퍼스 계열.', KONGJU)
    for key, before, after, detail in [
        ('pusan-miryang-2006','부산대학교|밀양대학교','부산대학교','밀양 계열. 대학명만 있는 결과를 부산·밀양으로 추정 분할하지 않음.'),
        ('jnu-yeosu-2006','전남대학교|여수대학교','전남대학교','여수 계열. 기존 여수 캠퍼스 표시 유지.'),
        ('kangwon-samcheok-2006','강원대학교|삼척대학교','강원대학교','삼척 계열. 입결에 명시된 삼척·도계 위치 구분 유지.'),
        ('ut-jeungpyeong-2006','충주대학교|청주과학대학','국립한국교통대학교','통합 당시 충주대학교. 증평 계열; 충주·증평 공통 자료는 공동 표기 유지.'),
    ]:
        event(key, '2006-03-01', before, after, detail)
    event('gangneung-wonju-2007', '2007-03-01', '강릉대학교|원주대학', '강원대학교', '통합 시행은 2007년, 강릉원주대 교명 변경은 2009년. 두 사건을 구분.')
    event('sungshin-nmc-2007', '2007-03-01', '성신여자대학교|국립의료원간호대학', '성신여자대학교', '국립 전문대의 사립대 승계 사례. 성신여대 전체를 국립대로 분류하지 않음.', 'https://www.sungshin.ac.kr/nursing/14804/subview.do')
    for key, before, after, detail in [
        ('knu-sangju-2008','경북대학교|상주대학교','경북대학교','상주 계열. 대구·상주 공통 결과는 미분리.'),
        ('jbnu-iksan-2008','전북대학교|익산대학','전북대학교','익산 계열. 결과 행에 없는 캠퍼스는 추정하지 않음.'),
        ('jejunu-edu-2008','제주대학교|제주교육대학교','제주대학교','교육대학 승계. 일반 모집단위와 초등교육 결과를 합산하지 않음.'),
    ]:
        event(key, '2008-03-01', before, after, detail)
    event('gwnu-rename-2009', '2009-03-01', '강릉대학교', '강릉원주대학교', '2007년 통합 이후 교명 변경; 추가 통합 사건이 아님.', kind='rename')
    event('kaist-icu-2009', '2009-03-01', '한국과학기술원|한국정보통신대학교', '한국과학기술원(KAIST)', '특별법 기관 관련 통합. 과거 ICU를 독립 현행 대학으로 표시하지 않음.', 'https://kaist.ac.kr/kr/html/footer/0814.html?file_id=29554&mode=D&no=db2e2a43f706004e326f8f777481fba7')
    event('inu-2010', '2010-03-01', '인천대학교|인천전문대학', '인천대학교', '통합 당시 공립; 국립대학법인 전환과 통합 시점을 구분.', 'https://www.korea.kr/briefing/pressReleaseView.do?newsId=155415992')
    event('ut-rail-2012', '2012-03-01', '충주대학교|한국철도대학', '국립한국교통대학교', '통합 당시 한국교통대학교. 의왕 계열 및 충주·증평 공통 구분 유지.')
    event('gnu-2021', '2021-03-01', '경상대학교|경남과학기술대학교', '경상국립대학교', '현재 교명은 이미 수집 데이터에 반영됨. 캠퍼스 미표기는 그대로 둠.')
    event('hknu-2023', '2023-03-01', '한경대학교|한국복지대학교', '한경국립대학교', '안성·평택 구분 유지. 일반 대학명 행을 임의로 안성에 넣지 않음.')
    event('gknu-2025', '2025-03-01', '국립안동대학교|경북도립대학교', '국립경국대학교', '안동·예천 계열. 모집요강과 결과 학년도 기준으로 확인한 모집단위만 캠퍼스 분리.')
    event('kangwon-2026', '2026-03-01', '강원대학교|국립강릉원주대학교', '강원대학교', '구 강릉원주대 강릉·원주 입결을 강원대의 해당 캠퍼스로 연결. 재학생 경과조치는 별도.', MOE26)
    event('mokpo-2026', '2026-03-01', '국립목포대학교|전남도립대학교', '국립목포대학교', '담양캠퍼스 승계. 학사와 전문학사 과정 구분.', MOE26)
    event('changwon-2026', '2026-03-01', '국립창원대학교|경남도립거창대학|경남도립남해대학', '국립창원대학교', '거창·남해캠퍼스 승계. 캠퍼스·학위과정 확인 없는 입결을 기존 창원 자료에 복제하지 않음.', MOE26)
    rename13 = ['강릉원주','공주','군산','금오공과','목포','목포해양','부경','순천','안동','창원','한국교통','한국해양','한밭']
    for name in rename13:
        event('national-prefix-' + name, '2023-11-16', name+'대학교', '국립'+name+'대학교', '국립 접두어를 공식 교명에 반영한 변경. 통합과 구별.', kind='rename')
    event('seoultech-2010', '2010-09-01', '서울산업대학교', '서울과학기술대학교', '교명 변경; 통합 아님.', kind='rename')
    event('gntech-2010', '2010-09-01', '진주산업대학교', '경남과학기술대학교', '교명 변경 후 2021년 경상국립대 통합.', kind='rename')
    event('ginue-2003', '2003-03-01', '인천교육대학교', '경인교육대학교', '교명·교육시설 확대 개편; 대학 간 통합 아님.', kind='rename')
    event('pusan-bnue-2027', '2027-03-01', '부산대학교|부산교육대학교', '부산대학교', '승인된 통합 예정. 기준일에는 부산교대 유지; 2027년 연제캠퍼스 예정으로만 기록.', 'https://www.pusan.ac.kr/kor/CMS/Board/Board.do?board_seq=1503018&mCode=MN114&mgr_seq=16&mode=view&page=33', status='approved_future')
    event('chungbuk-ut-pending', None, '충북대학교|국립한국교통대학교', '', '현재 별도 대학. 추진 목표를 시행 완료로 바꾸지 않음; 확정 시행일 미반영.', 'https://press.chungbuk.ac.kr/ktimes/index.php?m=pc', status='not_effective')
    event('mokpo-scnu-pending', None, '국립목포대학교|국립순천대학교', '', '협의 중인 별도 통합안. 전남도립대 통합과 혼동하지 않음.', 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?mi=5470&nttSn=281321525', status='not_effective')
    event('cnu-kongju-pending', None, '충남대학교|국립공주대학교', '', '통합 추진 자료만 확인; 현재 대학명 유지.', 'https://www.kongju.ac.kr/bbs/KNU/2300/649787/download.do', status='not_effective')
    event('cnu-hanbat-pending', None, '충남대학교|국립한밭대학교', '', '과거 추진안으로 현행 통합 처리하지 않음. 현행 설치령에 별도 대학.', ROSTER, status='not_effective')

    # One exact current label per record. Broad aliases are SEARCH ONLY.
    identities = []
    def identity(name, aliases=(), event_ids=(), campus='', since=None):
        identities.append(dict(current_name=name, aliases=list(dict.fromkeys([name, *aliases])),
                               event_ids=list(event_ids), campus=campus, effective_date=since))
    for campus in ['춘천','삼척','도계','강릉','원주']:
        aliases = [f'강원대({campus})', f'강원대학교 {campus}캠퍼스', f'강원대학교({campus}캠퍼스)']
        ids = []
        if campus in ['강릉','원주']:
            aliases += [f'{base}({campus})' for base in ['강릉원주대','강릉원주대학교','국립강릉원주대학교']]
            ids = ['kangwon-2026']
        identity(f'강원대학교({campus})', aliases, ids, campus, '2026-03-01' if ids else None)
    identity('강원대학교', ['강원대'], ['kangwon-samcheok-2006','kangwon-2026'])
    for name in rename13:
        if name in ['강릉원주','안동']: continue
        identity('국립'+name+'대학교', [name+'대학교', name+'대', '국립'+name+'대'], ['national-prefix-'+name])
    for name, aliases, ids in [
        ('국립경국대학교',['경국대학교','경국대','국립경국대','국립안동대학교','안동대학교','안동대','국립안동대'],['gknu-2025']),
        ('경상국립대학교',['경상국립대','경상대학교','경상대','경남과학기술대학교','경남과기대','진주산업대학교'],['gnu-2021']),
        ('한경국립대학교',['한경국립대','한경대학교','한경대'],['hknu-2023']),
        ('서울과학기술대학교',['서울과기대','서울과학기술대','서울산업대학교','서울산업대'],['seoultech-2010']),
        ('서울대학교',['서울대'],[]), ('서울시립대학교',['서울시립대'],[]),
        ('충북대학교',['충북대'],[]), ('서울교육대학교',['서울교대','서울교육대'],[]),
        ('부산교육대학교',['부산교대','부산교육대'],[]),
    ]: identity(name, aliases, ids)
    for name, campuses in [('국립경국대학교',['안동','예천']),('국립목포대학교',['담양']),
                           ('국립창원대학교',['거창','남해']),('한경국립대학교',['안성','평택'])]:
        for campus in campuses: identity(f'{name}({campus})', [f'{name} {campus}캠퍼스', f'{name}({campus}캠퍼스)'], campus=campus)
    for campus in ['의왕','충주·증평','통합']:
        identity(f'국립한국교통대학교({campus})', [f'한국교통대학교({campus})',f'한국교통대({campus})'], campus=campus)

    # These broad search aliases must NOT resolve an unqualified label to one campus.
    search_groups = [
        dict(current_prefix='강원대학교', aliases=['강릉원주대','강릉원주대학교','국립강릉원주대학교','강릉대학교','원주대학'], campuses=['강릉','원주']),
        dict(current_prefix='강원대학교', aliases=['삼척대학교','삼척대'], campuses=['삼척','도계']),
        dict(current_prefix='국립경국대학교', aliases=['안동대학교','국립안동대학교','안동대','경북도립대학교','경북도립대']),
        dict(current_prefix='국립목포대학교', aliases=['목포대학교','목포대','전남도립대학교','전남도립대']),
        dict(current_prefix='국립창원대학교', aliases=['창원대학교','창원대','경남도립거창대학','경남도립남해대학']),
        dict(current_prefix='한경국립대학교', aliases=['한경대학교','한경대','한국복지대학교','한국복지대']),
        dict(current_prefix='국립공주대학교', aliases=['공주대학교','공주대','예산농업전문대학','공주문화대학','천안공업대학']),
        dict(current_prefix='국립부경대학교', aliases=['부경대학교','부경대','부산수산대학교','부산공업대학교']),
        dict(current_prefix='부산대학교', aliases=['밀양대학교','밀양대']),
        dict(current_prefix='경북대학교', aliases=['상주대학교','상주대']),
        dict(current_prefix='전남대학교', aliases=['여수대학교','여수대']),
        dict(current_prefix='전북대학교', aliases=['익산대학']),
        dict(current_prefix='제주대학교', aliases=['제주교육대학교','제주교대']),
        dict(current_prefix='국립한국교통대학교', aliases=['충주대학교','충주대','청주과학대학','한국철도대학','한국교통대학교','한국교통대']),
        dict(current_prefix='경인교육대학교', aliases=['인천교육대학교','인천교대']),
        dict(current_prefix='인천대학교', aliases=['인천전문대학']),
        dict(current_prefix='성신여', aliases=['국립의료원간호대학']),
        dict(current_prefix='한국과학기술원', aliases=['한국정보통신대학교','ICU','KAIST']),
    ]

    # No fuzzy matching: only explicit year/unit combinations checked against official tables.
    campus_rules = [
        dict(university='국립경국대학교', years=['2026'], units=['공공수요인재대학','동물생명공학과','모빌리티디자인공학과','소방방재학과','응급구조학과','경기지도학과'], current_name='국립경국대학교(예천)', source_url=GK26, source_page='PDF p.15'),
        dict(university='국립목포대학교', years=['2026'], units=['스마트모빌리티학부','예술크리에이티브학부','농수산식품학부','스마트해양·에너지학부','외식조리제빵과','토목환경과(야)'], current_name='국립목포대학교(담양)', source_url=MK26, source_page='PDF p.4~5; 결과표의 (담양) 표시 대조'),
    ]
    associate = dict(university='국립목포대학교', years=['2026'], units=['농수산식품학부','스마트해양·에너지학부','외식조리제빵과','토목환경과(야)'], source_url=MK26, source_page='PDF p.5 전문학사(2년제); 입학처 결과표 미래챌린지대학(전문학사-2년제)')
    roster = ['강원대학교','경북대학교','경상국립대학교','국립공주대학교','국립군산대학교','국립금오공과대학교','국립목포대학교','국립목포해양대학교','국립부경대학교','부산대학교','서울과학기술대학교','국립순천대학교','국립경국대학교','전남대학교','전북대학교','제주대학교','국립창원대학교','충남대학교','충북대학교','한경국립대학교','국립한국교통대학교','한국체육대학교','국립한국해양대학교','국립한밭대학교','공주교육대학교','광주교육대학교','대구교육대학교','부산교육대학교','서울교육대학교','경인교육대학교','전주교육대학교','진주교육대학교','청주교육대학교','춘천교육대학교','한국교원대학교','서울대학교','인천대학교','서울시립대학교']
    registry = dict(format='university-identity-registry', version=1, as_of='2026-11-24',
                    scope='현재 수집 범위의 국공립 일반대·교육대 38개교 명단과 1990년 이후 통폐합·교명 이력. 특별법 기관 관련 KAIST 사례 및 국립→사립 승계 포함. 모든 학과의 승계 동일성을 뜻하지 않음.',
                    roster=roster, roster_source_url=ROSTER, events=events, identities=identities,
                    search_groups=search_groups, campus_rules=campus_rules, associate_rules=[associate])
    OUT.write_text(json.dumps(registry, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'{len(events)} events; {len(identities)} exact identities; {len(roster)} roster institutions')


if __name__ == '__main__': build()
