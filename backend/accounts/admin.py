from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import EvaluationSeance, ModulePropose, Reservation, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "name",
        "role",
        "filiere",
        "niveau",
        "balance_hours",
        "score",
        "tutor_review_count",
        "is_staff",
    )
    list_filter = ("role", "is_staff", "is_superuser", "is_active")
    search_fields = ("email", "name", "filiere")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Profil",
            {
                "fields": (
                    "name",
                    "filiere",
                    "niveau",
                    "description",
                    "role",
                    "balance_hours",
                    "score",
                    "tutor_review_count",
                )
            },
        ),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "name", "filiere", "niveau", "role"),
            },
        ),
    )

    filter_horizontal = ("groups", "user_permissions")


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "module_titre",
        "etudiant",
        "tuteur",
        "statut",
        "duree_heures",
        "format_seance",
        "created_at",
    )
    list_filter = ("statut", "format_seance")
    search_fields = ("module_titre", "etudiant__email", "tuteur__email")
    autocomplete_fields = ("etudiant", "tuteur", "module_propose")
    readonly_fields = ("created_at", "updated_at")


@admin.register(EvaluationSeance)
class EvaluationSeanceAdmin(admin.ModelAdmin):
    list_display = ("tuteur", "etudiant", "note", "reservation", "created_at")
    list_filter = ("note",)
    search_fields = ("tuteur__email", "etudiant__email", "commentaire", "reservation__module_titre")
    autocomplete_fields = ("reservation", "etudiant", "tuteur")
    readonly_fields = ("created_at",)


@admin.register(ModulePropose)
class ModuleProposeAdmin(admin.ModelAdmin):
    list_display = ("titre", "niveau", "tuteur", "format_seance", "duree_label", "statut", "actif", "created_at")
    list_filter = ("niveau", "format_seance", "statut", "actif", "filiere_cible")
    search_fields = ("titre", "tuteur__name", "tuteur__email", "description")
    autocomplete_fields = ("tuteur",)
    readonly_fields = ("created_at",)
