import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/base.css';
import './components/components.css';
import { App } from './App';
import { initSample } from './data/sample';

// 처음 연 기기에는 샘플 데이터를 먼저 넣고 그려요(실패해도 앱은 빈 상태로 열려요).
void initSample().catch(() => { /* 저장소를 못 쓰면 샘플 없이 */ }).finally(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
));

// PWA: 배포본에서만 서비스 워커를 켜요(개발 서버에서는 캐시 때문에 고친 내용이 안 보일 수 있어서 끔).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* 설치 실패해도 앱은 그대로 써요 */ }); });
}
