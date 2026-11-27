import { httpsUrl, RESULT_COLUMNS, rowIssues, type ResultRow } from '../domain/resultReview';
import { susiIssues, susiIssueText } from '../domain/susiResults';
import { InterestButton } from './InterestButton';

const LABELS = ['대학', '학년도', '모집시기', '전형 유형', '전형', '모집단위', '모집인원', '지원자 수', '경쟁률', '충원 인원', '충원율', '50% 컷', '70% 컷', '그 밖의 지표', '지표 종류', '산출 기준', '등급제', '원문 주소', '쪽수·표 이름', '비고'];

/** Original strings and all provenance fields, shared by the browser and coordinate board. */
export function CollectedResultFields({ row, heart = true }: { row: ResultRow; heart?: boolean }) {
  return <>
      {/* 2026-11-26 사용자 요청: 전형을 보는 곳 어디서든 하트로 담으면 될각에서 바로 비교해요(이 원문 상세는 수시 입결 · 전국 배치표 · 수집 목록 · 관심 비교가 같이 써요) */}
      {heart && row.round === '수시' && <InterestButton university={row.university} program={row.program} department={row.recruit_unit || undefined} />}
      <p className="notice">검수 전 참고자료 · 대학 공식 원문을 확인해 주세요.</p>
      {susiIssues(row).map(code => <p className="notice" key={code}>확인 필요: {susiIssueText(code)}</p>)}
      {[...rowIssues(row).errors, ...rowIssues(row).warnings].map((issue, i) => <p className="error-note" key={i}>확인 필요: {issue}</p>)}
      <div className="table-scroll"><table className="data-table"><tbody>{RESULT_COLUMNS.map((column, i) => <tr key={column}>
        <th scope="row" style={{ minWidth: 96, whiteSpace: 'nowrap' }}>{LABELS[i]}</th><td style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{column === 'source_url' && httpsUrl(row[column])
          ? <a className="t-link" href={row[column]} target="_blank" rel="noreferrer">{row[column]} ↗</a> : row[column] || '—'}</td>
      </tr>)}</tbody></table></div>
  </>;
}
