import { StrictMode } from 'react';
import axios, { AxiosError } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

function is401(error: AxiosError) {
  return error.response?.status === 401;
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (_, error) => {
        if (axios.isAxiosError(error)) {
          if (is401(error)) {
            return false;
          }
        }
        return true;
      },
    },
  },
});
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and ready to intercept requests.
  return worker.start();
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
});
