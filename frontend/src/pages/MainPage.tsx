import React from 'react';
import { useAuth } from '../hooks/useAuth';
import '../App.css';

const MainPage: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="main-page">
      <main>
        <h1>Добро пожаловать в KinCore!</h1>
      </main>
    </div>
  );
};

export default MainPage; 