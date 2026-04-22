from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0014_reservation_slots_and_status_cleanup"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type", models.CharField(max_length=50)),
                ("text", models.CharField(max_length=255)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="notifications", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "verbose_name": "notification",
                "verbose_name_plural": "notifications",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["user", "is_read"], name="accounts_not_user_id_7c652f_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["user", "-created_at"], name="accounts_not_user_id_5102cc_idx"),
        ),
    ]
