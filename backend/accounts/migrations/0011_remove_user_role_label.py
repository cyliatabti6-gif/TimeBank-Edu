from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_user_role_label"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="role_label",
        ),
    ]
