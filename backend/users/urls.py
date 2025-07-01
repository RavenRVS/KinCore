from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'users'

router = DefaultRouter()
# router.register(r'families', views.FamilyViewSet, basename='family')
# router.register(r'family-memberships', views.FamilyMembershipViewSet, basename='familymembership')

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('current/', views.current_user, name='current_user'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('update/', views.update_profile, name='update_profile'),
    path('visibility/', views.UserDataVisibilityView.as_view(), name='data_visibility'),
]

urlpatterns += router.urls 