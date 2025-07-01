from django.db import models
from users.models import User
from nucfamily.models import NuclearFamily
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone

class Category(models.Model):
    """
    Категория для активов, доходов, расходов (иерархия, индивидуальные/семейные)
    """
    name = models.CharField('Название', max_length=100)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='categories')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='categories')
    is_family = models.BooleanField('Семейная категория', default=False)
    type = models.CharField('Тип', max_length=20, choices=[('asset', 'Актив'), ('income', 'Доход'), ('expense', 'Расход')])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        db_table = 'categories'

    def __str__(self):
        return self.name

class Currency(models.Model):
    """
    Валюта (пользовательские и стандартные)
    """
    code = models.CharField('Код валюты', max_length=10)
    name = models.CharField('Название валюты', max_length=50)
    symbol = models.CharField('Символ', max_length=10, blank=True)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='currencies')
    is_default = models.BooleanField('Встроенная валюта', default=False)

    class Meta:
        verbose_name = 'Валюта'
        verbose_name_plural = 'Валюты'
        db_table = 'currencies'
        unique_together = ('code', 'owner')

    def __str__(self):
        return f"{self.code} ({self.name})"

class CurrencyRate(models.Model):
    """
    История курсов валют
    """
    currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='rates')
    date = models.DateField()
    rate_to_base = models.DecimalField('Курс к базовой валюте', max_digits=20, decimal_places=8)

    class Meta:
        verbose_name = 'Курс валюты'
        verbose_name_plural = 'Курсы валют'
        db_table = 'currency_rates'
        unique_together = ('currency', 'date')

    def __str__(self):
        return f"{self.currency.code} на {self.date}: {self.rate_to_base}"

class AssetType(models.Model):
    """
    Тип актива (денежный, материальный, бизнес и др.)
    """
    name = models.CharField('Название типа', max_length=50, unique=True)
    is_base = models.BooleanField('Базовый тип', default=False)
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='asset_types')

    class Meta:
        verbose_name = 'Тип актива'
        verbose_name_plural = 'Типы активов'
        db_table = 'asset_types'

    def __str__(self):
        return self.name

class Asset(models.Model):
    """
    Актив (основная сущность)
    """
    name = models.CharField('Наименование', max_length=150)
    type = models.ForeignKey(AssetType, on_delete=models.PROTECT, related_name='assets')
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name='assets')
    purchase_value = models.DecimalField('Стоимость покупки', max_digits=20, decimal_places=2)
    purchase_currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name='assets_purchase')
    current_value = models.DecimalField('Текущая стоимость', max_digits=20, decimal_places=2)
    current_currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name='assets_current')
    last_valuation_date = models.DateField('Дата последней оценки', null=True, blank=True)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assets')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='assets')
    is_family = models.BooleanField('Семейный актив', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Актив'
        verbose_name_plural = 'Активы'
        db_table = 'assets'

    def __str__(self):
        return self.name

    def calculate_roi(self):
        """Рассчитать ROI актива"""
        if self.purchase_value > 0:
            return ((self.current_value - self.purchase_value) / self.purchase_value) * 100
        return Decimal('0.00')

    def get_total_income(self):
        """Получить общую сумму доходов по активу"""
        return self.incomes.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    def get_total_expenses(self):
        """Получить общую сумму расходов по активу"""
        return self.expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    def get_net_income(self):
        """Получить чистый доход по активу"""
        return self.get_total_income() - self.get_total_expenses()

class AssetValueHistory(models.Model):
    """
    История изменения стоимости актива
    """
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='value_history')
    value = models.DecimalField('Оценочная стоимость', max_digits=20, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    date = models.DateField('Дата оценки')

    class Meta:
        verbose_name = 'История стоимости актива'
        verbose_name_plural = 'Истории стоимости активов'
        db_table = 'asset_value_history'
        unique_together = ('asset', 'date')

    def __str__(self):
        return f"{self.asset.name} на {self.date}: {self.value}"

class AssetShare(models.Model):
    """
    Доли владения активом (с историей)
    """
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='shares')
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name='asset_shares')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.CASCADE, related_name='asset_shares')
    share = models.DecimalField('Доля', max_digits=7, decimal_places=4)  # 0.0001 - 100.0000
    valid_from = models.DateField('Действует с')
    valid_to = models.DateField('Действует по', null=True, blank=True)

    class Meta:
        verbose_name = 'Доля актива'
        verbose_name_plural = 'Доли активов'
        db_table = 'asset_shares'

    def __str__(self):
        return f"{self.asset.name}: {self.share} ({self.user or self.family})"

