# KinCore

Веб-приложение для управления проектами с современным React фронтендом и Django бэкендом.

## Описание

KinCore - это полнофункциональное веб-приложение, построенное с использованием современных технологий:
- **Frontend**: React с TypeScript
- **Backend**: Django REST Framework
- **База данных**: PostgreSQL
- **Аутентификация**: Token-based authentication

## Структура проекта

```
Development/
├── backend/          # Django backend
│   ├── core/         # Основной проект Django
│   ├── users/        # Приложение для управления пользователями
│   ├── common/       # Общие компоненты проекта
│   └── manage.py     # Django management script
└── frontend/         # React frontend
    ├── src/          # Исходный код React
    ├── public/       # Статические файлы
    └── package.json  # Зависимости Node.js
```

## Функциональность

### Пользователи
- Регистрация с полной информацией (ФИО, дата рождения, контакты)
- Аутентификация по email/телефону
- Управление профилем пользователя
- Согласие на обработку персональных данных

### Безопасность
- Token-based аутентификация
- CORS настройки для безопасного взаимодействия
- Валидация данных на фронтенде и бэкенде
- Защита от CSRF атак

## Установка и запуск

### Backend (Django)

1. Перейдите в директорию backend:
```bash
cd backend
```

2. Создайте виртуальное окружение:
```bash
python -m venv venv
```

3. Активируйте виртуальное окружение:
```bash
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

4. Установите зависимости:
```bash
pip install -r requirements.txt
```

5. Настройте базу данных PostgreSQL и обновите настройки в `core/settings.py`

6. Выполните миграции:
```bash
python manage.py migrate
```

7. Создайте суперпользователя:
```bash
python manage.py createsuperuser
```

8. Запустите сервер разработки:
```bash
python manage.py runserver
```

### Frontend (React)

1. Перейдите в директорию frontend:
```bash
cd frontend
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите сервер разработки:
```bash
npm start
```

## API Endpoints

### Аутентификация
- `POST /api/auth/register/` - Регистрация пользователя
- `POST /api/auth/login/` - Вход в систему
- `POST /api/auth/logout/` - Выход из системы

### Пользователи
- `GET /api/users/profile/` - Получение профиля пользователя
- `PUT /api/users/profile/` - Обновление профиля пользователя

## Технологии

### Backend
- Django 4.2
- Django REST Framework 3.16
- PostgreSQL
- Python 3.8+

### Frontend
- React 18
- TypeScript
- React Router
- CSS3

## Лицензия

Этот проект разработан для внутреннего использования.

## Контакты

По вопросам разработки обращайтесь: privacy@kincore.ru 