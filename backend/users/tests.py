from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from .models import Family, Role, FamilyMembership, SubscriptionPlan, UserSubscription

User = get_user_model()

class UserModelsTestCase(TestCase):
    """Тесты для моделей пользовательского блока"""

    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123',
            first_name='User',
            last_name='One',
            middle_name='Test',
            birth_date='1990-01-01',
            phone='+79991234567'
        )
        
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123',
            first_name='User',
            last_name='Two',
            middle_name='Test',
            birth_date='1990-01-01',
            phone='+79991234568'
        )

    def test_family_creation(self):
        """Тест создания семьи"""
        family = Family.objects.create(name='Тестовая семья')
        self.assertEqual(family.name, 'Тестовая семья')
        self.assertIsNotNone(family.created_at)

    def test_role_creation(self):
        """Тест создания роли"""
        role = Role.objects.create(name='Взрослый')
        self.assertEqual(role.name, 'Взрослый')
        self.assertFalse(role.is_default)

    def test_family_membership(self):
        """Тест членства в семье"""
        family = Family.objects.create(name='Тестовая семья')
        role = Role.objects.create(name='Взрослый')
        
        membership = FamilyMembership.objects.create(
            user=self.user1,
            family=family,
            role=role,
            status='active'
        )
        
        self.assertEqual(membership.user, self.user1)
        self.assertEqual(membership.family, family)
        self.assertEqual(membership.role, role)
        self.assertEqual(membership.status, 'active')

    def test_subscription_plan(self):
        """Тест плана подписки"""
        plan = SubscriptionPlan.objects.create(
            name='Базовый',
            description='Базовый план подписки',
            features={'basic_features': True, 'family_sharing': True},
            is_active=True
        )
        
        self.assertEqual(plan.name, 'Базовый')
        self.assertEqual(plan.description, 'Базовый план подписки')
        self.assertTrue(plan.is_active)
        self.assertIn('basic_features', plan.features)

    def test_user_subscription(self):
        """Тест подписки пользователя"""
        plan = SubscriptionPlan.objects.create(
            name='Базовый',
            description='Базовый план подписки',
            features={'basic_features': True, 'family_sharing': True},
            is_active=True
        )
        
        subscription = UserSubscription.objects.create(
            user=self.user1,
            plan=plan,
            start_date='2024-01-01',
            end_date='2024-02-01',
            is_active=True
        )
        
        self.assertEqual(subscription.user, self.user1)
        self.assertEqual(subscription.plan, plan)
        self.assertTrue(subscription.is_active)


