import { useNavigate } from 'react-router-dom';
import { SegmentedControl } from '../components/SegmentedControl';
import { MODE_HOME, type Mode } from './nav';
import { leaveTeacher } from './workspace';

// mode-switch: 학생 · 교사. 교사 잠금(lock-screen)은 아직 없다.
export function ModeSwitch({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  return (
    <SegmentedControl
      label="모드 전환"
      options={[
        { value: 'student', label: '학생' },
        { value: 'teacher', label: '교사' },
      ]}
      value={mode}
      onChange={(m) => { if (m === 'student') leaveTeacher(); navigate(MODE_HOME[m as Mode]); }}
    />
  );
}
