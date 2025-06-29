from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class NuclearFamily(models.Model):
    name = models.CharField('Название семьи', max_length=150)
    description = models.TextField('Описание', blank=True)
    join_code = models.CharField('Код для присоединения', max_length=32, unique=True)
    join_password = models.CharField('Пароль для присоединения (хэш)', max_length=128)
    created_at = models.DateTimeField('Дата создания', default=timezone.now)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)

    def __str__(self):
        return self.name

class FamilyMembership(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Админ'),
        ('parent', 'Родитель'),
        ('child', 'Ребёнок'),
        ('elder', 'Старшее поколение'),
        ('guest', 'Гость'),
    ]
    STATUS_CHOICES = [
        ('active', 'Активен'),
        ('invited', 'Приглашён'),
        ('left', 'Покинул'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='family_memberships')
    family = models.ForeignKey(NuclearFamily, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField('Роль', max_length=16, choices=ROLE_CHOICES, default='parent')
    status = models.CharField('Статус', max_length=16, choices=STATUS_CHOICES, default='active')
    joined_at = models.DateTimeField('Дата вступления', default=timezone.now)
    left_at = models.DateTimeField('Дата выхода', null=True, blank=True)
    
    # Права доступа к семейному кругу
    can_join_circles = models.BooleanField('Может присоединяться к кругам', default=False)
    can_share_to_circles = models.BooleanField('Может делиться данными с кругами', default=False)
    can_manage_circle_access = models.BooleanField('Может управлять доступом к кругам', default=False)

    class Meta:
        unique_together = ('user', 'family')
        verbose_name = 'Член нуклеарной семьи'
        verbose_name_plural = 'Члены нуклеарной семьи'

    def __str__(self):
        return f"{self.user.get_full_name()} в {self.family.name} ({self.role})"
