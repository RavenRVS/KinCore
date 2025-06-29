import React, { useState, useRef, useEffect } from 'react';
import { useLevel } from '../contexts/LevelContext';
import { Level, FamilyLevel } from '../types/levels';
import { useNavigate } from 'react-router-dom';
import JoinForm from './JoinForm';
import CreateForm from './CreateForm';
import './LevelSelector.css';

const LevelSelector: React.FC = () => {
  const { currentLevel, availableLevels, setCurrentLevel, refreshLevels } = useLevel();
  const [isOpen, setIsOpen] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState<'family' | 'circle' | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<'family' | 'circle' | null>(null);
  const [circleJoinError, setCircleJoinError] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [showFamilyExplanation, setShowFamilyExplanation] = useState(false);

  // Восстановление последнего выбранного уровня
  useEffect(() => {
    const saved = localStorage.getItem('selectedLevel');
    if (saved && availableLevels.length > 0) {
      const parsed = JSON.parse(saved);
      const found = availableLevels.find(l => l.type === parsed.type && (l.type === 'personal' || l.id === parsed.id));
      if (found) setCurrentLevel(found);
    }
    // eslint-disable-next-line
  }, [availableLevels.length]);

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLevelSelect = (level: Level) => {
    setIsOpen(false);
    if (level.type === 'personal') {
      setCurrentLevel(level);
      localStorage.setItem('selectedLevel', JSON.stringify(level));
      navigate('/main');
      return;
    }
    setCurrentLevel(level);
    localStorage.setItem('selectedLevel', JSON.stringify(level));
    if (level.type === 'family') {
      navigate('/family');
    } else if (level.type === 'circle' && level.id) {
      navigate(`/circle/${level.id}`);
    }
  };

  // Присоединение к семье/кругу
  const handleJoin = async (data: { join_code: string; join_password: string }) => {
    if (!showJoinForm) return;
    const token = localStorage.getItem('token');
    
    // Сначала пытаемся найти семью/круг по коду
    const searchUrl = showJoinForm === 'family'
      ? `http://localhost:8000/api/nucfamily/families/search_by_code/`
      : `http://localhost:8000/api/famcircle/circles/search_by_code/`;
    
    try {
      // Ищем семью/круг по коду
      const searchResp = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ join_code: data.join_code })
      });
      
      if (!searchResp.ok) {
        const err = await searchResp.json();
        throw new Error(err?.error || 'Код не найден');
      }
      
      const found = await searchResp.json();
      
      // Теперь присоединяемся к найденной семье/кругу
      const joinUrl = showJoinForm === 'family'
        ? `http://localhost:8000/api/nucfamily/families/${found.id}/join/`
        : `http://localhost:8000/api/famcircle/circles/${found.id}/join/`;
      
      const joinResp = await fetch(joinUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ join_password: data.join_password })
      });
      
      if (!joinResp.ok) {
        const err = await joinResp.json();
        throw new Error(err?.error || 'Ошибка присоединения');
      }
      
      await refreshLevels();
      setShowJoinForm(null);
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка присоединения');
    }
  };

  // Создание семьи/круга
  const handleCreate = async (data: { name: string; description?: string }) => {
    if (!showCreateForm) return;
    const token = localStorage.getItem('token');
    const url = showCreateForm === 'family'
      ? 'http://localhost:8000/api/nucfamily/families/'
      : 'http://localhost:8000/api/famcircle/circles/';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err?.error || 'Ошибка создания');
    }
    await refreshLevels();
    setShowCreateForm(null);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Проверяем наличие семьи и прав на присоединение к кругу
  const familyLevels = availableLevels.filter(l => l.type === 'family') as FamilyLevel[];
  const hasFamily = familyLevels.length > 0;
  const hasCircle = availableLevels.some(l => l.type === 'circle');
  const canJoinCircle = familyLevels.some(fam => fam.canJoinCircles);

  // Обработчик для кнопки "Присоединиться к кругу"
  const handleJoinCircleClick = () => {
    setCircleJoinError('');
    if (!hasFamily) {
      setShowFamilyExplanation(true);
      setShowJoinForm('circle');
      setIsOpen(false);
      return;
    }
    if (!canJoinCircle) {
      setCircleJoinError('У вас нет прав для присоединения семьи к кругу. Обратитесь к администратору вашей семьи.');
      setIsOpen(false);
      return;
    }
    setShowFamilyExplanation(false);
    setShowJoinForm('circle');
    setIsOpen(false);
  };

  // Обработчик для перехода к форме семьи из callout
  const handleSwitchToFamily = () => {
    setShowJoinForm('family');
    setShowFamilyExplanation(false);
  };

  // Обработчик для создания семьи из блока объяснения
  const handleCreateFamily = () => {
    console.log('handleCreateFamily called - setting showCreateForm to family');
    setShowCreateForm('family');
    setShowJoinForm(null);
    setShowFamilyExplanation(false);
  };

  return (
    <div className="level-selector" ref={dropdownRef}>
      <button 
        className="level-selector-button"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
      >
        <div className="level-selector-content">
          <img 
            src={currentLevel.icon} 
            alt={currentLevel.displayName}
            className="level-icon"
          />
          <div className="level-text">
            <div className="level-name">{currentLevel.displayName}</div>
            <div className="level-title">{currentLevel.title}</div>
          </div>
          <div className={`level-arrow ${isOpen ? 'open' : ''}`}>
            ▼
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="level-dropdown">
          {/* Только реальные уровни */}
          {availableLevels.map((level) => (
            <button
              key={`${level.type}-${level.id || 'personal'}`}
              className={`level-option ${currentLevel.type === level.type && currentLevel.id === level.id ? 'active' : ''}`}
              onClick={() => handleLevelSelect(level)}
            >
              <div className="level-option-content">
                <img 
                  src={level.icon} 
                  alt={level.displayName}
                  className="level-option-icon"
                />
                <div className="level-option-text">
                  <div className="level-option-name">{level.displayName}</div>
                  <div className="level-option-title">{level.title}</div>
                </div>
              </div>
            </button>
          ))}
          {/* Кнопки для присоединения, если нет семьи/круга */}
          {!hasFamily && (
            <button className="level-option" onClick={() => { setShowJoinForm('family'); setIsOpen(false); }}>
              <div className="level-option-content">
                <img src="/img/icons/nucfamily_icon.png" alt="Семья" className="level-option-icon" />
                <div className="level-option-text">
                  <div className="level-option-name">Присоединиться к семье</div>
                </div>
              </div>
            </button>
          )}
          {!hasCircle && (
            <button className="level-option" onClick={handleJoinCircleClick}>
              <div className="level-option-content">
                <img src="/img/icons/famcirclle_icon.png" alt="Круг" className="level-option-icon" />
                <div className="level-option-text">
                  <div className="level-option-name">Присоединиться к кругу</div>
                </div>
              </div>
            </button>
          )}
          {circleJoinError && (
            <div className="level-option-error">{circleJoinError}</div>
          )}
        </div>
      )}

      {/* Модалки */}
      {showJoinForm && (
        <JoinForm
          type={showJoinForm}
          onSubmit={handleJoin}
          onCreateNew={() => { setShowCreateForm(showJoinForm); setShowJoinForm(null); setShowFamilyExplanation(false); }}
          onCancel={() => { setShowJoinForm(null); setShowFamilyExplanation(false); }}
          showFamilyExplanation={showFamilyExplanation && showJoinForm === 'circle'}
          onSwitchToFamily={handleSwitchToFamily}
          onCreateFamily={handleCreateFamily}
        />
      )}
      {showCreateForm && (
        <CreateForm
          type={showCreateForm}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(null)}
        />
      )}
    </div>
  );
};

export default LevelSelector; 