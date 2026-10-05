import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppStoreProvider } from './state/AppStore';
import { isPreviewBuild } from './services/install';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </StrictMode>,
);

// Service worker apenas na versão final (build), para funcionar sem internet.
if (import.meta.env.PROD && !isPreviewBuild() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sem modo offline; o app continua funcionando online */
    });
  });
}
