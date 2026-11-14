import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Player",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=60, unique=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Match",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("team_a", models.CharField(default="Squadra A", max_length=60)),
                ("team_b", models.CharField(default="Squadra B", max_length=60)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="Game",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("order", models.PositiveSmallIntegerField()),
                ("kind", models.CharField(choices=[("S", "Singolo"), ("D", "Doppio")], max_length=1)),
                ("a1", models.CharField(blank=True, default="", max_length=60)),
                ("a2", models.CharField(blank=True, default="", max_length=60)),
                ("b1", models.CharField(blank=True, default="", max_length=60)),
                ("b2", models.CharField(blank=True, default="", max_length=60)),
                ("score_a", models.PositiveSmallIntegerField(default=0)),
                ("score_b", models.PositiveSmallIntegerField(default=0)),
                ("is_live", models.BooleanField(default=False)),
                ("match", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="games", to="tracker.match")),
            ],
            options={
                "ordering": ["order"],
                "unique_together": {("match", "order")},
            },
        ),
    ]