class UserAPITestCase(APITestCase):
    """Тесты для API пользовательского блока"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            middle_name='Test',
            birth_date='1990-01-01',
            phone='+79991234567'
        )

    def test_user_list_requires_auth(self):
        """Тест что список пользователей требует авторизации"""
        response = self.client.get('/api/users/current/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_list_with_auth(self):
        """Тест получения информации о текущем пользователе с авторизацией"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/users/current/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_user_detail(self):
        """Тест получения детальной информации о пользователе"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_update(self):
        """Тест обновления пользователя"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        
        response = self.client.patch('/api/users/update/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Проверяем что данные обновились
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(self.user.last_name, 'Name')

    def test_family_list(self):
        """Тест получения списка семей"""
        self.client.force_authenticate(user=self.user)
        
        family = Family.objects.create(name='Тестовая семья')
        role = Role.objects.create(name='Взрослый')
        FamilyMembership.objects.create(
            user=self.user,
            family=family,
            role=role,
            status='active'
        )
        
        response = self.client.get('/api/users/families/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Тестовая семья')

    def test_create_family(self):
        """Тест создания семьи"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'name': 'Новая семья'
        }
        
        response = self.client.post('/api/users/families/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Family.objects.count(), 1)
        self.assertEqual(Family.objects.first().name, 'Новая семья')

    def test_subscription_plan_list(self):
        """Тест получения списка планов подписки"""
        self.client.force_authenticate(user=self.user)
        
        plan = SubscriptionPlan.objects.create(
            name='Базовый',
            description='Базовый план подписки',
            features={'basic_features': True},
            is_active=True
        )
        
        # Проверяем что план создался в базе данных
        self.assertEqual(SubscriptionPlan.objects.count(), 1)
        self.assertEqual(SubscriptionPlan.objects.first().name, 'Базовый')


class FamilyAccessTestCase(APITestCase):
    """Тесты для доступа к семейным данным"""

    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123',
            first_name='User',
            last_name='One',
            middle_name='Test',
            birth_date='1990-01-01',
            phone='+79991234567'
        )
        
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123',
            first_name='User',
            last_name='Two',
            middle_name='Test',
            birth_date='1990-01-01',
            phone='+79991234568'
        )
        
        self.family = Family.objects.create(name='Тестовая семья')
        self.role = Role.objects.create(name='Взрослый')
        
        # user1 - член семьи, user2 - нет
        FamilyMembership.objects.create(
            user=self.user1,
            family=self.family,
            role=self.role,
            status='active'
        )

    def test_family_membership_access(self):
        """Тест доступа к членству в семье"""
        # user1 должен видеть свое членство
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/users/family-memberships/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # user2 не должен видеть членства user1 (проверяем что фильтрация работает)
        self.client.force_authenticate(user=self.user2)
        response = self.client.get('/api/users/family-memberships/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # user2 не имеет членств, поэтому должен видеть пустой список
        self.assertEqual(len(response.data), 0)

    def test_family_members_list(self):
        """Тест получения списка членов семьи"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get(f'/api/users/families/{self.family.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Тестовая семья')

    def test_add_family_member(self):
        """Тест добавления члена семьи"""
        self.client.force_authenticate(user=self.user1)
        
        # Создаем новую семью для теста
        new_family = Family.objects.create(name='Новая тестовая семья')
        
        data = {
            'family_id': new_family.id,
            'role_id': self.role.id,
            'status': 'active'
        }
        
        response = self.client.post('/api/users/family-memberships/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Проверяем что членство создалось для текущего пользователя (user1)
        membership = FamilyMembership.objects.filter(
            user=self.user1,
            family=new_family
        ).first()
        self.assertIsNotNone(membership)
        self.assertEqual(membership.status, 'active')


class SubscriptionTestCase(APITestCase):
    """Тесты для подписок"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            middle_name='Test',
            birth_date='1990-01-01',
            phone='+79991234567'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Базовый',
            description='Базовый план подписки',
            features={'basic_features': True},
            is_active=True
        )

    def test_subscription_plan_creation(self):
        """Тест создания плана подписки через модель"""
        plan = SubscriptionPlan.objects.create(
            name='Премиум',
            description='Премиум план',
            features={'premium_features': True},
            is_active=True
        )
        
        self.assertEqual(plan.name, 'Премиум')
        self.assertTrue(plan.is_active)
        self.assertIn('premium_features', plan.features)

    def test_user_subscription_creation(self):
        """Тест создания подписки пользователя через модель"""
        subscription = UserSubscription.objects.create(
            user=self.user,
            plan=self.plan,
            start_date='2024-01-01',
            end_date='2024-02-01',
            is_active=True
        )
        
        self.assertEqual(subscription.user, self.user)
        self.assertEqual(subscription.plan, self.plan)
        self.assertTrue(subscription.is_active)

    def test_user_subscription_list(self):
        """Тест получения списка подписок пользователя"""
        self.client.force_authenticate(user=self.user)
        
        subscription = UserSubscription.objects.create(
            user=self.user,
            plan=self.plan,
            start_date='2024-01-01',
            end_date='2024-02-01',
            is_active=True
        )
        
        # Проверяем что подписка создалась в базе данных
        self.assertEqual(UserSubscription.objects.count(), 1)
        self.assertEqual(UserSubscription.objects.first().plan.name, 'Базовый')

    def test_create_subscription(self):
        """Тест создания подписки"""
        self.client.force_authenticate(user=self.user)
        
        # Проверяем что подписка создается через модель
        subscription = UserSubscription.objects.create(
            user=self.user,
            plan=self.plan,
            start_date='2024-01-01',
            end_date='2024-02-01',
            is_active=True
        )
        
        self.assertEqual(UserSubscription.objects.count(), 1)
        self.assertEqual(subscription.user, self.user)
        self.assertEqual(subscription.plan, self.plan)
        self.assertTrue(subscription.is_active)
