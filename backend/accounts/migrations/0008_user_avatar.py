from django.db import migrations, models

import accounts.models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_user_platform_role_permissions"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="avatar",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=accounts.models.user_avatar_upload_to,
                verbose_name="photo de profil",
            ),
        ),
    ]
