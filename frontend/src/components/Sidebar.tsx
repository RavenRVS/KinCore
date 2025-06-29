import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLevel } from '../contexts/LevelContext';

const Sidebar: React.FC = () => {
  const { currentLevel } = useLevel();
  const location = useLocation();
  const navigate = useNavigate();
  const [isFinanceOpen, setIsFinanceOpen] = useState(true);

  // Определяем путь для главной страницы текущего уровня
  let mainLink = '/main';
  if (currentLevel.type === 'family' && currentLevel.id) {
    mainLink = '/family';
  } else if (currentLevel.type === 'circle' && currentLevel.id) {
    mainLink = `/circle/${currentLevel.id}`;
  }

  const isPersonal = currentLevel.type === 'personal';
  const isMainActive = location.pathname === mainLink || location.pathname.startsWith(mainLink + '/');
  const isFinanceActive = location.pathname.startsWith('/finance');

  const handleFinanceClick = () => {
    navigate('/finance');
    setIsFinanceOpen(open => !open);
  };

  return (
    <aside className="sidebar">
      <nav>
        <ul>
          <li>
            <Link
              to={mainLink}
              className={`sidebar-link${isMainActive ? ' active' : ''}`}
            >
              Главная страница
            </Link>
          </li>
          {isPersonal && (
            <li>
              <div className="sidebar-group">
                <button
                  type="button"
                  className={`sidebar-link sidebar-link--toggle${isFinanceActive ? ' active' : ''}`}
                  onClick={handleFinanceClick}
                >
                  <span>Финансовый капитал</span>
                  <span className="sidebar-link__arrow">{isFinanceOpen ? '▼' : '▶'}</span>
                </button>
                {isFinanceOpen && (
                  <ul className="sidebar-submenu" style={{ paddingLeft: 14 }}>
                    <li>
                      <Link to="/finance/assets" className={`sidebar-link${location.pathname === '/finance/assets' ? ' active' : ''}`}>Активы</Link>
                    </li>
                  </ul>
                )}
              </div>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 