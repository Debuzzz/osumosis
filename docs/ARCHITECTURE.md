# Architecture de la version 0.1

## Modules

`server/index.ts` sert les ressources et contrôle les entrées avec Zod. Il garde les connexions WebSocket tosu/frontend et délègue les opérations du catalogue à `Catalog`.

`catalog-worker.ts` est l’unique propriétaire de la connexion SQLite. Les messages RPC sont corrélés par ID. L’indexation asynchrone cède régulièrement la main pour répondre aux recherches pendant un scan.

`settings.ts` définit les deux profils de bibliothèque. Les nouvelles configurations sélectionnent lazer ; les anciens chemins à plat sont migrés vers stable. OAuth, tosu et les préférences restent communs. La sauvegarde valide les deux profils et refuse un changement de bibliothèque pendant un scan.

`lazer.ts` copie la base client Realm la plus récemment modifiée, contrôle sa taille/date avant et après la copie et ouvre uniquement cette copie en mode immutable/lecture seule. Le client doit être fermé pendant l’indexation : le contrôle des dates ne remplace pas une transaction du moteur Realm. Les champs nécessaires du schéma sont validés avant lecture ; les références BeatmapSet/Files associent les noms logiques aux fichiers SHA-256. Le contenu .osu est vérifié par SHA-256 et MD5. Les collections conservent aussi les checksums absents. Cette intégration reste à valider avec les fichiers réels Windows.

`stable.ts` gère les données binaires et le parsing `.osu`. Les bases sont lues sur une copie mémoire cohérente (taille/date avant/après). Le parseur différencie les star ratings double/float à partir de la version 20250107.

`search.ts` compile une syntaxe limitée en clauses SQL paramétrées. Les noms de colonnes et ordres proviennent de listes fixes. Tous les filtres s’appliquent à la même ligne de difficulté.

`analysis.ts` crée au maximum deux workers rosu-pp-js concurrents. Les résultats sont sérialisés, mis en cache puis retournés au frontend. Le cache identifie checksum, client stable/lazer, mods et version du moteur. Les deux modes utilisent l’option `lazer` de rosu-pp-js et les résultats précisent le client simulé. Les workers sont interrompus après 30 secondes.

`tosu.ts` normalise les snapshots v2 et suit des tentatives. Le flux auxiliaire `/tokens`, filtré sur `status`, confirme partie (2) ou replay (8) : `settings.replayUIVisible` ne permet pas cette distinction. Le mode est signalé comme non confirmé si le flux auxiliaire manque. Les replays reconnus restent des lectures et ne créent pas de tentative. Les différences de compteurs deviennent des événements localisés dans un intervalle ; les compteurs initiaux servent de référence pour éviter d’inventer des misses lors d’une capture partielle. Le départ est stabilisé pendant au moins 350 ms : horloge compatible avec la map et compteurs remis à zéro en début de map, ou progression du score/des jugements pour une capture en cours de partie. Un retour du temps sans progression observée est une resynchronisation et ne crée pas de retry. Les résultats sont finalisés après une fenêtre de 800 ms permettant de recevoir les champs du score. Les échecs d’enregistrement sont visibles dans le snapshot et le diagnostic. `telemetry-log.ts` écrit les événements de cycle de vie uniquement, dans le terminal et un journal local avec rotation à 512 Kio. Un historique borné de 1 800 points alimente le graphe live des PP, et les scénarios d’accuracy proviennent de tosu, sans simulation supplémentaire.

`osu-api.ts` utilise un token public obtenu par client credentials. Le budget compte les appels de recherche officiels ; l’obtention ponctuelle d’un token OAuth est une opération d’authentification séparée. Les requêtes identiques en cours sont mutualisées et les curseurs persistés.

`assets.ts` gère les miniatures depuis `assets.ppy.sh`, dans une file séparée espacée de 500 ms. Les réponses sont bornées à 2 Mio et le cache reproductible à 256 Mio. Le mode catalogue autorise seulement les lectures du cache ; la découverte et l’ouverture d’une fiche peuvent le remplir.

## Identité et disponibilité