class Fund(models.Model):
    """
    Фонд (отдельная сущность, но учитывается как денежный актив)
    """
    name = models.CharField('Название фонда', max_length=150)
    goal = models.DecimalField('Цель накопления', max_digits=20, decimal_places=2)
    target_date = models.DateField('Целевая дата', null=True, blank=True)
    current_value = models.DecimalField('Текущая сумма', max_digits=20, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='funds')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='funds')
    is_family = models.BooleanField('Семейный фонд', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Фонд'
        verbose_name_plural = 'Фонды'
        db_table = 'funds'

    def __str__(self):
        return self.name

    def get_progress_percentage(self):
        """Получить процент выполнения цели"""
        if self.goal > 0:
            return (self.current_value / self.goal) * 100
        return Decimal('0.00')

    def get_remaining_amount(self):
        """Получить оставшуюся сумму до цели"""
        return max(Decimal('0.00'), self.goal - self.current_value)

    def get_days_until_target(self):
        """Получить количество дней до целевой даты"""
        if self.target_date:
            delta = self.target_date - timezone.now().date()
            return max(0, delta.days)
        return None

    def get_monthly_savings_needed(self):
        """Рассчитать необходимую ежемесячную сумму для достижения цели"""
        days_until_target = self.get_days_until_target()
        if days_until_target and days_until_target > 0:
            remaining_amount = self.get_remaining_amount()
            months_until_target = days_until_target / 30.44  # среднее количество дней в месяце
            return remaining_amount / months_until_target
        return Decimal('0.00')

class LiabilityType(models.Model):
    """
    Тип пассива (кредит, займ и др.)
    """
    name = models.CharField('Название типа', max_length=50, unique=True)
    is_base = models.BooleanField('Базовый тип', default=False)
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='liability_types')

    class Meta:
        verbose_name = 'Тип пассива'
        verbose_name_plural = 'Типы пассивов'
        db_table = 'liability_types'

    def __str__(self):
        return self.name

