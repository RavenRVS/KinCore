from django.contrib import admin
from .models import (
    Category, Currency, CurrencyRate, AssetType, Asset, AssetValueHistory, AssetShare, Fund,
    LiabilityType, Liability, LiabilityPayment, Income, Expense, FinanceLog, FinancialGoal, BudgetPlan
)

admin.site.register(Category)
admin.site.register(Currency)
admin.site.register(CurrencyRate)
admin.site.register(AssetType)
admin.site.register(Asset)
admin.site.register(AssetValueHistory)
admin.site.register(AssetShare)
admin.site.register(Fund)
admin.site.register(LiabilityType)
admin.site.register(Liability)
admin.site.register(LiabilityPayment)
admin.site.register(Income)
admin.site.register(Expense)
admin.site.register(FinanceLog)
admin.site.register(FinancialGoal)
admin.site.register(BudgetPlan)
