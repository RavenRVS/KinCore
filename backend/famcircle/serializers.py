from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import FamilyCircle, CircleFamilyMembership
from nucfamily.models import NuclearFamily, FamilyMembership
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


class CircleFamilyMembershipSerializer(serializers.ModelSerializer):
    """Сериализатор для членства семьи в круге"""
    family_name = serializers.CharField(source='family.name', read_only=True)
    added_by_name = serializers.CharField(source='added_by.get_full_name', read_only=True)
    
    class Meta:
        model = CircleFamilyMembership
        fields = [
            'id', 'family', 'family_name', 'circle', 'role', 'status', 
            'joined_at', 'left_at', 'added_by', 'added_by_name'
        ]
        read_only_fields = ['id', 'joined_at', 'left_at']


class FamilyCircleSerializer(serializers.ModelSerializer):
    """Сериализатор для семейного круга"""
    family_memberships = CircleFamilyMembershipSerializer(many=True, read_only=True)
    families_count = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    user_family_role = serializers.SerializerMethodField()
    
    class Meta:
        model = FamilyCircle
        fields = [
            'id', 'name', 'description', 'join_code', 'join_password',
            'created_at', 'updated_at', 'family_memberships', 'families_count', 
            'is_admin', 'user_role', 'user_family_role'
        ]
        read_only_fields = ['id', 'join_code', 'join_password', 'created_at', 'updated_at']
    
    def get_families_count(self, obj):
        return obj.family_memberships.filter(status='active').count()
    
    def get_is_admin(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Проверяем, является ли пользователь админом через свою семью
            user_families = NuclearFamily.objects.filter(
                memberships__user=request.user,
                memberships__status='active'
            )
            return obj.family_memberships.filter(
                family__in=user_families,
                role='admin',
                status='active'
            ).exists()
        return False
    
    def get_user_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Получаем роль пользователя через его семью
            user_families = NuclearFamily.objects.filter(
                memberships__user=request.user,
                memberships__status='active'
            )
            membership = obj.family_memberships.filter(
                family__in=user_families,
                status='active'
            ).first()
            return membership.role if membership else None
        return None
    
    def get_user_family_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Получаем роль пользователя в его семье
            family_membership = FamilyMembership.objects.filter(
                user=request.user,
                status='active'
            ).first()
            return family_membership.role if family_membership else None
        return None


class FamilyCircleCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания семейного круга"""
    
    class Meta:
        model = FamilyCircle
        fields = ['name', 'description']
    
    def create(self, validated_data):
        # Генерируем уникальный код для присоединения
        join_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        # Генерируем пароль для присоединения
        join_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(6))
        hashed_password = make_password(join_password)
        
        # Создаем круг
        circle = FamilyCircle.objects.create(
            **validated_data,
            join_code=join_code,
            join_password=hashed_password
        )
        
        # Создатель становится админом через свою семью
        user = self.context['request'].user
        user_family = NuclearFamily.objects.filter(
            memberships__user=user,
            memberships__status='active'
        ).first()
        
        if user_family:
            CircleFamilyMembership.objects.create(
                family=user_family,
                circle=circle,
                role='admin',
                status='active',
                added_by=user
            )
        
        # Возвращаем пароль в открытом виде для показа пользователю
        circle.join_password = join_password
        return circle


class CircleJoinByIdSerializer(serializers.Serializer):
    """Сериализатор для присоединения семьи к кругу по ID и паролю"""
    join_password = serializers.CharField(max_length=128)
    
    def validate(self, attrs):
        join_password = attrs.get('join_password')
        circle_id = self.context.get('circle_id')
        user = self.context['request'].user
        
        # Проверяем, что пользователь состоит в семье
        user_family = NuclearFamily.objects.filter(
            memberships__user=user,
            memberships__status='active'
        ).first()
        
        if not user_family:
            raise serializers.ValidationError(
                'Для присоединения к кругу необходимо сначала присоединиться к семье или создать свою'
            )
        
        # Проверяем права пользователя в семье
        family_membership = FamilyMembership.objects.get(
            user=user,
            family=user_family,
            status='active'
        )
        
        if not family_membership.can_join_circles:
            raise serializers.ValidationError(
                'У вас нет прав для присоединения семьи к кругам'
            )
        
        try:
            circle = FamilyCircle.objects.get(id=circle_id)
        except FamilyCircle.DoesNotExist:
            raise serializers.ValidationError('Круг не найден')
        
        if not check_password(join_password, circle.join_password):
            raise serializers.ValidationError('Неверный пароль')
        
        # Проверяем, не является ли семья уже участником
        if CircleFamilyMembership.objects.filter(family=user_family, circle=circle).exists():
            raise serializers.ValidationError('Ваша семья уже является участником этого круга')
        
        attrs['circle'] = circle
        attrs['family'] = user_family
        return attrs
    
    def create(self, validated_data):
        circle = validated_data['circle']
        family = validated_data['family']
        user = self.context['request'].user
        
        # Создаем членство семьи в круге
        membership = CircleFamilyMembership.objects.create(
            family=family,
            circle=circle,
            role='member',
            status='active',
            added_by=user
        )
        
        return membership


class CircleJoinSerializer(serializers.Serializer):
    """Сериализатор для присоединения семьи к кругу по коду и паролю"""
    join_code = serializers.CharField(max_length=32)
    join_password = serializers.CharField(max_length=128)
    
    def validate(self, attrs):
        join_code = attrs.get('join_code')
        join_password = attrs.get('join_password')
        user = self.context['request'].user
        
        # Проверяем, что пользователь состоит в семье
        user_family = NuclearFamily.objects.filter(
            memberships__user=user,
            memberships__status='active'
        ).first()
        
        if not user_family:
            raise serializers.ValidationError(
                'Для присоединения к кругу необходимо сначала присоединиться к семье или создать свою'
            )
        
        # Проверяем права пользователя в семье
        family_membership = FamilyMembership.objects.get(
            user=user,
            family=user_family,
            status='active'
        )
        
        if not family_membership.can_join_circles:
            raise serializers.ValidationError(
                'У вас нет прав для присоединения семьи к кругам'
            )
        
        try:
            circle = FamilyCircle.objects.get(join_code=join_code)
        except FamilyCircle.DoesNotExist:
            raise serializers.ValidationError('Круг с таким кодом не найден')
        
        if not check_password(join_password, circle.join_password):
            raise serializers.ValidationError('Неверный пароль')
        
        # Проверяем, не является ли семья уже участником
        if CircleFamilyMembership.objects.filter(family=user_family, circle=circle).exists():
            raise serializers.ValidationError('Ваша семья уже является участником этого круга')
        
        attrs['circle'] = circle
        attrs['family'] = user_family
        return attrs
    
    def create(self, validated_data):
        circle = validated_data['circle']
        family = validated_data['family']
        user = self.context['request'].user
        
        # Создаем членство семьи в круге
        membership = CircleFamilyMembership.objects.create(
            family=family,
            circle=circle,
            role='member',
            status='active',
            added_by=user
        )
        
        return membership


class CircleFamilyMembershipUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления членства семьи в круге"""
    
    class Meta:
        model = CircleFamilyMembership
        fields = ['role', 'status']
        read_only_fields = ['id', 'family', 'circle', 'joined_at', 'left_at'] 