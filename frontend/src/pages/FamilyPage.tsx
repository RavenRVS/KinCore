import React, { useEffect, useState } from 'react';
import { useLevel } from '../contexts/LevelContext';
import { useAuth } from '../hooks/useAuth';

const FamilyPage: React.FC = () => {
  const { currentLevel, refreshLevels } = useLevel();
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<{ join_code: string; join_password?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Проверка, админ ли пользователь (из currentLevel)
  const isAdmin = currentLevel.type === 'family' && currentLevel.isAdmin;

  // Получить текущий код (после генерации)
  const fetchCredentials = async () => {
    if (currentLevel.type !== 'family' || !currentLevel.id) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      // В реальном API join_code хранится в объекте семьи, но пароль только после генерации
      const res = await fetch(`http://localhost:8000/api/nucfamily/families/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      const families = await res.json();
      const fam = families.find((f: any) => f.id === currentLevel.id);
      setCredentials({ join_code: fam?.join_code || '' });
    } catch {
      setCredentials(null);
    } finally {
      setLoading(false);
    }
  };

  // Генерировать новый код/пароль
  const handleRegenerate = async () => {
    if (currentLevel.type !== 'family' || !currentLevel.id) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/nucfamily/families/${currentLevel.id}/regenerate_credentials/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Ошибка генерации');
      }
      const data = await res.json();
      setCredentials({ join_code: data.join_code, join_password: data.join_password });
      setSuccess('Новые код и пароль успешно сгенерированы!');
      await refreshLevels();
    } catch (e: any) {
      setError(e.message || 'Ошибка генерации');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchCredentials();
    // eslint-disable-next-line
  }, [isAdmin, currentLevel.id]);

  return (
    <div className="family-page">
      <main>
        <h1>Главная страница семьи</h1>
        {currentLevel.type === 'family' && currentLevel.title && (
          <p>Текущая семья: {currentLevel.title}</p>
        )}
        <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
          <p>Здесь будет содержимое главной страницы семьи.</p>

          {/* Секция для админа */}
          {isAdmin && (
            <div style={{ marginTop: 32, padding: 20, background: '#f8f9fa', borderRadius: 8, boxShadow: '0 1px 4px #0001' }}>
              <h3>Пригласить в семью</h3>
              <div style={{ marginBottom: 8 }}>
                <strong>Код для присоединения:</strong> {credentials?.join_code || '—'}
              </div>
              {credentials?.join_password && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Пароль:</strong> {credentials.join_password}
                </div>
              )}
              <button
                onClick={handleRegenerate}
                disabled={loading}
                style={{ background: '#1E90FF', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 500, cursor: 'pointer', marginTop: 8 }}
              >
                {loading ? 'Генерируем...' : 'Сгенерировать новый код и пароль'}
              </button>
              {success && <div style={{ color: '#059669', marginTop: 8 }}>{success}</div>}
              {error && <div style={{ color: '#ef4444', marginTop: 8 }}>{error}</div>}
              <div style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
                Передайте код и пароль новому участнику. После присоединения пароль больше не будет отображаться.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FamilyPage; 