import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Level } from '../types/levels';
import { useAuth } from '../hooks/useAuth';

interface LevelContextType {
  currentLevel: Level;
  availableLevels: Level[];
  setCurrentLevel: (level: Level) => void;
  refreshLevels: () => Promise<void>;
  isLoading: boolean;
}

const LevelContext = createContext<LevelContextType | undefined>(undefined);

export const useLevel = () => {
  const context = useContext(LevelContext);
  if (!context) {
    throw new Error('useLevel must be used within a LevelProvider');
  }
  return context;
};

interface LevelProviderProps {
  children: ReactNode;
}

export const LevelProvider: React.FC<LevelProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentLevel, setCurrentLevel] = useState<Level>({
    type: 'personal',
    name: 'personal',
    displayName: 'Личное пространство',
    icon: '/img/icons/private_icon.png',
    title: user ? `${user.first_name} ${user.last_name}` : undefined
  });
  const [availableLevels, setAvailableLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка доступных уровней
  const loadLevels = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      };

      // Загружаем семьи пользователя
      const familiesResponse = await fetch('http://localhost:8000/api/nucfamily/families/', {
        headers
      });
      const families = familiesResponse.ok ? await familiesResponse.json() : [];

      // Формируем список уровней
      const levels: Level[] = [
        {
          type: 'personal',
          name: 'personal',
          displayName: 'Личное пространство',
          icon: '/img/icons/private_icon.png',
          title: `${user.first_name} ${user.last_name}`
        }
      ];

      // Добавляем семьи и их круги
      for (const family of families) {
        // Семейный уровень
        levels.push({
          type: 'family',
          name: 'family',
          displayName: 'Пространство семьи',
          icon: '/img/icons/nucfamily_icon.png',
          id: family.id,
          title: family.name,
          userRole: family.user_role,
          isAdmin: family.is_admin,
          canJoinCircles: family.user_can_join_circles,
          canShareToCircles: family.user_can_share_to_circles,
          canManageCircleAccess: family.user_can_manage_circle_access
        });
        // Круги этой семьи
        if (Array.isArray(family.circles)) {
          for (const circle of family.circles) {
            levels.push({
              type: 'circle',
              name: 'circle',
              displayName: 'Семейный круг',
              icon: '/img/icons/famcirclle_icon.png',
              id: circle.id,
              title: circle.name,
              familyId: family.id,
              familyTitle: family.name
            });
          }
        }
      }

      setAvailableLevels(levels);

      // Если текущий уровень не в списке доступных, переключаемся на личный
      const currentLevelExists = levels.some(level => 
        level.type === currentLevel.type && 
        (level.type === 'personal' || level.id === currentLevel.id)
      );

      if (!currentLevelExists) {
        setCurrentLevel(levels[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки уровней:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, currentLevel.type, currentLevel.id]);

  // Обновление уровней
  const refreshLevels = async () => {
    await loadLevels();
  };

  // Загружаем уровни при авторизации
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLevels();
    }
  }, [isAuthenticated, user, loadLevels]);

  // Обновляем заголовок личного уровня при изменении пользователя
  useEffect(() => {
    if (user && currentLevel.type === 'personal') {
      setCurrentLevel(prev => ({
        ...prev,
        title: `${user.first_name} ${user.last_name}`
      }));
    }
  }, [user, currentLevel.type]);

  const value: LevelContextType = {
    currentLevel,
    availableLevels,
    setCurrentLevel,
    refreshLevels,
    isLoading
  };

  return (
    <LevelContext.Provider value={value}>
      {children}
    </LevelContext.Provider>
  );
}; 