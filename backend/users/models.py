from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Расширенная модель пользователя с возможностью авторизации по телефону или email
    """
    
    # Валидатор для номера телефона (российский формат)
    phone_regex = RegexValidator(
        regex=r'^\+7\d{10}$',
        message="Номер телефона должен быть в формате: '+79991234567'"
    )
    
    # Основные поля для регистрации
    last_name = models.CharField('Фамилия', max_length=150, blank=False)
    first_name = models.CharField('Имя', max_length=150, blank=False)
    middle_name = models.CharField('Отчество', max_length=150, blank=False)
    birth_date = models.DateField('Дата рождения', null=False, blank=False)
    phone = models.CharField('Номер телефона', max_length=12, validators=[phone_regex], unique=True, blank=False)
    email = models.EmailField('Email', unique=True, blank=False)
    
    # Дополнительные поля для расширения в будущем
    avatar = models.ImageField('Аватар', upload_to='avatars/', null=True, blank=True)
    bio = models.TextField('О себе', max_length=500, blank=True)
    
    # Метаданные
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)
    
    # Поля для авторизации
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name', 'middle_name', 'birth_date', 'phone']
    
    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
        db_table = 'users'
        
    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.email})"
    
    def get_full_name(self):
        """Получить полное имя пользователя"""
        return f"{self.last_name} {self.first_name} {self.middle_name}".strip()
    
    def get_short_name(self):
        """Получить короткое имя пользователя"""
        return f"{self.last_name} {self.first_name}"


class UserProfile(models.Model):
    """
    Дополнительный профиль пользователя для расширения данных в будущем
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Дополнительные поля для будущего расширения
    address = models.TextField('Адрес', blank=True)
    company = models.CharField('Компания', max_length=200, blank=True)
    position = models.CharField('Должность', max_length=200, blank=True)
    
    # Настройки пользователя
    notifications_enabled = models.BooleanField('Уведомления включены', default=True)
    language = models.CharField('Язык интерфейса', max_length=10, default='ru')
    
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)
    
    class Meta:
        verbose_name = 'Профиль пользователя'
        verbose_name_plural = 'Профили пользователей'
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"Профиль {self.user.get_full_name()}"
