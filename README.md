# osu!mosis

**Your next good play.** Un compagnon osu! lancé dans le terminal, avec une interface React sur localhost. Le nom mélange osu! et l’osmose : bibliothèque, jeu et analyses partagent le même catalogue.

## Démarrage sous Windows

```powershell
cd C:\Users\natha\osumosis
.\osumosis.ps1
```

Ouvrir **http://127.0.0.1:3000**. Arrêter le service avec `Ctrl+C`.

Si le service a été lancé en arrière-plan, `./osumosis.ps1 stop` demande son arrêt propre.

Le lanceur utilise Node 22.12+ ; il repère aussi le runtime Node récent fourni avec Codex si le Node du système est trop ancien. Le nom logique du service et de la commande est `osumosis` ; Windows affiche toujours l’exécutable `node.exe` dans les outils qui utilisent le nom du binaire.

### Première configuration

1. Ouvrir **Réglages**.
2. Indiquer le dossier osu!stable contenant `osu!.db` et `collection.db`.
3. Indiquer le dossier Songs uniquement s’il se trouve ailleurs.
4. Enregistrer, puis indexer la bibliothèque.
5. Lancer tosu pour activer la télémétrie et le journal des tentatives.

Adresse tosu initiale : `ws://127.0.0.1:24050/websocket/v2`.

La découverte en ligne nécessite le Client ID et le secret d’une application OAuth osu!. Ces champs sont facultatifs pour la bibliothèque locale. Ils sont conservés dans `.data/settings.json`, côté serveur ; le secret n’est pas renvoyé dans les réponses de réglages. Le fichier de configuration n’est pas chiffré : il utilise les permissions du compte Windows.

## Commandes

```powershell
.\osumosis.ps1 install # installer les dépendances
.\osumosis.ps1 build   # compiler TypeScript, React et le serveur
.\osumosis.ps1 dev     # Node sur :3000 et Vite sur :5173
.\osumosis.ps1 start   # frontend compilé + API sur :3000
.\osumosis.ps1 index 'D:\Games\osu!' # indexation ponctuelle, sans modifier les réglages
```

Avec un Node compatible dans le PATH, les scripts npm équivalents sont disponibles. Un port différent peut être choisi avec `OSUMOSIS_PORT` ; le proxy Vite de développement utilise le port 3000 par défaut. `OSUMOSIS_DATA` permet de déplacer le stockage de l’application.

## Ce qui est implémenté dans la version 0.1

- React, TypeScript, Vite, Fastify et serveur limité à `127.0.0.1`.
- SQLite dans un worker dédié : index, recherche FTS5, collections, tentatives, calculs et découverte.
- Parsing `.osu`, lecture versionnée de `osu!.db`, import de `collection.db`.
- Indexation incrémentale par taille et date, surveillance des maps et bases locales.
- Identité des difficultés par checksum ; conservation des versions et références de collections absentes.
- Recherche, grille/listes, filtres, tri, pagination, regroupement des difficultés d’un set présentes dans les résultats.
- Backgrounds et audio locaux, accès borné au dossier de la map, support des plages HTTP pour l’audio.
- Fiche détaillée, liens vers osu!, autres difficultés, collections et tentatives.
- Calculs rosu-pp-js dans des workers : étoiles avec mods, composantes de strain disponibles, scénarios à 95/97/98/99/100 %.
- Cache des calculs par checksum, mods, règles stable et version du moteur.
- Connexion tosu v2, reconnexion et dashboard live.
- Journal des tentatives observées : résultats, fails, retries, abandons, interruptions et intervalles de misses/sliderbreaks.
- Recherche officielle via OAuth client credentials, cinq requêtes maximum par minute, espacement de 12 secondes, curseurs et réutilisation du cache.
- Conservation des métadonnées des découvertes sans installation dans le jeu.
- Miniatures officielles en cache disque, téléchargées en découverte ou lors de l’ouverture d’une fiche, file plafonnée et cache de 256 Mio.
- Recommandation initiale de cinq sets distincts, fondée sur les étoiles NM, la durée, l’historique connu et la diversité.

## Recherche

