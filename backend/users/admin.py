from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Профиль'


class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('email', 'username', 'first_name', 'last_name', 'phone', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active', 'created_at')
    search_fields = ('email', 'username', 'first_name', 'last_name', 'phone')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Личная информация', {'fields': ('username', 'first_name', 'last_name', 'middle_name', 'birth_date', 'phone', 'avatar', 'bio')}),
        ('Разрешения', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Важные даты', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'first_name', 'last_name', 'middle_name', 'birth_date', 'phone'),
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'company', 'position', 'notifications_enabled', 'language')
    list_filter = ('notifications_enabled', 'language', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'company', 'position')
    ordering = ('-created_at',)


admin.site.register(User, UserAdmin)
