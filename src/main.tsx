import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// The mock API runs as a service worker in every environment, including production:
// it *is* this app's backend. It is loaded with a dynamic import so it stays out of the
// main bundle, and it is started before the first render so no request misses it.
async function startMockApi() {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD });
  // Readiness marker for E2E tests and debugging: requests from now on hit the mock API.
  document.documentElement.dataset.mockApi = 'ready';
}

startMockApi().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
