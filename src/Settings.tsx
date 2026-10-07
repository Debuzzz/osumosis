import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, FolderOpen, LoaderCircle, Radio, RefreshCw, Sparkles, Target } from 'lucide-react';
import type { PublicSettings, SettingsResponse } from '../shared/types';
import { api } from './api';

export function Settings({ notify, onIndex, onSaved }: { notify: (message: string) => void; onIndex: () => void; onSaved: () => void }) {
  const query = useQuery({ queryKey: ['settings'], queryFn: () => api<SettingsResponse>('/api/settings') });
  const [form, setForm] = useState<(PublicSettings & { clientSecret: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  useEffect(() => { if (query.data) setForm({ ...query.data.settings, clientSecret: '' }); }, [query.data]);
  const field = (key: 'client' | 'tosuUrl' | 'clientId' | 'clientSecret' | 'targetStars' | 'preferredMods', value: string | number) =>
    setForm(previous => previous ? { ...previous, [key]: value } : previous);
  const libraryField = (key: 'osuPath' | 'songsPath', value: string) => setForm(previous => previous ? {
    ...previous,
    libraries: { ...previous.libraries, [previous.client]: { ...previous.libraries[previous.client], [key]: value } },
  } : previous);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!form) return;
    setBusy(true);
    try {
      await api('/api/settings', form, 'PUT');
      onSaved(); await client.invalidateQueries();
      notify('Réglages enregistrés. Après un changement de profil ou de dossiers, indexe la bibliothèque sélectionnée.');
    } catch (error) { notify((error as Error).message); }
    finally { setBusy(false); }
  };
  const saved = query.data?.settings;
  const libraryChanged = !!form && !!saved && (form.client !== saved.client || JSON.stringify(form.libraries[form.client]) !== JSON.stringify(saved.libraries[saved.client]));
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span /> KEEP IT CLOSE</div><h1>À ta façon<span>.</span></h1><p>Choisis ton client osu! et configure sa bibliothèque locale.</p></div></div>
    {query.isError && <div className="error-box">{query.error.message}</div>}
    {form && <form className="settings-form" onSubmit={save}>
      <section className="settings-section">
        <div className="section-title"><FolderOpen size={19} /><h2>Bibliothèque osu!</h2><span className="badge">Lecture seule</span></div>
        <div className="client-switch" role="group" aria-label="Client osu! sélectionné">
          {(['lazer', 'stable'] as const).map(value => <button type="button" key={value} aria-pressed={form.client === value} className={`secondary-button ${form.client === value ? 'active' : ''}`} onClick={() => field('client', value)}>osu!{value}{form.client === value && <Check size={15} />}</button>)}
        </div>
        <p>Chaque profil conserve ses dossiers. Les réglages de tosu, de découverte et les préférences sont communs.</p>
        <label>{form.client === 'lazer' ? 'Dossier de données lazer' : 'Dossier d’installation stable'}
          <input value={form.libraries[form.client].osuPath} placeholder={form.client === 'lazer' ? 'C:\\Users\\ton_compte\\AppData\\Roaming\\osu' : 'C:\\Users\\ton_compte\\AppData\\Local\\osu!'} onChange={event => libraryField('osuPath', event.target.value)} />
        </label>
        {!!query.data?.detectedPaths[form.client].length && <div className="detected-paths">Détecté : {query.data.detectedPaths[form.client].map(folder => <button type="button" key={folder} onClick={() => libraryField('osuPath', folder)}>{folder}<Check size={13} /></button>)}</div>}
        {form.client === 'stable' ? <>
          <label>Dossier Songs personnalisé <span className="muted">facultatif</span><input value={form.libraries.stable.songsPath} placeholder="Par défaut : dossier osu!\Songs" onChange={event => libraryField('songsPath', event.target.value)} /></label>
          <p>Les fichiers .osu, osu!.db et collection.db sont lus sur place.</p>
        </> : <p>Choisis le dossier contenant la base client.realm (ou client_&lt;version&gt;.realm) et le dossier files. Ferme lazer avant d’indexer, puis relance-le pour jouer avec tosu. Les médias sont lus dans le stockage lazer ; la base est consultée sur une copie locale.</p>}
        {libraryChanged && <p className="notice">Enregistre ce profil avant de l’indexer. Les maps installées seront vérifiées pour cette bibliothèque.</p>}
      </section>
      <section className="settings-section">
        <div className="section-title"><Radio size={19} /><h2>Télémétrie tosu</h2></div>
        <label>Adresse WebSocket<input value={form.tosuUrl} onChange={event => field('tosuUrl', event.target.value)} /></label>
        <p>tosu doit tourner sur ce PC. L’application se reconnecte automatiquement.</p>
        <a className="text-link" href="https://tosu.app/" target="_blank" rel="noreferrer">Site de tosu<ExternalLink size={13} /></a>
      </section>
      <section className="settings-section">
        <div className="section-title"><Sparkles size={19} /><h2>Découverte en ligne</h2><span className="badge">5 appels / minute</span></div>
        <div className="form-grid">
          <label>osu! Client ID<input value={form.clientId} inputMode="numeric" onChange={event => field('clientId', event.target.value)} autoComplete="off" /></label>
          <label>Client secret<input type="password" value={form.clientSecret} placeholder={form.hasClientSecret ? 'Déjà enregistré · vide pour conserver' : 'Secret de ton application OAuth'} onChange={event => field('clientSecret', event.target.value)} autoComplete="new-password" /></label>
        </div>
        <p>Les identifiants restent dans le service local. La bibliothèque fonctionne aussi sans connexion à osu!.</p>
        <a className="text-link" href="https://osu.ppy.sh/home/account/edit#oauth" target="_blank" rel="noreferrer">Créer une application OAuth osu!<ExternalLink size={13} /></a>
      </section>
      <section className="settings-section">
        <div className="section-title"><Target size={19} /><h2>Préférences de départ</h2></div>
        <div className="form-grid">
          <label>Difficulté cible<input type="number" min="0" max="20" step="0.1" value={form.targetStars} onChange={event => field('targetStars', Number(event.target.value))} /></label>
          <label>Mods du simulateur<select value={form.preferredMods} onChange={event => field('preferredMods', event.target.value)}>{['NM', 'HD', 'HR', 'DT', 'HDDT', 'HDHR', 'HT', 'EZ'].map(mods => <option key={mods}>{mods}</option>)}</select></label>
        </div>
        <p>Les simulations utilisent les règles du profil sélectionné : osu!{form.client}.</p>
      </section>
      <div className="settings-actions">
        <button type="submit" className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Enregistrer les réglages</button>
        <button type="button" className="secondary-button" disabled={busy || libraryChanged} onClick={onIndex}><RefreshCw size={16} />Indexer le profil enregistré</button>
      </div>
    </form>}
  </>;
}
