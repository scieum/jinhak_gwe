from pathlib import Path
import json
P=Path(__file__).parent
jobs={
'dcu-2025-jeongsi':'https://ibsi.cu.ac.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000000004031&fileSn=0',
'dcu-2024-jeongsi':'https://ibsi.cu.ac.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000000003733&fileSn=0',
'dcu-2024-susi-post':'https://ibsi.cu.ac.kr/kor/BBSMSTR_000000000001/13565/view.do',
'daegu-2024-jeongsi':'https://ipsi.daegu.ac.kr/attach/82c6731783ae4794e63f8fbe1bf57037/13055e35ba7465cb478c5b4be490c5a8',
'daegu-2026-jeongsi':'https://ipsi.daegu.ac.kr/attach/70e63a34c32f723ea296a5480bdf9dcd/778bdbf5db9ced7c8fd52756c00bf0cd',
'daegu-2025-jeongsi-post':'https://ipsi.daegu.ac.kr/kor/article/ATCL22/17626',
'yu-2026-susi-post':'https://enter.yu.ac.kr/10000023?mode=view&bbs_seq=1223&categorycode=8',
'yu-2026-jeongsi-post':'https://enter.yu.ac.kr/10000023?mode=view&bbs_seq=1224&categorycode=9',
'dnue-toast':'https://webbook.dnue.ac.kr/viewer/toast/toast.js',
'knu-2026-pdf':'https://ipsi1.knu.ac.kr/_common/new_download_file.php?menu=boardfile&file_no=5127'
}
(P/'batch12.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