Le checksum du fichier est la clé de révision. Les IDs de difficulté et set sont des attributs : les maps non soumises n’en ont pas nécessairement. Le même ID peut avoir plusieurs checksums.

Les informations distantes sans checksum utilisent temporairement `remote:<id>`. L’indexation d’un vrai fichier supprime ce placeholder et conserve les autres révisions connues. La propriété `local` indique la bibliothèque sélectionnée lors du dernier scan terminé ; le fichier et les collections ont une existence distincte. `catalog_state` conserve l’identité du profil et de ses dossiers. Un changement efface les indicateurs `local`, sans effacer le cache, et impose une nouvelle indexation. Les collections sont filtrées par source stable/lazer et dossier. Après redémarrage sur la même bibliothèque, le catalogue garde son état installé.

Le scan désactive les références aux fichiers disparus uniquement après une traversée complète. Les difficultés dont le parsing échoue mais dont le fichier était déjà connu conservent leur précédente entrée. Les références de collections ne possèdent pas de clé étrangère vers les maps, afin de préserver les membres absents.

## API locale

| Route | Rôle |
| --- | --- |
| `GET /api/status` | Catalogue, index, tosu, budget API |
| `GET /api/settings`, `PUT /api/settings` | Configuration publique / sauvegarde |
| `GET /api/maps`, `GET /api/maps/:key` | Recherche et fiche |
| `GET /api/collections` | Membres connus et installés |
| `POST /api/index` | Démarrer l’indexation |
| `POST /api/recommend` | Sélection de cinq sets maximum |
| `POST /api/discover` | Recherche officielle et ajout au cache |
| `POST /api/maps/:key/analysis` | Calcul local |
| `GET /api/assets/:key/:kind` | Map, background ou audio local |
| `GET /api/covers/:key` | Miniature officielle en cache |
| `GET /api/plays`, `GET /api/live` | Historique et snapshot |
| `GET /api/tosu/diagnostics` | Capture et 80 derniers événements de cycle de vie |
| `GET /api/live/background?checksum=...` | Fond de la map courante via tosu local, en repli du média indexé |
| `WS /ws` | État live, progression et nouveaux plays |

## Frontend et limites de la livraison

Le frontend utilise React Query pour le catalogue et un WebSocket avec reconnexion pour le live. La bibliothèque utilise une requête infinie et un IntersectionObserver pour charger 20 sets à la fois. `GET /api/maps?group=sets&limit=20` sélectionne les sets par leur première difficulté correspondant au tri, puis renvoie toutes leurs difficultés correspondant aux filtres dans `groups`, avec `totalSets` et un nombre de pages par sets. Le total des difficultés reste disponible dans `total`. Le mode historique par difficultés reste le défaut de l’API. Le scroll conserve les lots précédents et consulte seulement SQLite ; la découverte distante reste explicite. La virtualisation du DOM reste à réaliser.

Les scénarios PP sont des simulations sans miss avec les règles du profil sélectionné. Les mods paramétrés lazer ne sont pas encore disponibles. Le graphe de strain est indexé par sections du moteur : son alignement temporel exact à une lecture de replay n’est pas encore livré.

Le service limite Host/Origin aux adresses locales, exige un en-tête spécifique pour les mutations et vérifie les chemins réels des médias. Ces contrôles servent le périmètre d’une application locale ; aucun accès LAN ou authentification multi-utilisateur n’est fourni.

## Médias et validation

Les fichiers lazer n’ont pas d’extension et les médias d’un set peuvent être stockés dans des sous-dossiers hashés différents. `asset_root` délimite le stockage autorisé ; `audio_name` et `background_name` conservent le nom logique pour le type MIME. Le service vérifie les chemins réels avant de servir un fichier. Stable conserve comme frontière le dossier de la map.

`npm test` exerce les profils, leur migration, le catalogue SQLite, les fichiers hashés et les calculs rosu avec les deux règles. `npm run test:realm` crée une vraie base Realm synthétique et teste son import et la conservation du fichier original ; il ne remplace pas la validation avec une base générée par osu!lazer. `npm run check:runtime` détecte un binaire natif manquant même lorsque npm a terminé son installation sans erreur.
