/** Existing select + condition-row pattern, shared by collected and reviewed views. */
export function TrackDepartmentFilter({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  if (!options.length && !value) return null;
  return <label className="st-row st-department-filter"><span className="t-label">세부 학과</span>
    <select className="text-input" aria-label="세부 학과" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">전체 학과</option>
      {value && !options.includes(value) && <option value={value}>{value} (현재 자료 없음)</option>}
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>;
}
