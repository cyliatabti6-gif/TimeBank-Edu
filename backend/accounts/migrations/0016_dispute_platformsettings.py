from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0015_notification"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("platform_name", models.CharField(default="TimeBank Edu", max_length=120)),
                ("contact_email", models.EmailField(default="contact@timebankEdu.dz", max_length=254)),
                ("timezone_label", models.CharField(default="UTC+01:00 Alger", max_length=80)),
                ("hours_given_label", models.CharField(default="1h", max_length=20)),
                ("hours_received_label", models.CharField(default="1h", max_length=20)),
                ("initial_student_balance", models.DecimalField(decimal_places=2, default=2, max_digits=5)),
                ("initial_tutor_score", models.DecimalField(decimal_places=2, default=5, max_digits=4)),
                ("min_session_duration_label", models.CharField(default="1 heure", max_length=40)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "paramètre plateforme",
                "verbose_name_plural": "paramètres plateforme",
            },
        ),
        migrations.CreateModel(
            name="Dispute",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=160)),
                ("description", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "En attente"), ("in_progress", "En cours"), ("resolved", "Résolu")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("resolution_note", models.CharField(blank=True, max_length=300)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "reporter",
                    models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name="reported_disputes", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "reservation",
                    models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name="disputes", to="accounts.reservation"),
                ),
                (
                    "target",
                    models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name="targeted_disputes", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "verbose_name": "litige",
                "verbose_name_plural": "litiges",
                "ordering": ["-created_at"],
            },
        ),
    ]
