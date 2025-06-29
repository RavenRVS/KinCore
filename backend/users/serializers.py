from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, UserProfile, Family, FamilyMembership, UserDataVisibility


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации пользователя"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'middle_name', 'birth_date', 'phone'
        ]
        extra_kwargs = {
            'username': {'required': True},
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'middle_name': {'required': True},
            'birth_date': {'required': True},
            'phone': {'required': True},
        }
    
    def validate(self, attrs):
        """Проверка совпадения паролей"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Пароли не совпадают")
        return attrs
    
    def create(self, validated_data):
        """Создание пользователя"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        
        # Создаем профиль пользователя
        UserProfile.objects.create(user=user)
        
        # Создаем настройки видимости данных по умолчанию
        UserDataVisibility.objects.create(user=user)
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """Сериализатор для авторизации пользователя"""
    login = serializers.CharField(help_text="Email или номер телефона")
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        login = attrs.get('login')
        password = attrs.get('password')
        
        if login and password:
            # Пытаемся найти пользователя по email или телефону
            try:
                if '@' in login:
                    user = User.objects.get(email=login)
                else:
                    user = User.objects.get(phone=login)
            except User.DoesNotExist:
                raise serializers.ValidationError('Пользователь не найден')
            
            # Проверяем пароль
            user = authenticate(username=user.username, password=password)
            if not user:
                raise serializers.ValidationError('Неверный пароль')
            
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Необходимо указать логин и пароль')
        
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для отображения данных пользователя"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'middle_name', 'birth_date', 'phone', 'full_name',
            'avatar', 'bio', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class UserProfileSerializer(serializers.ModelSerializer):
    """Сериализатор для профиля пользователя"""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления данных пользователя"""
    avatar = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'middle_name', 'birth_date', 
            'phone', 'email', 'avatar', 'bio'
        ]
        read_only_fields = ['id', 'username', 'created_at']
    
    def validate_email(self, value):
        """Проверяем уникальность email"""
        user = self.context['request'].user
        if User.objects.exclude(id=user.id).filter(email=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует")
        return value
    
    def validate_phone(self, value):
        """Проверяем уникальность телефона"""
        user = self.context['request'].user
        if User.objects.exclude(id=user.id).filter(phone=value).exists():
            raise serializers.ValidationError("Пользователь с таким телефоном уже существует")
        return value


class UserDataVisibilitySerializer(serializers.ModelSerializer):
    """Сериализатор для управления видимостью данных пользователя"""
    
    class Meta:
        model = UserDataVisibility
        fields = [
            'first_name_visibility', 'last_name_visibility', 'middle_name_visibility',
            'birth_date_visibility', 'phone_visibility', 'email_visibility',
            'avatar_visibility', 'bio_visibility', 'address_visibility',
            'company_visibility', 'position_visibility'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']


class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class FamilyMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    family = FamilySerializer(read_only=True)
    family_id = serializers.PrimaryKeyRelatedField(queryset=Family.objects.all(), source='family', write_only=True)

    class Meta:
        model = FamilyMembership
        fields = [
            'id', 'user', 'family', 'status', 'joined_at', 'left_at',
            'family_id'
        ]
        read_only_fields = ['id', 'user', 'joined_at', 'left_at'] 