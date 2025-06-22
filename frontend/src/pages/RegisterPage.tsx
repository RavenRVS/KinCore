import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../App.css';

const RegisterPage: React.FC = () => {
  const [form, setForm] = useState({
    last_name: '',
    first_name: '',
    middle_name: '',
    birth_date: '',
    phone: '',
    email: '',
    password: '',
    password_confirm: '',
    username: '',
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!privacyAccepted) {
      setError('Необходимо согласиться с условиями обработки персональных данных');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/users/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...form, 
          username: form.email
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        login(data.token, data.user);
        window.location.href = '/main';
      } else {
        let errorMessage = '';
        if (data?.non_field_errors) {
          errorMessage = data.non_field_errors.join(', ');
        } else if (typeof data === 'object') {
          const fieldErrors = Object.entries(data).map(([field, errors]) => {
            if (Array.isArray(errors)) {
              return `${field}: ${errors.join(', ')}`;
            }
            return `${field}: ${errors}`;
          });
          errorMessage = fieldErrors.join('; ');
        } else {
          errorMessage = data?.detail || 'Ошибка регистрации';
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="logo-section">
          <img src="/logo_kincore.svg" alt="KinCore Logo" className="register-logo" />
        </div>
        
        <h2 className="register-title">Регистрация</h2>
        
        <form onSubmit={handleSubmit} className="register-form">
          <input 
            type="text" 
            name="last_name" 
            placeholder="Фамилия" 
            value={form.last_name} 
            onChange={handleChange} 
            required 
            className="register-input"
          />
          <input 
            type="text" 
            name="first_name" 
            placeholder="Имя" 
            value={form.first_name} 
            onChange={handleChange} 
            required 
            className="register-input"
          />
          <input 
            type="text" 
            name="middle_name" 
            placeholder="Отчество" 
            value={form.middle_name} 
            onChange={handleChange} 
            required 
            className="register-input"
          />
          <input 
            type="date" 
            name="birth_date" 
            placeholder="Дата рождения" 
            value={form.birth_date} 
            onChange={handleChange} 
            required 
            className="register-input"
          />
          <input 
            type="text" 
            name="phone" 
            placeholder="Телефон (+79991234567)" 
            value={form.phone} 
            onChange={handleChange} 
            required 
            className="register-input"
          />
          <input 
            type="email" 
            name="email" 
            placeholder="Email" 
            value={form.email} 
            onChange={handleChange} 
            required 
            className="register-input"
          />
          <input 
            type="password" 
            name="password" 
            placeholder="Пароль" 
            value={form.password} 
            onChange={handleChange} 
            required 
            className="register-input"
          />
          <input 
            type="password" 
            name="password_confirm" 
            placeholder="Подтвердите пароль" 
            value={form.password_confirm} 
            onChange={handleChange} 
            required 
            className="register-input"
          />
          
          <div className="privacy-checkbox">
            <label>
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                required
              />
              <span>
                Я согласен с{' '}
                <Link to="/privacy-policy" className="privacy-link">
                  условиями обработки персональных данных
                </Link>
              </span>
            </label>
          </div>
          
          {error && <div className="error">{error}</div>}
          <button type="submit" className="register-button">Зарегистрироваться</button>
        </form>
        
        <div className="login-link">
          Уже есть аккаунт? <Link to="/">Войти</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 