```text
stars>=5 stars<6.5 bpm>180 length<180
creator="Sotarks" status=r,l
collection:"DT farm" played=false
artist="Camellia" local=true
```

Les mots libres utilisent l’index plein texte. Les mots successifs et contraintes sont combinés avec AND. Les champs texte sont insensibles à la casse ASCII ; la recherche libre retire aussi les accents.

Champs numériques : `stars`, `difficulty`, `bpm`, `length` (secondes), `ar`, `od`, `cs`, `hp`, `objects`, `plays`, `mode`, `id`.

Champs texte : `artist`, `title`, `creator`, `mapper`, `version`, `tag`, `tags`, `source`.

Autres : `status`, `collection`, `local`, `played`. Les valeurs inconnues de difficulté ne sont pas assimilées à zéro. Les filtres de PP, UR et replays ne sont pas encore disponibles ; ils produisent une erreur explicite plutôt qu’un résultat incorrect.

### Sources

- **Installées** : fichiers observés lors de l’indexation de la bibliothèque sélectionnée.
- **Catalogue** : toutes les métadonnées déjà enregistrées ; aucun nouvel appel API.
- **Découvrir** : maps non installées. Le bouton de recherche déclenche explicitement un appel osu!, puis le catalogue applique les filtres locaux.

Les prédicats locaux sont retirés de la requête distante. Les résultats reçus restent en base ; le moteur ne prétend pas avoir filtré tout le catalogue en ligne avec une contrainte locale. « Page suivante » poursuit le curseur officiel. Les recherches initiales identiques sont réutilisées pendant 15 minutes.

## Limites actuelles

- La recommandation ne modélise pas encore le profil personnel, les probabilités de réussite ou le gain pondéré de PP. Les objectifs utilisent des heuristiques de départ, pas une reproduction exacte de Gurabot.
- Le lecteur de replays, l’import `scores.db` et la reconstruction des jugements par objet restent à réaliser.
- Le journal commence quand le service reçoit la télémétrie. Il ne reconstruit pas les plays historiques et une tentative prise en cours peut être partielle.
- Les misses et sliderbreaks sont des différences de compteurs sur un intervalle ; ce ne sont pas des coordonnées ou des IDs d’objets certains.
- Le dashboard consomme le flux v2 normal. Le flux précis de touches/erreurs de timing reste une extension prévue.
- Les calculs locaux utilisent les règles **stable**, y compris si la télémétrie provient de lazer. Ils sont clairement séparés des PP observés dans le jeu.
- Le graphe de strain affiche des sections du calculateur ; l’alignement précis au replay et au premier objet reste à compléter.
- La durée et le BPM parsés depuis `.osu` sont indicatifs, particulièrement avec des sliders longs ou plusieurs changements de tempo.
- L’intégration directe à Realm/lazer et les exports ne sont pas encore implémentés.
- Les boutons `osu://` utilisent le gestionnaire de protocole du PC. La sélection exacte d’une difficulté dépend du client.
- Les images locales peuvent être absentes ; la carte conserve un fond de remplacement. Une miniature absente en mode catalogue ne déclenche pas de téléchargement.

## Stockage

```text
.data/
  settings.json        # configuration locale, secret OAuth exclu de Git
  catalog.sqlite       # catalogue et analyses
  catalog.sqlite-wal   # journal SQLite
  covers/              # médias reproductibles, éviction à 256 Mio
```

Les métadonnées et tentatives ne sont pas effacées automatiquement. Les fichiers de jeu ne sont pas modifiés. Pour sauvegarder la base, arrêter d’abord le service puis copier `.data`.

## Sources et suite

- [tosu](https://github.com/tosuapp/tosu) et ses [types v2](https://github.com/tosuapp/tosu/blob/master/packages/tosu/src/api/types/v2.ts)
- [osu! API](https://osu.ppy.sh/docs/)
- [Bases osu!stable](https://github.com/ppy/osu/wiki/Legacy-database-file-structure)
- [rosu-pp-js](https://github.com/MaxOhn/rosu-pp-js)

Voir [ROADMAP.md](ROADMAP.md) et [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour poursuivre le plan complet.
