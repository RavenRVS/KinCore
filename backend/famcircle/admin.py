from django.contrib import admin
from .models import FamilyCircle, CircleFamilyMembership


@admin.register(FamilyCircle)
class FamilyCircleAdmin(admin.ModelAdmin):
    list_display = ['name', 'join_code', 'created_at', 'families_count']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'description', 'join_code']
    readonly_fields = ['join_code', 'join_password', 'created_at', 'updated_at']
    
    def families_count(self, obj):
        return obj.family_memberships.filter(status='active').count()
    families_count.short_description = 'Количество семей'


@admin.register(CircleFamilyMembership)
class CircleFamilyMembershipAdmin(admin.ModelAdmin):
    list_display = ['family', 'circle', 'role', 'status', 'joined_at', 'added_by']
    list_filter = ['role', 'status', 'joined_at', 'left_at']
    search_fields = ['family__name', 'circle__name', 'added_by__email']
    readonly_fields = ['joined_at', 'left_at']
