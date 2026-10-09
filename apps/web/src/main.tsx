import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { OrgThemeProvider } from '@/context/OrgThemeProvider';
import { ProfileProvider } from '@/hooks/useProfile';
import { ColorThemeProvider } from '@/context/ColorTheme';
import '@/i18n';
import App from './App';
import './styles/tailwind.css';
import './styles/global.css';
import './styles/landing.css';
import './index.css';
import './styles/color-theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ColorThemeProvider>
        <AuthProvider>
          <OrgThemeProvider>
            <ProfileProvider>
              <App />
            </ProfileProvider>
          </OrgThemeProvider>
        </AuthProvider>
      </ColorThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
