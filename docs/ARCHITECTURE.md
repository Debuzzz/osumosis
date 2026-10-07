# Architecture de la version 0.1

## Modules

`server/index.ts` sert les ressources et contrôle les entrées avec Zod. Il garde les connexions WebSocket tosu/frontend et délègue les opérations du catalogue à `Catalog`.

`catalog-worker.ts` est l’unique propriétaire de la connexion SQLite. Les messages RPC sont corrélés par ID. L’indexation asynchrone cède régulièrement la main pour répondre aux recherches pendant un scan.

`stable.ts` gère les données binaires et le parsing `.osu`. Les bases sont lues sur une copie mémoire cohérente (taille/date avant/après). Le parseur différencie les star ratings double/float à partir de la version 20250107.

`search.ts` compile une syntaxe limitée en clauses SQL paramétrées. Les noms de colonnes et ordres proviennent de listes fixes. Tous les filtres s’appliquent à la même ligne de difficulté.

`analysis.ts` crée au maximum deux workers rosu-pp-js concurrents. Les résultats sont sérialisés, mis en cache puis retournés au frontend. Le cache identifie checksum, règles stable, mods et version du moteur. Les workers sont interrompus après 30 secondes.

`tosu.ts` normalise les snapshots v2 et suit des tentatives. Les différences de compteurs deviennent des événements localisés dans un intervalle. Une reconnexion ne doit pas inventer les événements perdus. Une capture commencée au milieu d’un play est partielle.

`osu-api.ts` utilise un token public obtenu par client credentials. Le budget compte les appels de recherche officiels ; l’obtention ponctuelle d’un token OAuth est une opération d’authentification séparée. Les requêtes identiques en cours sont mutualisées et les curseurs persistés.

`assets.ts` gère les miniatures depuis `assets.ppy.sh`, dans une file séparée espacée de 500 ms. Les réponses sont bornées à 2 Mio et le cache reproductible à 256 Mio. Le mode catalogue autorise seulement les lectures du cache ; la découverte et l’ouverture d’une fiche peuvent le remplir.

## Identité et disponibilité

Le checksum du fichier est la clé de révision. Les IDs de difficulté et set sont des attributs : les maps non soumises n’en ont pas nécessairement. Le même ID peut avoir plusieurs checksums.

Les informations distantes sans checksum utilisent temporairement `remote:<id>`. L’indexation d’un vrai fichier supprime ce placeholder et conserve les autres révisions connues. La propriété `local` indique la bibliothèque sélectionnée lors du dernier scan terminé ; le fichier et les collections ont une existence distincte.

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
| `WS /ws` | État live, progression et nouveaux plays |

## Frontend et limites de la livraison

Le frontend utilise React Query pour le catalogue et un WebSocket avec reconnexion pour le live. Une page charge au maximum 48 difficultés. Le regroupement par set se fait parmi les résultats de la page ; la pagination par set sera une évolution distincte.

Les scénarios PP sont des simulations sans miss avec les règles stable. Le graphe de strain est indexé par sections du moteur : son alignement temporel exact à une lecture de replay n’est pas encore livré.

Le service limite Host/Origin aux adresses locales, exige un en-tête spécifique pour les mutations et vérifie les chemins réels des médias. Ces contrôles servent le périmètre d’une application locale ; aucun accès LAN ou authentification multi-utilisateur n’est fourni.
