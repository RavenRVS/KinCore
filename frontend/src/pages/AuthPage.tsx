import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../App.css';

const AuthPage: React.FC = () => {
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:8000/api/users/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginValue, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        login(data.token, data.user);
        window.location.href = '/main';
      } else {
        setError(data?.non_field_errors?.[0] || data?.detail || 'Ошибка авторизации');
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="logo-section">
          <img src="/logo_kincore.svg" alt="KinCore Logo" className="auth-logo" />
        </div>
        
        <div className="quote-section">
          <p className="auth-quote">
            "Секрет счастливой семьи заключается в правильном распределении ресурсов и времени."
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Email или телефон"
            value={loginValue}
            onChange={e => setLoginValue(e.target.value)}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="auth-input"
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" className="auth-button">Войти</button>
        </form>
        
        <div className="register-link">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 