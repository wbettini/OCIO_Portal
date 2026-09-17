import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme, type Theme } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { PersonaProvider } from './context/PersonaContext';
import { App } from './App';
import './index.css';

/** Executive brand ramp — see docs/style-guide.md. Only the brand tokens are
 * overridden; everything else flows from Fluent's webLightTheme. */
const theme: Theme = {
  ...webLightTheme,
  colorBrandBackground: '#0b3a67',
  colorBrandBackgroundHover: '#0a2c50',
  colorBrandBackgroundPressed: '#08223f',
  colorBrandForeground1: '#0b3a67',
  colorBrandForeground2: '#0a2c50',
  colorBrandForegroundOnLight: '#0b3a67',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <FluentProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PersonaProvider>
            <App />
          </PersonaProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </FluentProvider>
  </StrictMode>,
);
