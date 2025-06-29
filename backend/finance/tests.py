from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from .models import (
    Asset, AssetType, Category, Currency, Fund, Liability, LiabilityType,
    Income, Expense, FinanceLog
)
from users.models import Family, Role, FamilyMembership

User = get_user_model()

class FinanceModelsTestCase(TestCase):
    """Тесты для методов расчета в моделях"""

    def setUp(self):
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
        
        self.currency = Currency.objects.create(
            code='RUB',
            name='Российский рубль',
            symbol='₽',
            is_default=True
        )
        
        self.asset_type = AssetType.objects.create(
            name='Недвижимость',
            is_base=True
        )
        
        self.category = Category.objects.create(
            name='Жилье',
            type='asset',
            owner=self.user
        )

    def test_asset_roi_calculation(self):
        """Тест расчета ROI актива"""
        asset = Asset.objects.create(
            name='Квартира',
            type=self.asset_type,
            category=self.category,
            purchase_value=Decimal('5000000.00'),
            purchase_currency=self.currency,
            current_value=Decimal('6000000.00'),
            current_currency=self.currency,
            owner=self.user
        )
        
        expected_roi = Decimal('20.00')  # (6000000 - 5000000) / 5000000 * 100
        self.assertEqual(asset.calculate_roi(), expected_roi)

    def test_asset_income_expense_calculation(self):
        """Тест расчета доходов и расходов по активу"""
        asset = Asset.objects.create(
            name='Квартира',
            type=self.asset_type,
            category=self.category,
            purchase_value=Decimal('5000000.00'),
            purchase_currency=self.currency,
            current_value=Decimal('6000000.00'),
            current_currency=self.currency,
            owner=self.user
        )
        
        # Создаем доходы и расходы
        Income.objects.create(
            name='Аренда',
            amount=Decimal('50000.00'),
            currency=self.currency,
            date='2024-06-01',
            asset=asset,
            owner=self.user
        )
        
        Expense.objects.create(
            name='Коммунальные платежи',
            amount=Decimal('15000.00'),
            currency=self.currency,
            date='2024-06-01',
            asset=asset,
            owner=self.user
        )
        
        self.assertEqual(asset.get_total_income(), Decimal('50000.00'))
        self.assertEqual(asset.get_total_expenses(), Decimal('15000.00'))
        self.assertEqual(asset.get_net_income(), Decimal('35000.00'))

    def test_fund_progress_calculation(self):
        """Тест расчета прогресса фонда"""
        fund = Fund.objects.create(
            name='Отпуск',
            goal=Decimal('300000.00'),
            current_value=Decimal('150000.00'),
            currency=self.currency,
            owner=self.user
        )
        
        self.assertEqual(fund.get_progress_percentage(), Decimal('50.00'))
        self.assertEqual(fund.get_remaining_amount(), Decimal('150000.00'))

    def test_liability_calculations(self):
        """Тест расчетов по пассиву"""
        liability_type = LiabilityType.objects.create(
            name='Кредит',
            is_base=True
        )
        
        liability = Liability.objects.create(
            name='Ипотека',
            type=liability_type,
            initial_amount=Decimal('5000000.00'),
            currency=self.currency,
            open_date='2024-01-01',
            current_debt=Decimal('4500000.00'),
            owner=self.user
        )
        
        # Проверяем что метод возвращает правильное значение
        # get_remaining_principal должен возвращать разницу между initial_amount и current_debt
        expected_remaining = liability.initial_amount - liability.current_debt
        self.assertEqual(liability.get_remaining_principal(), expected_remaining)
        self.assertTrue(liability.has_unlinked_expenses())


