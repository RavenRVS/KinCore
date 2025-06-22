import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../App.css';

interface UserData {
  first_name: string;
  last_name: string;
  middle_name: string;
  birth_date: string;
  phone: string;
  email: string;
  bio: string;
  avatar?: string;
}

const ProfilePage: React.FC = () => {
  const [form, setForm] = useState<UserData>({
    first_name: '',
    last_name: '',
    middle_name: '',
    birth_date: '',
    phone: '',
    email: '',
    bio: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        middle_name: user.middle_name || '',
        birth_date: user.birth_date ? user.birth_date.split('T')[0] : '',
        phone: user.phone || '',
        email: user.email || '',
        bio: user.bio || '',
      });
      if (user.avatar) {
        setAvatarPreview(`http://localhost:8000${user.avatar}`);
      }
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      
      // Добавляем данные формы
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      
      // Добавляем аватар, если выбран
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/update/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Профиль успешно обновлен');
        if (data.user) {
          updateUser(data.user);
        }
      } else {
        let errorMessage = '';
        if (typeof data === 'object') {
          const fieldErrors = Object.entries(data).map(([field, errors]) => {
            if (Array.isArray(errors)) {
              return `${field}: ${errors.join(', ')}`;
            }
            return `${field}: ${errors}`;
          });
          errorMessage = fieldErrors.join('; ');
        } else {
          errorMessage = data?.detail || 'Ошибка обновления профиля';
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = form.first_name || user?.first_name || '';
    const lastName = form.last_name || user?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">Управление профилем</h1>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="avatar-section">
            <div className="avatar-container">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Аватар" className="avatar-image" />
              ) : (
                <div className="avatar-placeholder">
                  {getInitials()}
                </div>
              )}
            </div>
            <div className="avatar-upload">
              <label htmlFor="avatar" className="avatar-upload-label">
                {avatarPreview ? 'Изменить аватар' : 'Загрузить аватар'}
              </label>
              <input
                type="file"
                id="avatar"
                accept="image/*"
                onChange={handleAvatarChange}
                className="avatar-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="last_name">Фамилия</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
                className="profile-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="first_name">Имя</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                className="profile-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="middle_name">Отчество</label>
              <input
                type="text"
                id="middle_name"
                name="middle_name"
                value={form.middle_name}
                onChange={handleChange}
                required
                className="profile-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="birth_date">Дата рождения</label>
              <input
                type="date"
                id="birth_date"
                name="birth_date"
                value={form.birth_date}
                onChange={handleChange}
                required
                className="profile-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Телефон</label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="profile-input"
                placeholder="+79991234567"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="profile-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="bio">О себе</label>
            <textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              className="profile-textarea"
              rows={4}
              placeholder="Расскажите о себе..."
            />
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div className="profile-actions">
            <button type="submit" className="profile-button" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button 
              type="button" 
              className="profile-button-secondary"
              onClick={() => navigate('/main')}
            >
              Вернуться
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage; 