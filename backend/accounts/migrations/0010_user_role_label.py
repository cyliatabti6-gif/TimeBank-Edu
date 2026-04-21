from django.db import migrations, models


def forwards_set_role_label(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    for u in User.objects.all():
        if getattr(u, "is_tutor", False) and not getattr(u, "is_student", False):
            u.role_label = "tutor"
        else:
            u.role_label = "student"
        u.save(update_fields=["role_label"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_alter_user_is_student_alter_user_is_tutor"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="role_label",
            field=models.CharField(
                choices=[("student", "Étudiant"), ("tutor", "Tuteur")],
                default="student",
                max_length=10,
                verbose_name="libellé rôle profil",
            ),
        ),
        migrations.RunPython(forwards_set_role_label, noop_reverse),
    ]
