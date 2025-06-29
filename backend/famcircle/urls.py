from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'famcircle'

router = DefaultRouter()
router.register(r'circles', views.FamilyCircleViewSet, basename='familycircle')
router.register(r'family-memberships', views.CircleFamilyMembershipViewSet, basename='circlefamilymembership')

urlpatterns = [
    path('', include(router.urls)),
] 