class FinanceAPITestCase(APITestCase):
    """Тесты для API финансового блока"""

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
        
        self.currency = Currency.objects.create(
            code='RUB',
            name='Российский рубль',
            symbol='₽',
            is_default=True
        )
        
        self.asset_type = AssetType.objects.create(
            name='Недвижимость',
            is_base=True
        )
        
        self.category = Category.objects.create(
            name='Жилье',
            type='asset',
            owner=self.user
        )

    def test_asset_list_requires_auth(self):
        """Тест что список активов требует авторизации"""
        response = self.client.get('/api/finance/assets/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_asset_list_with_auth(self):
        """Тест получения списка активов с авторизацией"""
        self.client.force_authenticate(user=self.user)
        
        # Создаем актив
        Asset.objects.create(
            name='Квартира',
            type=self.asset_type,
            category=self.category,
            purchase_value=Decimal('5000000.00'),
            purchase_currency=self.currency,
            current_value=Decimal('6000000.00'),
            current_currency=self.currency,
            owner=self.user
        )
        
        response = self.client.get('/api/finance/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Квартира')

    def test_create_asset(self):
        """Тест создания актива"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'name': 'Квартира',
            'type': self.asset_type.id,
            'category': self.category.id,
            'purchase_value': '5000000.00',
            'purchase_currency': self.currency.id,
            'current_value': '6000000.00',
            'current_currency': self.currency.id,
            'is_family': False
        }
        
        response = self.client.post('/api/finance/assets/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Asset.objects.count(), 1)
        self.assertEqual(Asset.objects.first().owner, self.user)

    def test_dashboard_summary(self):
        """Тест получения сводки дашборда"""
        self.client.force_authenticate(user=self.user)
        
        # Создаем актив
        Asset.objects.create(
            name='Квартира',
            type=self.asset_type,
            category=self.category,
            purchase_value=Decimal('5000000.00'),
            purchase_currency=self.currency,
            current_value=Decimal('6000000.00'),
            current_currency=self.currency,
            owner=self.user
        )
        
        response = self.client.get('/api/finance/dashboard/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['total_assets']), Decimal('6000000.00'))
        self.assertEqual(Decimal(response.data['net_worth']), Decimal('6000000.00'))

    def test_finance_log_creation(self):
        """Тест автоматического создания логов при изменении"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'name': 'Квартира',
            'type': self.asset_type.id,
            'category': self.category.id,
            'purchase_value': '5000000.00',
            'purchase_currency': self.currency.id,
            'current_value': '6000000.00',
            'current_currency': self.currency.id,
            'is_family': False
        }
        
        response = self.client.post('/api/finance/assets/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Проверяем что создался лог
        self.assertEqual(FinanceLog.objects.count(), 1)
        log = FinanceLog.objects.first()
        self.assertEqual(log.action, 'create')
        self.assertEqual(log.entity_type, 'Asset')
        self.assertEqual(log.user, self.user)


class FamilyAccessTestCase(APITestCase):
    """Тесты для доступа к семейным объектам"""

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
        
        self.currency = Currency.objects.create(
            code='RUB',
            name='Российский рубль',
            symbol='₽',
            is_default=True
        )
        
        self.asset_type = AssetType.objects.create(
            name='Недвижимость',
            is_base=True
        )

    def test_family_asset_access(self):
        """Тест доступа к семейным активам"""
        # Создаем семейный актив
        asset = Asset.objects.create(
            name='Семейная квартира',
            type=self.asset_type,
            purchase_value=Decimal('5000000.00'),
            purchase_currency=self.currency,
            current_value=Decimal('6000000.00'),
            current_currency=self.currency,
            family=self.family,
            is_family=True
        )
        
        # user1 (член семьи) должен видеть актив
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/finance/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # user2 (не член семьи) не должен видеть актив
        self.client.force_authenticate(user=self.user2)
        response = self.client.get('/api/finance/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_family_asset_without_membership(self):
        """Тест создания семейного актива без членства в семье"""
        self.client.force_authenticate(user=self.user2)  # user2 не член семьи
        
        data = {
            'name': 'Семейная квартира',
            'type': self.asset_type.id,
            'purchase_value': '5000000.00',
            'purchase_currency': self.currency.id,
            'current_value': '6000000.00',
            'current_currency': self.currency.id,
            'is_family': True,
            'family': self.family.id
        }
        
        response = self.client.post('/api/finance/assets/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