class Liability(models.Model):
    """
    Пассив/обязательство (кредит, займ)
    """
    name = models.CharField('Наименование', max_length=150)
    type = models.ForeignKey(LiabilityType, on_delete=models.PROTECT, related_name='liabilities')
    initial_amount = models.DecimalField('Первоначальная сумма', max_digits=20, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name='liabilities')
    open_date = models.DateField('Дата открытия')
    close_date = models.DateField('Дата окончания', null=True, blank=True)
    interest_rate = models.DecimalField('Ставка % годовых', max_digits=5, decimal_places=2, null=True, blank=True)
    payment_type = models.CharField('Способ погашения', max_length=20, choices=[('annuity', 'Аннуитетный'), ('diff', 'Дифференцированный')], null=True, blank=True)
    payment_date = models.DateField('Дата платежа', null=True, blank=True)
    current_debt = models.DecimalField('Задолженность на сегодня', max_digits=20, decimal_places=2)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='liabilities')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='liabilities')
    is_family = models.BooleanField('Семейный пассив', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Пассив/Обязательство'
        verbose_name_plural = 'Пассивы/Обязательства'
        db_table = 'liabilities'

    def __str__(self):
        return self.name

    def get_total_payments(self):
        """Получить общую сумму платежей по пассиву"""
        return self.payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    def get_total_principal_paid(self):
        """Получить общую сумму погашенного основного долга"""
        return self.payments.aggregate(total=Sum('principal'))['total'] or Decimal('0.00')

    def get_total_interest_paid(self):
        """Получить общую сумму выплаченных процентов"""
        return self.payments.aggregate(total=Sum('interest'))['total'] or Decimal('0.00')

    def get_remaining_principal(self):
        """Получить оставшуюся сумму основного долга"""
        return max(Decimal('0.00'), self.initial_amount - self.get_total_principal_paid())

    def has_unlinked_expenses(self):
        """Проверить наличие расходов, не привязанных к платежам по пассиву"""
        return self.expenses.filter(liability_payment__isnull=True).exists()

class LiabilityPayment(models.Model):
    """
    Платеж по пассиву (кредиту/займу)
    """
    liability = models.ForeignKey(Liability, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField('Сумма платежа', max_digits=20, decimal_places=2)
    date = models.DateField('Дата платежа')
    principal = models.DecimalField('Погашение основного долга', max_digits=20, decimal_places=2)
    interest = models.DecimalField('Погашение процентов', max_digits=20, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Платеж по пассиву'
        verbose_name_plural = 'Платежи по пассивам'
        db_table = 'liability_payments'
        unique_together = ('liability', 'date')

    def __str__(self):
        return f"Платеж {self.amount} по {self.liability.name} на {self.date}"

class Income(models.Model):
    """
    Доход
    """
    name = models.CharField('Наименование', max_length=150)
    amount = models.DecimalField('Сумма', max_digits=20, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name='incomes')
    date = models.DateField('Дата поступления')
    asset = models.ForeignKey(Asset, null=True, blank=True, on_delete=models.SET_NULL, related_name='incomes')
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name='incomes')
    type = models.CharField('Вид', max_length=20, choices=[('regular', 'Постоянный'), ('temporary', 'Временный'), ('occasional', 'Случайный')])
    periodicity = models.CharField('Периодичность', max_length=30, blank=True)
    end_date = models.DateField('Дата окончания', null=True, blank=True)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='incomes')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='incomes')
    is_family = models.BooleanField('Семейный доход', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Доход'
        verbose_name_plural = 'Доходы'
        db_table = 'incomes'

    def __str__(self):
        return f"{self.name} ({self.amount} {self.currency.code})"

class Expense(models.Model):
    """
    Расход
    """
    name = models.CharField('Наименование', max_length=150)
    amount = models.DecimalField('Сумма', max_digits=20, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name='expenses')
    date = models.DateField('Дата расхода')
    asset = models.ForeignKey(Asset, null=True, blank=True, on_delete=models.SET_NULL, related_name='expenses')
    liability = models.ForeignKey(Liability, null=True, blank=True, on_delete=models.SET_NULL, related_name='expenses')
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name='expenses')
    type = models.CharField('Тип', max_length=20, choices=[('mandatory', 'Обязательный'), ('optional', 'Необязательный')])
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='expenses')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='expenses')
    is_family = models.BooleanField('Семейный расход', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Расход'
        verbose_name_plural = 'Расходы'
        db_table = 'expenses'

    def __str__(self):
        return f"{self.name} ({self.amount} {self.currency.code})"

class FinanceLog(models.Model):
    """
    История изменений (логирование операций)
    """
    entity_type = models.CharField('Тип сущности', max_length=50)
    entity_id = models.PositiveIntegerField('ID сущности')
    action = models.CharField('Действие', max_length=50)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='finance_logs')
    date = models.DateTimeField('Дата операции', auto_now_add=True)
    data_before = models.JSONField('Данные до', null=True, blank=True)
    data_after = models.JSONField('Данные после', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Лог финансового блока'
        verbose_name_plural = 'Логи финансового блока'
        db_table = 'finance_logs'

    def __str__(self):
        return f"[{self.date.strftime('%Y-%m-%d %H:%M')}] {self.action} {self.entity_type} {self.entity_id}"

class FinancialGoal(models.Model):
    """
    Финансовая цель (накопить сумму к дате)
    """
    name = models.CharField('Название цели', max_length=150)
    target_amount = models.DecimalField('Целевая сумма', max_digits=20, decimal_places=2)
    target_date = models.DateField('Целевая дата')
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='financial_goals')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='financial_goals')
    is_family = models.BooleanField('Семейная цель', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Финансовая цель'
        verbose_name_plural = 'Финансовые цели'
        db_table = 'financial_goals'

    def __str__(self):
        return self.name

class BudgetPlan(models.Model):
    """
    Бюджетирование (план доходов/расходов на период)
    """
    period = models.CharField('Период', max_length=20)  # например, '2024-06', '2024-Q2', '2024'
    planned_income = models.DecimalField('Планируемый доход', max_digits=20, decimal_places=2)
    planned_expense = models.DecimalField('Планируемый расход', max_digits=20, decimal_places=2)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='budget_plans')
    family = models.ForeignKey(NuclearFamily, null=True, blank=True, on_delete=models.SET_NULL, related_name='budget_plans')
    is_family = models.BooleanField('Семейный бюджет', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Бюджет'
        verbose_name_plural = 'Бюджеты'
        db_table = 'budget_plans'

    def __str__(self):
        return f"{self.period} бюджет"
