# Generated manually: rôle plateforme (user/admin) + permissions is_student / is_tutor.

from django.db import migrations, models


def forwards_migrate_roles(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    for u in User.objects.all():
        old = u.role
        if old == "admin":
            u.role = "admin"
        else:
            u.role = "user"
            if old == "student":
                u.is_student = True
                u.is_tutor = False
            elif old == "tutor":
                u.is_student = False
                u.is_tutor = True
            elif old == "both":
                u.is_student = True
                u.is_tutor = True
            else:
                u.is_student = True
                u.is_tutor = True
        u.save(update_fields=["role", "is_student", "is_tutor"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_user_tutor_review_count_evaluationseance"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_student",
            field=models.BooleanField(
                default=True,
                verbose_name="peut utiliser l'espace étudiant",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="is_tutor",
            field=models.BooleanField(
                default=True,
                verbose_name="peut utiliser l'espace tuteur",
            ),
        ),
        migrations.RunPython(forwards_migrate_roles, noop_reverse),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[("user", "Utilisateur"), ("admin", "Administrateur")],
                default="user",
                max_length=10,
                verbose_name="rôle plateforme",
            ),
        ),
    ]
