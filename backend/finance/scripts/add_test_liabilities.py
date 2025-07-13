from finance.models import Liability, LiabilityType, Currency
from users.models import User
from nucfamily.models import NuclearFamily
from datetime import date, timedelta
import random

users = list(User.objects.all())
families = list(NuclearFamily.objects.all())
currencies = list(Currency.objects.all())
types = list(LiabilityType.objects.all())
today = date.today()

if not types:
    # Создадим базовые типы, если их нет
    types.append(LiabilityType.objects.create(name='Кредит', is_base=True))
    types.append(LiabilityType.objects.create(name='Займ', is_base=True))

def create_liabilities_for_owner(owner=None, family=None):
    for i in range(10):
        liability_type = random.choice(types)
        currency = random.choice(currencies)
        initial_amount = random.randint(10000, 1000000)
        open_date = today - timedelta(days=random.randint(0, 365))
        close_date = open_date + timedelta(days=random.randint(30, 365*5))
        interest_rate = round(random.uniform(5, 20), 2)
        payment_type = random.choice(['annuity', 'diff'])
        payment_date = open_date + timedelta(days=random.randint(1, 30))
        current_debt = initial_amount - random.randint(0, int(initial_amount*0.5))
        liability = Liability.objects.create(
            name=f'Тестовый пассив {i+1}' + (f' ({owner})' if owner else f' (семья {family})'),
            type=liability_type,
            initial_amount=initial_amount,
            currency=currency,
            open_date=open_date,
            close_date=close_date,
            interest_rate=interest_rate,
            payment_type=payment_type,
            payment_date=payment_date,
            current_debt=current_debt,
            owner=owner,
            family=family,
            is_family=bool(family)
        )
        print(f'Создан пассив: {liability}')

for user in users:
    create_liabilities_for_owner(owner=user)

for family in families:
    create_liabilities_for_owner(family=family) 