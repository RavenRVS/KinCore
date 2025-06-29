from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import NuclearFamily, FamilyMembership
from .serializers import (
    NuclearFamilySerializer,
    NuclearFamilyCreateSerializer,
    FamilyMembershipSerializer,
    FamilyJoinByIdSerializer,
    FamilyMembershipUpdateSerializer,
    FamilyCircleConnectionSerializer
)


class NuclearFamilyViewSet(viewsets.ModelViewSet):
    """ViewSet для управления нуклеарными семьями"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Возвращаем семьи, в которых участвует текущий пользователь"""
        # Для поиска, присоединения и создания не ограничиваем queryset
        if self.action in ['search_by_code', 'join', 'create']:
            return NuclearFamily.objects.all()
        
        # Для остальных действий возвращаем только семьи пользователя
        user = self.request.user
        return NuclearFamily.objects.filter(memberships__user=user, memberships__status='active').distinct()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return NuclearFamilyCreateSerializer
        elif self.action == 'connect_to_circle':
            return FamilyCircleConnectionSerializer
        return NuclearFamilySerializer
    
    def perform_create(self, serializer):
        """Создание семьи с автоматическим назначением админа"""
        family = serializer.save()
        # Создатель уже становится админом в сериализаторе
        return family
    
    @action(detail=False, methods=['post'])
    def search_by_code(self, request):
        """Поиск семьи по коду присоединения"""
        join_code = request.data.get('join_code')
        if not join_code:
            return Response(
                {'error': 'Необходимо указать код присоединения'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            family = NuclearFamily.objects.get(join_code=join_code)
            return Response({
                'id': family.id,
                'name': family.name,
                'join_code': family.join_code
            })
        except NuclearFamily.DoesNotExist:
            return Response(
                {'error': 'Семья с таким кодом не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Присоединение к семье по коду и паролю"""
        # Получаем семью по ID, а не через get_object() (который фильтрует по участникам)
        try:
            family = NuclearFamily.objects.get(id=pk)
        except NuclearFamily.DoesNotExist:
            return Response(
                {'error': 'Семья не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Передаем family_id в контекст сериализатора
        context = {'request': request, 'family_id': pk}
        serializer = FamilyJoinByIdSerializer(data=request.data, context=context)
        
        if serializer.is_valid():
            membership = serializer.save()
            return Response({
                'message': 'Успешно присоединились к семье',
                'membership': FamilyMembershipSerializer(membership).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Получение списка участников семьи"""
        family = self.get_object()
        memberships = family.memberships.filter(status='active')
        serializer = FamilyMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def regenerate_credentials(self, request, pk=None):
        """Регенерация кода и пароля для присоединения (только для админов)"""
        family = self.get_object()
        user = request.user
        
        # Проверяем, является ли пользователь админом
        if not family.memberships.filter(user=user, role='admin', status='active').exists():
            return Response(
                {'error': 'Только администраторы могут регенерировать учетные данные'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Регенерируем код и пароль
        import secrets
        import string
        from django.contrib.auth.hashers import make_password
        
        join_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        join_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(6))
        hashed_password = make_password(join_password)
        
        family.join_code = join_code
        family.join_password = hashed_password
        family.save()
        
        return Response({
            'message': 'Учетные данные обновлены',
            'join_code': join_code,
            'join_password': join_password
        })
    
    @action(detail=True, methods=['post'])
    def connect_to_circle(self, request, pk=None):
        """Подключение семьи к кругу (только для админов семьи)"""
        family = self.get_object()
        user = request.user
        
        # Проверяем, является ли пользователь админом семьи
        if not family.memberships.filter(user=user, role='admin', status='active').exists():
            return Response(
                {'error': 'Только администраторы семьи могут подключать к кругам'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(family, data=request.data, partial=True)
        if serializer.is_valid():
            updated_family = serializer.save()
            return Response({
                'message': 'Семья успешно подключена к кругу',
                'family': NuclearFamilySerializer(updated_family).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'])
    def disconnect_from_circle(self, request, pk=None):
        """Отключение семьи от круга (только для админов семьи)"""
        family = self.get_object()
        user = request.user
        circle_id = request.data.get('circle_id')
        
        # Проверяем, является ли пользователь админом семьи
        if not family.memberships.filter(user=user, role='admin', status='active').exists():
            return Response(
                {'error': 'Только администраторы семьи могут отключать от кругов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not circle_id:
            return Response(
                {'error': 'Необходимо указать circle_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from famcircle.models import FamilyCircle
            circle = FamilyCircle.objects.get(id=circle_id)
            family.circles.remove(circle)
            return Response({'message': 'Семья отключена от круга'})
        except FamilyCircle.DoesNotExist:
            return Response(
                {'error': 'Круг с таким ID не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


class FamilyMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet для управления членством в семьях"""
    serializer_class = FamilyMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Возвращаем членства текущего пользователя"""
        return FamilyMembership.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return FamilyMembershipUpdateSerializer
        return FamilyMembershipSerializer
    
    def perform_create(self, serializer):
        """Создание членства для текущего пользователя"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Выход из семьи"""
        membership = self.get_object()
        membership.status = 'left'
        membership.save()
        
        return Response({'message': 'Вы покинули семью'})
