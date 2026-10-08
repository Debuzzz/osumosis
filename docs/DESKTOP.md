# Desktop Tauri

Tauri 2 affiche React/CSS dans la WebView système et lance un processus Node compagnon. Le moteur web est celui du système (WebView2 sous Windows, WKWebView sous macOS, WebKitGTK sous Linux). La personnalisation CSS reste possible ; Tauri apporte la fenêtre et l’intégration desktop.

## Prérequis de développement

- Node.js LTS 22.12+ et npm ; version 24 utilisée par la CI.
- Rust stable et Cargo via https://rustup.rs/.
- Windows : outils de compilation C++ de Visual Studio Build Tools, composant Desktop development with C++, SDK Windows et WebView2. Choisir les mêmes architecture et ABI pour Rust et Node (x64 conseillé).
- macOS : Xcode Command Line Tools (`xcode-select --install`).
- Linux : WebKitGTK 4.1, GTK 3, librsvg, OpenSSL, libxdo, outils C/C++ et patchelf. La CI installe les paquets Ubuntu nécessaires.

Depuis le dépôt, sans script PowerShell :

```bat
npm ci
npm run desktop:info
npm run desktop:dev
```

`desktop:dev` construit le frontend/backend et prépare le processus compagnon avant de lancer la fenêtre. Ce premier workflow privilégie un build local reproductible ; pour le rechargement à chaud, `npm run dev` reste disponible dans le navigateur.

Fermer le serveur `npm start` avant de lancer la version desktop : le port 3000 est réservé au backend et au callback OAuth. Tauri refuse de se connecter à un service déjà présent sur ce port.

## Backend embarqué et données

`scripts/prepare-desktop.mjs` copie le runtime Node de la machine de build vers `src-tauri/binaries/osumosis-node-<target>` et installe les dépendances de production pour ce même OS/CPU dans `.desktop/backend`. Le frontend, les workers et les modules natifs sont ajoutés aux ressources. Les bibliothèques mobiles inutilisées du paquet Realm sont retirées uniquement de cette copie pour réduire la taille.

Cette étape nécessite l’accès npm/GitHub/static.realm.io et le même runtime Node que les modules installés. Aucun Node/npm n’est requis sur le PC qui installe ensuite l’application. La compilation croisée n’est pas supportée : chaque OS est construit sur un runner correspondant.

Rust démarre le backend, attend le marqueur de disponibilité propre au processus et ouvre la fenêtre sur `http://127.0.0.1:3000`. Les commandes shell ne sont pas accessibles au frontend. Les seules permissions ajoutées à l’interface ouvrent les liens approuvés osu!/GitHub/tosu dans leur application système.

Les données desktop se trouvent dans le répertoire d’application de l’identifiant `io.github.debuzzz.osumosis`, résolu par Tauri (`app_data_dir`). Il est distinct du `.data` du dépôt ; les chemins osu! sont donc à renseigner lors du premier lancement desktop. Pour reprendre l’ancien catalogue, fermer les deux services puis copier le contenu de `.data` dans ce répertoire. Le chemin exact est indiqué dans `desktop-backend.log` au démarrage.

Les logs du backend desktop sont écrits dans `desktop-backend.log`, avec rotation. Le diagnostic de capture reste dans `tosu.log`. L’application demande l’arrêt local du backend à sa fermeture et termine le processus compagnon si nécessaire.

## Compiler un installateur

```bat
npm run desktop:build
```

Les résultats se trouvent dans `src-tauri/target/release/bundle`. La première compilation native génère `Cargo.lock` ; il faudra le versionner après la validation sur une machine équipée de Rust pour figer les dépendances natives.

## Releases

Le workflow `.github/workflows/desktop.yml` peut être lancé manuellement depuis GitHub Actions pour construire les artefacts Windows/macOS/Linux. Sur un tag `v*`, il crée une **release en brouillon**, avec les notes issues de `CHANGELOG.md`.

Processus de publication :

1. Déplacer les entrées pertinentes de `[Unreleased]` vers `[x.y.z]` avec la date, et synchroniser `package.json`, le lock npm, `Cargo.toml`, `tauri.conf.json` et les notes affichées dans l’app.
2. Valider les artefacts sur les OS cibles, puis créer le tag `vx.y.z` sur le commit choisi.
3. Laisser la CI produire le brouillon ; télécharger et essayer les installateurs avant de publier la release.

La signature Windows, la notarisation macOS et les mises à jour automatiques ne sont pas encore configurées. Les builds actuels servent aux essais ; la distribution publique sera préparée après validation.
