import React, { useState } from 'react';
import { JoinFormData } from '../types/levels';
import './JoinForm.css';

interface JoinFormProps {
  type: 'family' | 'circle';
  onSubmit: (data: JoinFormData) => Promise<void>;
  onCreateNew: () => void;
  onCancel: () => void;
  showFamilyExplanation?: boolean;
  onSwitchToFamily?: () => void;
  onCreateFamily?: () => void;
}

const JoinForm: React.FC<JoinFormProps> = ({ type, onSubmit, onCreateNew, onCancel, showFamilyExplanation, onSwitchToFamily, onCreateFamily }) => {
  const [formData, setFormData] = useState<JoinFormData>({
    join_code: '',
    join_password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при присоединении');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getTypeText = () => {
    return type === 'family' ? 'семье' : 'семейному кругу';
  };

  const getCreateText = () => {
    return type === 'family' ? 'Создать свою семью' : 'Создать свой круг';
  };

  if (showFamilyExplanation && type === 'circle') {
    return (
      <div className="join-form-overlay">
        <div className="join-form-modal">
          <button className="close-button-absolute" onClick={onCancel}>×</button>
          
          <div className="join-form-explanation">
            <div className="explanation-icon">ℹ️</div>
            <h3>Сначала нужно присоединиться к семье</h3>
            <p>
              Для присоединения к семейному кругу вы должны сначала присоединиться к существующей семье или создать свою.
            </p>
            <p>
              Семейные круги объединяют несколько семей, поэтому доступ к ним возможен только через членство в семье.
            </p>
          </div>

          <div className="form-actions explanation-actions">
            <button
              type="button"
              className="submit-button"
              onClick={onSwitchToFamily}
            >
              Присоединиться к семье
            </button>
            
            <button
              type="button"
              className="create-button"
              onClick={onCreateFamily}
            >
              Создать свою семью
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-form-overlay">
      <div className="join-form-modal">
        <div className="join-form-header">
          <h2>Присоединиться к {getTypeText()}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="join-form">
          <div className="form-group">
            <label htmlFor="join_code">Код присоединения</label>
            <input
              type="text"
              id="join_code"
              name="join_code"
              value={formData.join_code}
              onChange={handleInputChange}
              placeholder="Введите код"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="join_password">Пароль</label>
            <input
              type="password"
              id="join_password"
              name="join_password"
              value={formData.join_password}
              onChange={handleInputChange}
              placeholder="Введите пароль"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-note">
            <p>
              Код и пароль можно получить у члена {getTypeText()}, который является администратором.
            </p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Присоединяемся...' : 'Присоединиться'}
            </button>
            
            <button
              type="button"
              className="create-button"
              onClick={showFamilyExplanation ? onCreateFamily : onCreateNew}
            >
              {showFamilyExplanation ? 'Создать свою семью' : getCreateText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinForm; 