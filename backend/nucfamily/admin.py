from django.contrib import admin
from .models import NuclearFamily, FamilyMembership


@admin.register(NuclearFamily)
class NuclearFamilyAdmin(admin.ModelAdmin):
    list_display = ['name', 'join_code', 'created_at', 'members_count']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'description', 'join_code']
    readonly_fields = ['join_code', 'join_password', 'created_at', 'updated_at']
    
    def members_count(self, obj):
        return obj.memberships.filter(status='active').count()
    members_count.short_description = 'Количество участников'


@admin.register(FamilyMembership)
class FamilyMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'family', 'role', 'status', 'joined_at']
    list_filter = ['role', 'status', 'joined_at', 'left_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'family__name']
    readonly_fields = ['joined_at', 'left_at']
