from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_signalement_seance"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="modules_maitrises",
            field=models.JSONField(
                blank=True,
                default=list,
                verbose_name="modules maîtrisés (libellés libres, hors catalogue)",
            ),
        ),
    ]
