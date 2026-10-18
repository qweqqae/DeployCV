import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getStartParam, initTelegramApp } from './lib/telegram';
import { LocaleProvider } from './lib/locale';
import { Web3Background } from './components/Web3Background';
import { Home } from './pages/Home';
import { Onboarding } from './pages/Onboarding';
import { Editor } from './pages/Editor';
import { ProfileView } from './pages/ProfileView';

function StartParamHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const go = () => {
      const startParam = getStartParam();
      if (startParam) {
        navigate(`/u/${startParam.toLowerCase()}`, { replace: true });
      }
    };
    go();
    const timer = window.setTimeout(go, 150);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return null;
}

export default function App() {
  useEffect(() => {
    initTelegramApp();
  }, []);

  return (
    <LocaleProvider>
      <BrowserRouter>
        <Web3Background />
        <StartParamHandler />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/u/:username" element={<ProfileView />} />
        </Routes>
      </BrowserRouter>
    </LocaleProvider>
  );
}
