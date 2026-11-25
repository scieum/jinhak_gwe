import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

// design.md promo-banner(2026-11-24): 전형 성향 탐색으로 들어가는 배너. 학생 사이드바 아래는 닫기 가능(2026-11-25 사용자 결정: ✕ 한 번이면 이 기기에서 다시 안 보여요), 전형계획 목록은 닫기 없음(상시 진입점).
const HIDE_KEY = 'unavi.home-style-banner.hidden';
const readHidden = () => { try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; } };

export function PromoBanner({ closable = false, variant = 'band' }: { closable?: boolean; variant?: 'band' | 'sidebar' }) {
  const [hidden, setHidden] = useState(() => closable && readHidden());
  const [toast, setToast] = useState(false);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(false), 3000); return () => window.clearTimeout(t); }, [toast]);
  const close = () => {
    try { localStorage.setItem(HIDE_KEY, '1'); } catch { /* 저장소를 못 쓰면 이번만 숨겨요 */ }
    setHidden(true); setToast(true);
  };
  if (hidden) return toast ? <p role="status" className="toast">전형계획 목록에서 다시 볼 수 있어요</p> : null;
  return <div className={`promo-banner-wrap promo-banner-wrap--${variant}`}>
    <div className="promo-banner">
      <Link className="promo-banner-link" to="/admission-style" aria-label="나의 준비 방식 찾기, 길콩과 15문항 · 약 3분 · 가입 없이, 전형 성향 탐색으로 가요">
        <span className="promo-banner-text"><strong className="t-title">나의 준비 방식 찾기</strong><span className="t-body-sm">길콩과 15문항 · 약 3분 · 가입 없이</span></span>
        <img className="promo-banner-mascot" src={`${import.meta.env.BASE_URL}assets/admission-style/gilkong.png`} alt="" width={60} height={60} decoding="async" />
        {variant === 'band' && <Icon name="chevron-right" size={16} />}
      </Link>
      {closable && <button type="button" className="promo-banner-close" aria-label="배너 닫기, 이 기기에서 다시 보지 않아요" onClick={close}><Icon name="x" size={16} /></button>}
    </div>
  </div>;
}
