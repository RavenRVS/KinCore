from rest_framework import serializers
from .models import (
    Category, Currency, CurrencyRate, AssetType, Asset, AssetValueHistory, AssetShare, Fund,
    LiabilityType, Liability, LiabilityPayment, Income, Expense, FinanceLog, FinancialGoal, BudgetPlan
)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = '__all__'

class CurrencyRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrencyRate
        fields = '__all__'

class AssetTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetType
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = '__all__'

class AssetValueHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetValueHistory
        fields = '__all__'

class AssetShareSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetShare
        fields = '__all__'

class FundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fund
        fields = '__all__'

class LiabilityTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiabilityType
        fields = '__all__'

class LiabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Liability
        fields = '__all__'

class LiabilityPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiabilityPayment
        fields = '__all__'

class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class FinanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceLog
        fields = '__all__'

class FinancialGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialGoal
        fields = '__all__'

class BudgetPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetPlan
        fields = '__all__' 