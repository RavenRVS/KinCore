from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('current/', views.current_user, name='current_user'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('update/', views.update_profile, name='update_profile'),
] 