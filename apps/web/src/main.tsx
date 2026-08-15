import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { OrgThemeProvider } from '@/context/OrgThemeProvider';
import { ProfileProvider } from '@/hooks/useProfile';
import '@/i18n';
import App from './App';
import './styles/tailwind.css';
import './styles/global.css';
import './styles/landing.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OrgThemeProvider>
          <ProfileProvider>
            <App />
          </ProfileProvider>
        </OrgThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
