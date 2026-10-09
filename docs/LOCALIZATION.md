# Localization

The frontend uses i18next/react-i18next. **English is the source, default and fallback language.** French is an optional translation. Settings saves the selected language under `osumosis.language` in browser/WebView local storage; an existing French preference is preserved. Missing, unsupported or inaccessible preferences use English.

## Source and resources

- `src/lib/i18n.ts`: resources, available languages, regional formatting and preference handling.
- `src/locales/en.json`: canonical English source strings.
- `src/locales/fr.json`: French values using the same English keys.
- `index.html`: starts with `lang="en"`; `document.documentElement.lang` follows the selected language.
- `locale()` supplies the regional locale for numbers and dates; each language declares its own locale.

Keys use the English text, with `keySeparator: false` and `nsSeparator: false`. Add source strings to English first, then translate their values in other resources:

```tsx
t("osu! account: {{name}}", { name });
t("{{count}} seconds", { count });
```

Keep interpolation names unchanged in every language. Plurals use i18next suffixes such as `_one` and `_other`: `{{count}} seconds_one` contains `{{count}} second` in English and `{{count}} seconde` in French. A missing translation falls back to English. Use separate English keys when the French wording depends on context, such as the **Installed maps** tab and an **Installed** badge.

Map titles, tags, collections, mods, player names and search syntax are user/game data and are not translated. Backend diagnostics are technical messages rather than a fully localized error-code API; some specific messages may still appear in their original language. Structured backend error localization and RTL support remain roadmap work.

## Add a language

1. Copy `en.json` to the new language code and translate the values, keeping all keys and placeholders. Add the plural forms required by that language.
2. Import the resource in `src/lib/i18n.ts` and register it in `resources` and `languages`, with its native display name and regional locale.
3. Use English `t()` keys in new UI code. Independent components can call `useTranslation()` to subscribe to language changes.
4. Run `npm run verify`; localization checks cover preference handling, fallback and English/French resource keys/placeholders. Extend the resource checks to the new language and its plural forms.
5. Check long labels, narrow windows, keyboard navigation, accessible names and formatted numbers/dates in the real UI.

Do not replace the user's saved language when updating the default or adding a new translation. English remains the reference resource.
