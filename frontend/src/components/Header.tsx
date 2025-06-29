import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LevelSelector from './LevelSelector';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
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
    <header className="main-header">
      {/* Логотип слева */}
      <div className="header-logo">
        <img 
          src="/img/logo/logo_kincore.svg" 
          alt="KinCore" 
          className="logo-image"
        />
      </div>
      
      {/* Центр: селектор уровня */}
      <div className="header-center">
        <LevelSelector />
      </div>
      
      {/* Справа: меню пользователя */}
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
  );
};

export default Header; 