import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import RegisterPage from './pages/RegisterPage';
import MainPage from './pages/MainPage';
import ProfilePage from './pages/ProfilePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Стартовая страница (только для неавторизованных) */}
        <Route path="/" element={
          !isAuthenticated ? <AuthPage /> : <Navigate to="/main" replace />
        } />
        {/* Регистрация (только для неавторизованных) */}
        <Route path="/register" element={
          !isAuthenticated ? <RegisterPage /> : <Navigate to="/main" replace />
        } />
        {/* Главная страница (только для авторизованных) */}
        <Route path="/main" element={
          isAuthenticated ? <MainPage /> : <Navigate to="/" replace />
        } />
        {/* Страница профиля (только для авторизованных) */}
        <Route path="/profile" element={
          isAuthenticated ? <ProfilePage /> : <Navigate to="/" replace />
        } />
        {/* Условия обработки персональных данных */}
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        {/* Редирект на стартовую по умолчанию */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
