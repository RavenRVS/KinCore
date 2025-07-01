from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserProfile, UserDataVisibility


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'phone', 'is_active', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'date_joined']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Дополнительная информация', {'fields': ('phone', 'middle_name', 'birth_date', 'avatar', 'bio')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Дополнительная информация', {'fields': ('phone', 'middle_name', 'birth_date')}),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']


@admin.register(UserDataVisibility)
class UserDataVisibilityAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_visibility', 'phone_visibility', 'first_name_visibility', 'last_name_visibility']
    list_filter = ['email_visibility', 'phone_visibility', 'first_name_visibility', 'last_name_visibility']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
