
### Parcours côté étudiant (simplifié)
1. S’inscrire ou se connecter (authentification **JWT**).
2. Explorer les **modules** proposés et ouvrir la fiche d’un tuteur.
3. Demander une **réservation** (date / créneau selon ce que le tuteur propose).
4. Suivre l’état de la demande jusqu’à **confirmation**.
5. Accéder à la **séance** lorsqu’elle est confirmée ou en cours ; en cas de problème (absence, retard, etc.), utiliser le **signalement** : la séance concernée peut être **annulée** et l’information remonte au tuteur.
6. Consulter l’**historique** (séances complétées et annulées) et des **statistiques** liées à son activité.
### Parcours côté tuteur (simplifié)
1. **Publier** ou **modifier** des modules depuis l’espace tuteur.
2. Recevoir les **demandes** et les traiter (acceptation, refus).
3. Voir les **séances à venir** sur le tableau de bord et dans le **planning** (vue semaine).
4. Lors d’un souci de son côté, **signaler** la séance : l’étudiant est informé et la séance peut être **annulée** ; un message peut apparaître côté étudiant.
5. Indiquer sur son profil les **modules maîtrisés** sous forme de **libellés libres** (simple liste textuelle, indépendante du catalogue publié).
### Signalements et annulations
Les **signalements** servent à documenter un incident sur une séance (ex. personne absente, empêchement). Selon les règles métier implémentées, un signalement peut entraîner l’**annulation** de la réservation associée, visible des deux côtés et prise en compte dans l’**historique**.
### Données et confidentialité
Les comptes et les réservations sont stockés dans la **base de données** gérée par le backend. En développement, un fichier **SQLite** local est souvent utilisé ; il ne doit en général **pas** être versionné sur Git (fichier personnel / données locales). En production, prévoir une base serveur, des secrets forts (`DJANGO_SECRET_KEY`) et des règles d’accès adaptées.
### Résumé
TimeBank Edu est un **prototype applicatif** complet (interface React + API Django) pour expérimenter la logique d’une communauté d’entraide scolaire avec **temps partagé**, **transparence des séances** et **suivi** pour l’étudiant comme pour le tuteur.
