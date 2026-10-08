# Liaison au compte osu!

## Configuration actuelle, pour les essais locaux

1. Se connecter sur https://osu.ppy.sh/home/account/edit#oauth et créer une application OAuth.
2. Choisir un nom, puis renseigner l’adresse de retour donnée par osu!mosis : **http://127.0.0.1:3000/api/account/callback** pour Tauri et le serveur npm par défaut. Copier l’adresse exacte affichée si le serveur npm utilise un autre port ; `localhost` et `127.0.0.1` ne sont pas interchangeables dans cette configuration.
3. Dans **Réglages → Compte osu! et découverte**, entrer le Client ID et le secret, puis enregistrer.
4. Cliquer sur le profil en haut à droite, puis **Autoriser sur osu!**. Le navigateur système affiche la page officielle d’autorisation avec les scopes `public identify`.
5. Accepter, garder osu!mosis ouvert pendant le retour sur localhost, puis revenir dans l’application. Le profil, l’avatar et les statistiques publiques disponibles apparaissent.

L’application ne demande pas le mot de passe osu!. Le callback est traité par le backend local, avec un `state` aléatoire, à usage unique et valable dix minutes. Le code est échangé côté serveur ; les tokens ne sont pas renvoyés au frontend. Une modification des identifiants OAuth déconnecte le profil courant.

## Cache et déconnexion

Le profil s’affiche depuis le cache sans appel à chaque ouverture. **Actualiser le profil** consulte l’API ; le backend renouvelle le token expiré avec le refresh token. Le snapshot contient actuellement l’identité et les statistiques du mode principal renvoyées par `/api/v2/me`, pas les tops ni les scores récents.

`account.json`, dans le répertoire de données de l’application, contient les tokens et le profil. Il est écrit avec les permissions `0600` sur les systèmes qui les appliquent ; sous Windows, les ACL du compte et du dossier déterminent l’accès. Ce stockage n’est pas chiffré ni intégré au coffre de secrets du système à ce stade. Ne pas joindre ce fichier ni `settings.json` à un rapport de bug.

**Déconnecter** supprime les identifiants utilisateur de l’application. Pour révoquer aussi l’autorisation sur osu!, retirer l’application autorisée dans les paramètres du compte osu!.

La recherche en ligne utilise déjà un token public distinct obtenu par client credentials. Son budget reste partagé à cinq appels de recherche par minute ; la liaison utilisateur ne déclenche pas de recherche ni d’import de scores.

## Avant une distribution publique

Le workflow actuel utilise l’application OAuth personnelle du développeur/utilisateur pour les essais. Un secret commun ne doit pas être intégré à l’exécutable publié : un binaire desktop ne peut pas le garder confidentiel. Il faudra choisir un flux desktop supporté par osu! ou un service d’authentification qui garde ce secret côté serveur, puis préparer le stockage des tokens dans le coffre du système. Cette étape précède une connexion prête à l’emploi pour le public.

## Diagnostic

- Adresse de retour refusée : comparer exactement le callback enregistré sur osu! et celui affiché dans les Réglages.
- Retour sur localhost impossible : garder le service ouvert, vérifier le port et fermer l’autre instance éventuelle.
- Autorisation expirée/refusée : relancer la connexion depuis le profil.
- Profil ancien : utiliser **Actualiser le profil** ; le cache reste disponible hors ligne.
- La liaison réelle reste à essayer avec les identifiants de ton application OAuth ; aucun compte osu! n’est configuré dans le cloud.
