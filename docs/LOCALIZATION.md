# Localisation

Le frontend utilise i18next/react-i18next. La langue est choisie dans les Réglages et conservée dans le stockage de la WebView/du navigateur. `document.documentElement.lang` suit la langue ; les nombres et dates utilisent `locale()`.

- `src/i18n.ts` : langues disponibles, ressources et préférence.
- `src/locales/fr.json` : textes français et fallback.
- `src/locales/en.json` : traductions anglaises.
- Les clés correspondent actuellement au texte source, avec `keySeparator: false`.
- `t('Compte osu! : {{name}}', { name })` gère l’interpolation ; conserver les placeholders dans toutes les traductions.
- Les noms de maps, tags, collections, mods, noms de joueur et la syntaxe de recherche ne se traduisent pas.
- Les erreurs techniques et les logs backend restent des diagnostics ; certaines erreurs spécifiques du serveur peuvent encore apparaître dans leur langue source.

## Ajouter une langue

1. Copier `fr.json` vers le code de langue souhaité, puis traduire les valeurs en gardant toutes les clés et placeholders.
2. Importer la ressource dans `src/i18n.ts`, l’ajouter à `resources` et à `languages` avec son nom natif.
3. Adapter `locale()` au code régional de cette langue.
4. Utiliser `t()` dans les nouveaux composants. Les composants autonomes peuvent appeler `useTranslation()` pour suivre les changements de langue.
5. Vérifier les libellés longs, les petites fenêtres, le clavier et les textes alternatifs lors des essais de l’interface.

La direction RTL reste à ajouter avant de proposer une langue qui l’utilise.
