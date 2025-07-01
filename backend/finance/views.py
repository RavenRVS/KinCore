from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import (
    Category, Currency, CurrencyRate, AssetType, Asset, AssetValueHistory, AssetShare, Fund,
    LiabilityType, Liability, LiabilityPayment, Income, Expense, FinanceLog, FinancialGoal, BudgetPlan
)
from .serializers import (
    CategorySerializer, CurrencySerializer, CurrencyRateSerializer, AssetTypeSerializer, AssetSerializer,
    AssetValueHistorySerializer, AssetShareSerializer, FundSerializer, LiabilityTypeSerializer, LiabilitySerializer,
    LiabilityPaymentSerializer, IncomeSerializer, ExpenseSerializer, FinanceLogSerializer, FinancialGoalSerializer, BudgetPlanSerializer
)
from nucfamily.models import FamilyMembership
from django.db import models
from rest_framework import serializers
import json
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from decimal import Decimal

# Create your views here.

class FamilyUserQuerysetMixin:
    """
    Миксин для фильтрации объектов по owner (user) и family (где пользователь член семьи)
    """
    def get_queryset(self):
        user = self.request.user
        # Получаем id семей, где пользователь активный член
        family_ids = FamilyMembership.objects.filter(user=user, status='active').values_list('family_id', flat=True)
        # Фильтруем: либо owner=user, либо family в family_ids
        return self.queryset.filter(
            models.Q(owner=user) |
            models.Q(family__in=family_ids, is_family=True)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        family = self.request.data.get('family')
        is_family = self.request.data.get('is_family', False)
        if is_family and family:
            # Проверяем, что пользователь член этой семьи
            if not FamilyMembership.objects.filter(user=user, family_id=family, status='active').exists():
                raise serializers.ValidationError('Вы не являетесь членом выбранной семьи')
            serializer.save(owner=None, family_id=family, is_family=True)
        else:
            serializer.save(owner=user, family=None, is_family=False)

class LoggableViewSetMixin:
    """
    Миксин для автоматического логирования изменений в FinanceLog
    """
    def log_action(self, action, instance, data_before=None, data_after=None):
        FinanceLog.objects.create(
            entity_type=instance.__class__.__name__,
            entity_id=instance.pk,
            action=action,
            user=self.request.user,
            data_before=data_before,
            data_after=data_after
        )

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self.log_action('create', serializer.instance, data_before=None, data_after=serializer.data)

    def perform_update(self, serializer):
        # Получаем данные до изменений
        instance = self.get_object()
        data_before = self.get_serializer(instance).data
        super().perform_update(serializer)
        self.log_action('update', serializer.instance, data_before=data_before, data_after=serializer.data)

    def perform_destroy(self, instance):
        data_before = self.get_serializer(instance).data
        super().perform_destroy(instance)
        self.log_action('delete', instance, data_before=data_before, data_after=None)

class CategoryViewSet(LoggableViewSetMixin, FamilyUserQuerysetMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [permissions.IsAuthenticated]

class CurrencyRateViewSet(viewsets.ModelViewSet):
    queryset = CurrencyRate.objects.all()
    serializer_class = CurrencyRateSerializer
    permission_classes = [permissions.IsAuthenticated]

class AssetTypeViewSet(viewsets.ModelViewSet):
    queryset = AssetType.objects.all()
    serializer_class = AssetTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

class AssetViewSet(LoggableViewSetMixin, FamilyUserQuerysetMixin, viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]

class AssetValueHistoryViewSet(viewsets.ModelViewSet):
    queryset = AssetValueHistory.objects.all()
    serializer_class = AssetValueHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

class AssetShareViewSet(viewsets.ModelViewSet):
    queryset = AssetShare.objects.all()
    serializer_class = AssetShareSerializer
    permission_classes = [permissions.IsAuthenticated]

class FundViewSet(LoggableViewSetMixin, FamilyUserQuerysetMixin, viewsets.ModelViewSet):
    queryset = Fund.objects.all()
    serializer_class = FundSerializer
    permission_classes = [permissions.IsAuthenticated]

class LiabilityTypeViewSet(viewsets.ModelViewSet):
    queryset = LiabilityType.objects.all()
    serializer_class = LiabilityTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

class LiabilityViewSet(LoggableViewSetMixin, FamilyUserQuerysetMixin, viewsets.ModelViewSet):
    queryset = Liability.objects.all()
    serializer_class = LiabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

class LiabilityPaymentViewSet(viewsets.ModelViewSet):
    queryset = LiabilityPayment.objects.all()
    serializer_class = LiabilityPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

class IncomeViewSet(LoggableViewSetMixin, FamilyUserQuerysetMixin, viewsets.ModelViewSet):
    queryset = Income.objects.all()
    serializer_class = IncomeSerializer
    permission_classes = [permissions.IsAuthenticated]

class ExpenseViewSet(LoggableViewSetMixin, FamilyUserQuerysetMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

class FinanceLogViewSet(viewsets.ModelViewSet):
    queryset = FinanceLog.objects.all()
    serializer_class = FinanceLogSerializer
    permission_classes = [permissions.IsAuthenticated]

class FinancialGoalViewSet(viewsets.ModelViewSet):
    queryset = FinancialGoal.objects.all()
    serializer_class = FinancialGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

class BudgetPlanViewSet(viewsets.ModelViewSet):
    queryset = BudgetPlan.objects.all()
    serializer_class = BudgetPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet для финансового дашборда с агрегированными данными
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Используем ту же логику фильтрации, что и в FamilyUserQuerysetMixin
        user = self.request.user
        family_ids = FamilyMembership.objects.filter(user=user, status='active').values_list('family_id', flat=True)
        return Asset.objects.filter(
            models.Q(owner=user) |
            models.Q(family__in=family_ids, is_family=True)
        ).distinct()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Получить общую сводку финансового состояния"""
        user = request.user
        family_ids = FamilyMembership.objects.filter(user=user, status='active').values_list('family_id', flat=True)
        
        # Общий капитал (активы + фонды - пассивы)
        total_assets = Asset.objects.filter(
            models.Q(owner=user) | models.Q(family__in=family_ids, is_family=True)
        ).aggregate(total=Sum('current_value'))['total'] or Decimal('0.00')
        
        total_funds = Fund.objects.filter(
            models.Q(owner=user) | models.Q(family__in=family_ids, is_family=True)
        ).aggregate(total=Sum('current_value'))['total'] or Decimal('0.00')
        
        total_liabilities = Liability.objects.filter(
            models.Q(owner=user) | models.Q(family__in=family_ids, is_family=True)
        ).aggregate(total=Sum('current_debt'))['total'] or Decimal('0.00')
        
        net_worth = total_assets + total_funds - total_liabilities
        
        # Структура активов по типам
        assets_by_type = Asset.objects.filter(
            models.Q(owner=user) | models.Q(family__in=family_ids, is_family=True)
        ).values('type__name').annotate(
            total_value=Sum('current_value'),
            count=Count('id')
        )
        
        # Предупреждения
        warnings = []
        unlinked_liabilities = Liability.objects.filter(
            models.Q(owner=user) | models.Q(family__in=family_ids, is_family=True)
        ).filter(expenses__isnull=True)
        
        if unlinked_liabilities.exists():
            warnings.append({
                'type': 'unlinked_expenses',
                'message': f'У {unlinked_liabilities.count()} пассивов нет привязанных расходов',
                'count': unlinked_liabilities.count()
            })
        
        return Response({
            'net_worth': net_worth,
            'total_assets': total_assets,
            'total_funds': total_funds,
            'total_liabilities': total_liabilities,
            'assets_by_type': list(assets_by_type),
            'warnings': warnings
        })

    @action(detail=False, methods=['get'])
    def funds_progress(self, request):
        """Получить прогресс по фондам"""
        user = request.user
        family_ids = FamilyMembership.objects.filter(user=user, status='active').values_list('family_id', flat=True)
        
        funds = Fund.objects.filter(
            models.Q(owner=user) | models.Q(family__in=family_ids, is_family=True)
        )
        
        funds_data = []
        for fund in funds:
            funds_data.append({
                'id': fund.id,
                'name': fund.name,
                'current_value': fund.current_value,
                'goal': fund.goal,
                'progress_percentage': fund.get_progress_percentage(),
                'remaining_amount': fund.get_remaining_amount(),
                'days_until_target': fund.get_days_until_target(),
                'monthly_savings_needed': fund.get_monthly_savings_needed()
            })
        
        return Response(funds_data)

    @action(detail=False, methods=['get'])
    def liabilities_summary(self, request):
        """Получить сводку по пассивам"""
        user = request.user
        family_ids = FamilyMembership.objects.filter(user=user, status='active').values_list('family_id', flat=True)
        
        liabilities = Liability.objects.filter(
            models.Q(owner=user) | models.Q(family__in=family_ids, is_family=True)
        )
        
        total_initial = liabilities.aggregate(total=Sum('initial_amount'))['total'] or Decimal('0.00')
        total_current_debt = liabilities.aggregate(total=Sum('current_debt'))['total'] or Decimal('0.00')
        total_paid = total_initial - total_current_debt
        
        liabilities_data = []
        for liability in liabilities:
            liabilities_data.append({
                'id': liability.id,
                'name': liability.name,
                'initial_amount': liability.initial_amount,
                'current_debt': liability.current_debt,
                'total_paid': liability.get_total_payments(),
                'principal_paid': liability.get_total_principal_paid(),
                'interest_paid': liability.get_total_interest_paid(),
                'has_unlinked_expenses': liability.has_unlinked_expenses()
            })
        
        return Response({
            'total_initial_amount': total_initial,
            'total_current_debt': total_current_debt,
            'total_paid': total_paid,
            'liabilities': liabilities_data
        })
