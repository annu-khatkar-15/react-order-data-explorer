import { QueryClientProvider } from '@tanstack/react-query';
import { Component, useState, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import OrderDrawer from './features/detail/OrderDrawer';
import ExplorerPage from './features/explorer/ExplorerPage';
import { createQueryClient } from './queryClient';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ExplorerPage />}>
        <Route path="orders/:orderId" element={<OrderDrawer />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  const [queryClient] = useState(() => createQueryClient());
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <main className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">This address doesn’t match any page.</p>
      <Link to="/" className="mt-4 inline-block text-indigo-700 underline">
        Go to the order explorer
      </Link>
    </main>
  );
}

/** Last line of defence: a render bug shows a recoverable message instead of a blank page. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main role="alert" className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-600">{this.state.error.message}</p>
        <button
          type="button"
          className="mt-4 text-indigo-700 underline"
          onClick={() => window.location.reload()}
        >
          Reload the page
        </button>
      </main>
    );
  }
}
