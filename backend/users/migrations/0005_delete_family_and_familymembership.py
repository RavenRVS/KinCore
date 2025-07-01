from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0004_remove_familymembership_role_delete_role'),
    ]

    operations = [
        migrations.RunSQL('DROP TABLE IF EXISTS families CASCADE;'),
        migrations.RunSQL('DROP TABLE IF EXISTS family_memberships CASCADE;'),
    ] 