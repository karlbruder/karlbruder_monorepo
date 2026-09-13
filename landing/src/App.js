import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './components/LanguageContext';
import HomePage from './pages/HomePage';
import MonomachiaPage from './pages/MonomachiaPage';

const App = () => (
  <LanguageProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/monomachia" element={<MonomachiaPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </LanguageProvider>
);

export default App;
