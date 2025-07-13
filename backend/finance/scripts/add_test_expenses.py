from finance.models import Expense, Currency, Category
from users.models import User
from nucfamily.models import NuclearFamily
from datetime import date, timedelta
import random

users = list(User.objects.all())
families = list(NuclearFamily.objects.all())
currencies = list(Currency.objects.all())
categories = list(Category.objects.filter(type='expense'))
today = date.today()

for i in range(10):
    user = random.choice(users)
    family = random.choice(families) if families else None
    currency = random.choice(currencies)
    category = random.choice(categories) if categories else None
    expense = Expense.objects.create(
        name=f'Тестовый расход {i+1}',
        amount=random.randint(100, 10000),
        currency=currency,
        date=today - timedelta(days=i),
        category=category,
        type=random.choice(['mandatory','optional']),
        owner=user,
        family=family,
        is_family=bool(family)
    )
    print(f'Создан расход: {expense}') 