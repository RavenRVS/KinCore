import React, { useState } from 'react';
import { CreateFamilyData, CreateCircleData } from '../types/levels';
import './CreateForm.css';

interface CreateFormProps {
  type: 'family' | 'circle';
  onSubmit: (data: CreateFamilyData | CreateCircleData) => Promise<void>;
  onCancel: () => void;
}

const CreateForm: React.FC<CreateFormProps> = ({ type, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
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
      setError(err.message || 'Произошла ошибка при создании');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getTypeText = () => {
    return type === 'family' ? 'семью' : 'семейного круга';
  };

  const getPlaceholder = () => {
    return type === 'family' ? 'Например: Семья Ивановых' : 'Например: Расширенная семья';
  };

  return (
    <div className="create-form-overlay">
      <div className="create-form-modal">
        <div className="create-form-header">
          <h2>Создать {getTypeText()}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="name">Название</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={getPlaceholder()}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание (необязательно)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Краткое описание..."
              rows={3}
              disabled={isLoading}
            />
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
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Создаем...' : 'Создать'}
            </button>
            
            <button
              type="button"
              className="cancel-button"
              onClick={onCancel}
              disabled={isLoading}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateForm; 