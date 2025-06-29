from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'currencies', views.CurrencyViewSet, basename='currency')
router.register(r'currency-rates', views.CurrencyRateViewSet, basename='currencyrate')
router.register(r'asset-types', views.AssetTypeViewSet, basename='assettype')
router.register(r'assets', views.AssetViewSet, basename='asset')
router.register(r'asset-value-history', views.AssetValueHistoryViewSet, basename='assetvaluehistory')
router.register(r'asset-shares', views.AssetShareViewSet, basename='assetshare')
router.register(r'funds', views.FundViewSet, basename='fund')
router.register(r'liability-types', views.LiabilityTypeViewSet, basename='liabilitytype')
router.register(r'liabilities', views.LiabilityViewSet, basename='liability')
router.register(r'liability-payments', views.LiabilityPaymentViewSet, basename='liabilitypayment')
router.register(r'incomes', views.IncomeViewSet, basename='income')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'finance-logs', views.FinanceLogViewSet, basename='financelog')
router.register(r'financial-goals', views.FinancialGoalViewSet, basename='financialgoal')
router.register(r'budget-plans', views.BudgetPlanViewSet, basename='budgetplan')
router.register(r'dashboard', views.DashboardViewSet, basename='dashboard')

urlpatterns = router.urls 