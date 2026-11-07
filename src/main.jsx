// Starts the app: React, the router, the language and server-health providers, and the styles.
// The service worker (offline start and updates) is registered by UpdatePrompt through vite-plugin-pwa.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LanguageProvider } from './i18n/t.js';
import { HealthProvider } from './api/health.js';
import { AuthProvider } from './auth/AuthProvider.jsx';
import App from './App.jsx';
import './index.css';
import { captureTokenAtStartup } from './lib/addressToken.js';

// An email link's token is taken out of the address before anything else runs (api.md).
captureTokenAtStartup();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <HealthProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </HealthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
