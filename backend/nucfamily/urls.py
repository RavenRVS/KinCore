from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'nucfamily'

router = DefaultRouter()
router.register(r'families', views.NuclearFamilyViewSet, basename='nuclearfamily')
router.register(r'memberships', views.FamilyMembershipViewSet, basename='familymembership')

urlpatterns = [
    path('', include(router.urls)),
] 