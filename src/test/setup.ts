import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { resetChaos, setChaos } from '../mocks/chaos';
import { server } from '../mocks/server';

// --- jsdom gaps -------------------------------------------------------------------------
// jsdom does no layout, so give elements a size; otherwise the virtualizer renders no rows.
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get: () => 600 },
  offsetWidth: { configurable: true, get: () => 1200 },
  clientHeight: { configurable: true, get: () => 600 },
});
Element.prototype.scrollTo = function scrollTo(this: Element, arg?: ScrollToOptions | number) {
  if (typeof arg === 'object' && arg.top !== undefined) this.scrollTop = arg.top;
};
// Minimal <dialog> support. The real focus trap, inert background and Esc behaviour are
// verified in a real browser by the Playwright tests.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
};

// --- Mock API -----------------------------------------------------------------------------
// Tests start with an instant, reliable API; individual tests opt into latency and failures.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => setChaos({ minLatencyMs: 0, maxLatencyMs: 0, failureRate: 0 }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetChaos();
  sessionStorage.clear();
});
afterAll(() => server.close());
