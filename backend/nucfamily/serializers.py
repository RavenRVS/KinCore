from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import NuclearFamily, FamilyMembership
from django.contrib.auth.hashers import make_password, check_password
import secrets
import string

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для отображения данных пользователя"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                 'middle_name', 'birth_date', 'phone', 'full_name',
                 'avatar', 'bio', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class FamilyMembershipSerializer(serializers.ModelSerializer):
    """Сериализатор для членства в нуклеарной семье"""
    user = UserSerializer(read_only=True)
    family_name = serializers.CharField(source='family.name', read_only=True)
    
    class Meta:
        model = FamilyMembership
        fields = [
            'id', 'user', 'family', 'family_name', 'role', 'status', 
            'joined_at', 'left_at', 'can_join_circles', 'can_share_to_circles', 'can_manage_circle_access'
        ]
        read_only_fields = ['id', 'user', 'joined_at', 'left_at']


class NuclearFamilySerializer(serializers.ModelSerializer):
    """Сериализатор для нуклеарной семьи"""
    memberships = FamilyMembershipSerializer(many=True, read_only=True)
    members_count = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    circles = serializers.SerializerMethodField()
    user_can_join_circles = serializers.SerializerMethodField()
    user_can_share_to_circles = serializers.SerializerMethodField()
    user_can_manage_circle_access = serializers.SerializerMethodField()
    
    class Meta:
        model = NuclearFamily
        fields = [
            'id', 'name', 'description', 'join_code', 'join_password',
            'created_at', 'updated_at', 'memberships', 'members_count', 
            'is_admin', 'user_role', 'circles', 'user_can_join_circles',
            'user_can_share_to_circles', 'user_can_manage_circle_access'
        ]
        read_only_fields = ['id', 'join_code', 'join_password', 'created_at', 'updated_at']
    
    def get_members_count(self, obj):
        return obj.memberships.filter(status='active').count()
    
    def get_is_admin(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.memberships.filter(
                user=request.user, 
                role='admin', 
                status='active'
            ).exists()
        return False
    
    def get_user_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(
                user=request.user, 
                status='active'
            ).first()
            return membership.role if membership else None
        return None
    
    def get_circles(self, obj):
        # Получаем круги через CircleFamilyMembership
        from famcircle.models import CircleFamilyMembership
        memberships = CircleFamilyMembership.objects.filter(
            family=obj,
            status='active'
        ).select_related('circle')
        return [{'id': membership.circle.id, 'name': membership.circle.name} for membership in memberships]
    
    def get_user_can_join_circles(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(
                user=request.user, 
                status='active'
            ).first()
            return membership.can_join_circles if membership else False
        return False
    
    def get_user_can_share_to_circles(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(
                user=request.user, 
                status='active'
            ).first()
            return membership.can_share_to_circles if membership else False
        return False
    
    def get_user_can_manage_circle_access(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(
                user=request.user, 
                status='active'
            ).first()
            return membership.can_manage_circle_access if membership else False
        return False


class NuclearFamilyCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания нуклеарной семьи"""
    
    class Meta:
        model = NuclearFamily
        fields = ['name', 'description']
    
    def create(self, validated_data):
        # Генерируем уникальный код для присоединения
        join_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        # Генерируем пароль для присоединения
        join_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(6))
        hashed_password = make_password(join_password)
        
        # Создаем семью
        family = NuclearFamily.objects.create(
            **validated_data,
            join_code=join_code,
            join_password=hashed_password
        )
        
        # Создатель становится админом с полными правами
        user = self.context['request'].user
        FamilyMembership.objects.create(
            user=user,
            family=family,
            role='admin',
            status='active',
            can_join_circles=True,
            can_share_to_circles=True,
            can_manage_circle_access=True
        )
        
        # Возвращаем пароль в открытом виде для показа пользователю
        family.join_password = join_password
        return family


class FamilyJoinByIdSerializer(serializers.Serializer):
    """Сериализатор для присоединения к семье по ID и паролю"""
    join_password = serializers.CharField(max_length=128)
    
    def validate(self, attrs):
        join_password = attrs.get('join_password')
        family_id = self.context.get('family_id')
        
        try:
            family = NuclearFamily.objects.get(id=family_id)
        except NuclearFamily.DoesNotExist:
            raise serializers.ValidationError('Семья не найдена')
        
        if not check_password(join_password, family.join_password):
            raise serializers.ValidationError('Неверный пароль')
        
        # Проверяем, не является ли пользователь уже участником
        user = self.context['request'].user
        if FamilyMembership.objects.filter(user=user, family=family).exists():
            raise serializers.ValidationError('Вы уже являетесь участником этой семьи')
        
        attrs['family'] = family
        return attrs
    
    def create(self, validated_data):
        family = validated_data['family']
        user = self.context['request'].user
        
        # Создаем членство с базовыми правами
        membership = FamilyMembership.objects.create(
            user=user,
            family=family,
            role='parent',  # По умолчанию родитель
            status='active',
            can_join_circles=False,  # По умолчанию без прав на круги
            can_share_to_circles=False,
            can_manage_circle_access=False
        )
        
        return membership


class FamilyMembershipUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления членства в семье"""
    
    class Meta:
        model = FamilyMembership
        fields = ['role', 'status', 'can_join_circles', 'can_share_to_circles', 'can_manage_circle_access']
        read_only_fields = ['id', 'user', 'family', 'joined_at', 'left_at']


class FamilyCircleConnectionSerializer(serializers.ModelSerializer):
    """Сериализатор для подключения семьи к кругу"""
    circle_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = NuclearFamily
        fields = ['id', 'name', 'circles', 'circle_id']
        read_only_fields = ['id', 'name', 'circles']
    
    def update(self, instance, validated_data):
        circle_id = validated_data.pop('circle_id')
        user = self.context['request'].user
        
        try:
            from famcircle.models import FamilyCircle, CircleFamilyMembership
            circle = FamilyCircle.objects.get(id=circle_id)
            
            # Проверяем права пользователя в семье
            family_membership = FamilyMembership.objects.get(
                user=user,
                family=instance,
                status='active'
            )
            
            if not family_membership.can_join_circles:
                raise serializers.ValidationError('У вас нет прав для присоединения семьи к кругам')
            
            # Создаем членство семьи в круге
            CircleFamilyMembership.objects.create(
                family=instance,
                circle=circle,
                role='member',
                status='active',
                added_by=user
            )
            
        except FamilyCircle.DoesNotExist:
            raise serializers.ValidationError('Круг с таким ID не найден')
        except FamilyMembership.DoesNotExist:
            raise serializers.ValidationError('Вы не являетесь членом этой семьи')
        
        return instance 