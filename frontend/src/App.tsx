import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import RegisterPage from './pages/RegisterPage';
import MainPage from './pages/MainPage';
import ProfilePage from './pages/ProfilePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import FamilyPage from './pages/FamilyPage';
import CirclePage from './pages/CirclePage';
import FinancePage from './pages/FinancePage';
import AssetsPage from './pages/AssetsPage';
import ExpensesPage from './pages/ExpensesPage'; // Added import for ExpensesPage
import LiabilitiesPage from './pages/LiabilitiesPage';
import { useAuth } from './hooks/useAuth';
import { LevelProvider } from './contexts/LevelContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <LevelProvider>
      <Router>
        <div className="app-layout">
          <Header />
          <div className="app-body">
            {isAuthenticated && <Sidebar />}
            <main className="main-content">
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
                {/* Страница семьи (только для авторизованных) */}
                <Route path="/family" element={
                  isAuthenticated ? <FamilyPage /> : <Navigate to="/" replace />
                } />
                {/* Страница семейного круга (только для авторизованных) */}
                <Route path="/circle/:id" element={
                  isAuthenticated ? <CirclePage /> : <Navigate to="/" replace />
                } />
                {/* Страница финансов (только для авторизованных) */}
                <Route path="/finance" element={
                  isAuthenticated ? <FinancePage /> : <Navigate to="/" replace />
                } />
                {/* Страница активов (только для авторизованных) */}
                <Route path="/finance/assets" element={
                  isAuthenticated ? <AssetsPage /> : <Navigate to="/" replace />
                } />
                {/* Страница пассивов (только для авторизованных) */}
                <Route path="/finance/liabilities" element={
                  isAuthenticated ? <LiabilitiesPage /> : <Navigate to="/" replace />
                } />
                {/* Страница расходов (только для авторизованных) */}
                <Route path="/finance/expenses" element={
                  isAuthenticated ? <ExpensesPage /> : <Navigate to="/" replace />
                } />
                {/* Редирект на стартовую по умолчанию */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </LevelProvider>
  );
};

export default App;
