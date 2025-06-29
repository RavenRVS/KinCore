from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import FamilyCircle, CircleFamilyMembership
from nucfamily.models import NuclearFamily, FamilyMembership
from .serializers import (
    FamilyCircleSerializer,
    FamilyCircleCreateSerializer,
    CircleFamilyMembershipSerializer,
    CircleJoinByIdSerializer,
    CircleFamilyMembershipUpdateSerializer
)


class FamilyCircleViewSet(viewsets.ModelViewSet):
    """ViewSet для управления семейными кругами"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Возвращаем круги, в которых участвует семья текущего пользователя"""
        # Для поиска, присоединения и создания не ограничиваем queryset
        if self.action in ['search_by_code', 'join', 'create']:
            return FamilyCircle.objects.all()
        
        # Для остальных действий возвращаем только круги семьи пользователя
        user = self.request.user
        user_families = NuclearFamily.objects.filter(
            memberships__user=user,
            memberships__status='active'
        )
        return FamilyCircle.objects.filter(
            family_memberships__family__in=user_families,
            family_memberships__status='active'
        ).distinct()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FamilyCircleCreateSerializer
        return FamilyCircleSerializer
    
    def perform_create(self, serializer):
        """Создание круга с автоматическим назначением админа через семью"""
        circle = serializer.save()
        # Создатель уже становится админом через свою семью в сериализаторе
        return circle
    
    @action(detail=False, methods=['post'])
    def search_by_code(self, request):
        """Поиск круга по коду присоединения"""
        join_code = request.data.get('join_code')
        if not join_code:
            return Response(
                {'error': 'Необходимо указать код присоединения'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            circle = FamilyCircle.objects.get(join_code=join_code)
            return Response({
                'id': circle.id,
                'name': circle.name,
                'join_code': circle.join_code
            })
        except FamilyCircle.DoesNotExist:
            return Response(
                {'error': 'Круг с таким кодом не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Присоединение семьи к кругу по коду и паролю"""
        # Получаем круг по ID, а не через get_object() (который фильтрует по участникам)
        try:
            circle = FamilyCircle.objects.get(id=pk)
        except FamilyCircle.DoesNotExist:
            return Response(
                {'error': 'Круг не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Передаем circle_id в контекст сериализатора
        context = {'request': request, 'circle_id': pk}
        serializer = CircleJoinByIdSerializer(data=request.data, context=context)
        
        if serializer.is_valid():
            membership = serializer.save()
            return Response({
                'message': 'Семья успешно присоединилась к кругу',
                'membership': CircleFamilyMembershipSerializer(membership).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def families(self, request, pk=None):
        """Получение списка семей в круге"""
        circle = self.get_object()
        memberships = circle.family_memberships.filter(status='active')
        serializer = CircleFamilyMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def regenerate_credentials(self, request, pk=None):
        """Регенерация кода и пароля для присоединения (только для админов)"""
        circle = self.get_object()
        user = request.user
        
        # Проверяем, является ли пользователь админом через свою семью
        user_families = NuclearFamily.objects.filter(
            memberships__user=user,
            memberships__status='active'
        )
        if not circle.family_memberships.filter(
            family__in=user_families,
            role='admin',
            status='active'
        ).exists():
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
        
        circle.join_code = join_code
        circle.join_password = hashed_password
        circle.save()
        
        return Response({
            'message': 'Учетные данные обновлены',
            'join_code': join_code,
            'join_password': join_password
        })


class CircleFamilyMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet для управления членством семей в кругах"""
    serializer_class = CircleFamilyMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Возвращаем членства семей текущего пользователя"""
        user = self.request.user
        user_families = NuclearFamily.objects.filter(
            memberships__user=user,
            memberships__status='active'
        )
        return CircleFamilyMembership.objects.filter(family__in=user_families)
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return CircleFamilyMembershipUpdateSerializer
        return CircleFamilyMembershipSerializer
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Выход семьи из круга"""
        membership = self.get_object()
        user = request.user
        
        # Проверяем права пользователя в семье
        family_membership = FamilyMembership.objects.get(
            user=user,
            family=membership.family,
            status='active'
        )
        
        if not family_membership.can_manage_circle_access:
            return Response(
                {'error': 'У вас нет прав для выхода семьи из круга'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        membership.status = 'left'
        membership.save()
        
        return Response({'message': 'Семья покинула круг'})
