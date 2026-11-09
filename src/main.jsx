// Starts the app: React, the router, the language and server-health providers, and the styles.
// The service worker (offline start and updates) is registered by UpdatePrompt through vite-plugin-pwa.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LanguageProvider } from './i18n/t.js';
import { HealthProvider } from './api/health.js';
import { AuthProvider } from './auth/AuthProvider.jsx';
import { SyncProvider } from './sync/SyncProvider.jsx';
import { setClockPersistence } from './api/clock.js';
import { getAppValue, setAppValue } from './db/appDb.js';
import App from './App.jsx';
import TestBuildBanner from './components/TestBuildBanner.jsx';
import './index.css';
import { captureTokenAtStartup } from './lib/addressToken.js';

// An email link's token is taken out of the address before anything else runs (api.md).
captureTokenAtStartup();

// The server-corrected clock (api/clock.js) is saved, so signing is right straight after a restart.
getAppValue('clockOffsetMs').then((saved) => setClockPersistence((offset) => setAppValue('clockOffsetMs', offset), saved));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <HealthProvider>
          <AuthProvider>
            <SyncProvider>
              {__TEST_BUILD_BANNER__ && <TestBuildBanner />}
              <App />
            </SyncProvider>
          </AuthProvider>
        </HealthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
