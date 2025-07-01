from django.shortcuts import render
from rest_framework import status, generics, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserDataVisibilitySerializer
)
from .models import User, UserProfile, UserDataVisibility


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Регистрация нового пользователя"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Создаем токен для пользователя
        token, created = Token.objects.get_or_create(user=user)
        
        # Авторизуем пользователя
        login(request, user)
        
        return Response({
            'message': 'Пользователь успешно зарегистрирован',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Авторизация пользователя"""
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Создаем токен для пользователя
        token, created = Token.objects.get_or_create(user=user)
        
        # Авторизуем пользователя
        login(request, user)
        
        return Response({
            'message': 'Успешная авторизация',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Выход пользователя"""
    # Удаляем токен
    try:
        request.user.auth_token.delete()
    except:
        pass
    
    # Выходим из системы
    logout(request)
    
    return Response({
        'message': 'Успешный выход из системы'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Получение данных текущего пользователя"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Обновление профиля пользователя"""
    serializer = UserProfileUpdateSerializer(
        request.user, 
        data=request.data, 
        partial=True,
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Профиль успешно обновлен',
            'user': UserSerializer(request.user).data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """API для работы с профилем пользователя"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """Получаем профиль текущего пользователя"""
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class UserDataVisibilityView(generics.RetrieveUpdateAPIView):
    """API для управления видимостью данных пользователя"""
    serializer_class = UserDataVisibilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """Получаем настройки видимости текущего пользователя"""
        visibility, created = UserDataVisibility.objects.get_or_create(user=self.request.user)
        return visibility
