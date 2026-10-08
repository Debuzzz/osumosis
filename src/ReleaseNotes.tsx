import { Dialog } from './Dialog';
import { t } from './i18n';

export function ReleaseNotes({ onClose }: { onClose: () => void }) {
  return <Dialog title={t('Notes de version')} onClose={onClose}>
    <span className="badge">0.2.0 · {t('En préparation')}</span>
    <ul className="release-notes"><li>{t('Application desktop Tauri avec backend local embarqué.')}</li><li>{t('Connexion au compte osu! et profil public en cache.')}</li><li>{t('Interface traduisible, navigation mobile et accessibilité clavier améliorée.')}</li><li>{t('Profils stable/lazer, chargement au scroll et diagnostic de capture tosu.')}</li><li>{t('Une vue commune pour le direct et les tentatives, avec chronologie et erreurs regroupées.')}</li></ul>
    <p>{t('Les versions publiées et leurs exécutables seront disponibles dans GitHub Releases.')}</p>
    <a className="secondary-button" href="https://github.com/Debuzzz/osumosis/releases" target="_blank" rel="noreferrer">{t('Voir les versions sur GitHub')}</a>
  </Dialog>;
}
