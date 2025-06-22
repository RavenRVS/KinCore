import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../App.css';

const MainPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleProfileClick = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const getInitials = () => {
    const firstName = user?.first_name || '';
    const lastName = user?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="main-page">
      <header className="main-header">
        <div className="user-menu-wrapper">
          <button className="user-btn" onClick={() => setMenuOpen(v => !v)}>
            {user.avatar ? (
              <img 
                src={`http://localhost:8000${user.avatar}`} 
                alt="Аватар" 
                className="user-avatar"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {getInitials()}
              </div>
            )}
          </button>
          {menuOpen && (
            <div className="user-menu">
              <button onClick={handleProfileClick}>Профиль</button>
              <button onClick={handleLogout}>Выйти</button>
            </div>
          )}
        </div>
      </header>
      <main>
        <h1>Добро пожаловать в KinCore!</h1>
      </main>
    </div>
  );
};

export default MainPage; 