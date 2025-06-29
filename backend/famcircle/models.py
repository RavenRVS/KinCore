from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class FamilyCircle(models.Model):
    name = models.CharField('Название круга', max_length=150)
    description = models.TextField('Описание', blank=True)
    join_code = models.CharField('Код для присоединения', max_length=32, unique=True)
    join_password = models.CharField('Пароль для присоединения (хэш)', max_length=128)
    created_at = models.DateTimeField('Дата создания', default=timezone.now)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)
    # Связь с семьями через ManyToMany
    families = models.ManyToManyField('nucfamily.NuclearFamily', related_name='circles', blank=True)

    def __str__(self):
        return self.name

class CircleFamilyMembership(models.Model):
    """
    Членство семьи в круге (заменяет прямое членство пользователей)
    """
    ROLE_CHOICES = [
        ('admin', 'Админ'),
        ('member', 'Участник'),
    ]
    STATUS_CHOICES = [
        ('active', 'Активен'),
        ('invited', 'Приглашён'),
        ('left', 'Покинул'),
    ]
    
    family = models.ForeignKey('nucfamily.NuclearFamily', on_delete=models.CASCADE, related_name='circle_memberships')
    circle = models.ForeignKey(FamilyCircle, on_delete=models.CASCADE, related_name='family_memberships')
    role = models.CharField('Роль семьи', max_length=16, choices=ROLE_CHOICES, default='member')
    status = models.CharField('Статус', max_length=16, choices=STATUS_CHOICES, default='active')
    joined_at = models.DateTimeField('Дата вступления', default=timezone.now)
    left_at = models.DateTimeField('Дата выхода', null=True, blank=True)
    
    # Пользователь, который добавил семью в круг (для логирования)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='added_families_to_circles')

    class Meta:
        unique_together = ('family', 'circle')
        verbose_name = 'Членство семьи в круге'
        verbose_name_plural = 'Членства семей в кругах'

    def __str__(self):
        return f"{self.family.name} в {self.circle.name} ({self.role})"

# Удаляем старую модель CircleMembership, так как теперь семьи присоединяются к кругам
# class CircleMembership(models.Model):
#     ...
