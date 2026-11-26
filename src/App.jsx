import { useState, useEffect, Fragment } from 'react';
import { load, save, uid, fresh } from './db.js';

const ROLES = { admin: 'Administrateur', chef: 'Chef de site', caissier: 'Caissier', agent: 'Agent' };
const PERM = { admin: ['dash', 'vente', 'departs', 'agences', 'employes'], chef: ['dash', 'vente', 'departs', 'employes'], caissier: ['vente', 'departs'], agent: ['vente', 'departs'] };
const TABS = { dash: ['dashboard', 'Tableau de bord'], vente: ['ticket', 'Vente'], departs: ['bus', 'Départs'], agences: ['pin', 'Agences'], employes: ['users', 'Employés'] };
const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  ticket: <><path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z" /><path d="M13 5v2m0 4v2m0 4v2" /></>,
  bus: <><path d="M5 16V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11" /><path d="M5 10h14M5 16h14l2 3H3l2-3Zm2 3v2m10-2v2" /><circle cx="8" cy="13" r="1" /><circle cx="16" cy="13" r="1" /></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  settings: <><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3" /><path d="M2 14h4m4-6h4m4 8h4" /></>,
  sync: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
  alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  reset: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></>,
  logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>
};
const Icon = ({ name, size = 18 }) => <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>;
const fmt = n => Number(n || 0).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
const dt = s => new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const sold = (d, p, ag) => d.ventes.filter(v => v.statut === 'VENDUE' && v.departId === p.id && (!ag || v.agenceId === ag)).length;
const Logo = ({ s = 46 }) => <img src="logo.png" alt="Al Barka Line Express" width={s} height={s} onError={e => { e.target.style.display = 'none' }} />;
// Arbitrage hors ligne : la vente la plus ancienne (horodatage) gagne.
function resolve(n) {
  let s = 0, c = 0; n.ventes.filter(v => v.sync === 'PENDING').sort((a, b) => a.ts - b.ts).forEach(v => {
    const clash = v.seat != null && n.remote.some(r => r.departId === v.departId && r.seat === v.seat && r.ts < v.ts);
    v.sync = clash ? 'CONFLICT' : 'SYNCED'; clash ? c++ : s++
  }); return [s, c]
}

export default function App() {
  const [d, setD] = useState(load);
  const [meId, setMeId] = useState(() => localStorage.getItem('nt_me'));
  const [tab, setTab] = useState('vente');
  const [msg, setMsg] = useState('');
  const [ticket, setTicket] = useState(null);
  const [conf, setConf] = useState(false);
  const [dep, setDep] = useState(null);
  const [seat, setSeat] = useState(null);
  const [agSel, setAgSel] = useState(null);
  const [qs, setQs] = useState({});
  const [bsel, setBsel] = useState('b1');
  const [lg, setLg] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  useEffect(() => save(d), [d]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2800); return () => clearTimeout(t) }, [msg]);
  const mut = f => { const n = structuredClone(d); const r = f(n); setD(n); return r };
  const user = d.users.find(u => u.id === meId);
  if (!user) return <div className="login card"><Logo s={110} /><h2>Al Barka</h2><p style={{ color: 'var(--m)' }}>Al Barka Line Express · Le Plaisir de Voyager</p>
    <form onSubmit={e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const u = d.users.find(x => x.login === f.l && x.pass === f.p);
      if (u) { localStorage.setItem('nt_me', u.id); setMeId(u.id); setTab(u.role === 'admin' ? 'dash' : 'vente') } else setLg('Identifiant ou mot de passe incorrect.')
    }}>
      <label>Identifiant<input name="l" autoFocus /></label><label>Mot de passe<input name="p" type="password" /></label><button>Se connecter</button></form>
    <p style={{ color: '#B91C1C' }}>{lg}</p><small style={{ color: 'var(--m)' }}>Démo : admin/admin123 · chef.douala/chef123 · caisse.douala/caisse123 · agent.foumban/agent123</small></div>;

  const isA = user.role === 'admin', isC = user.role === 'chef', online = d.settings.online;
  const tabs = PERM[user.role]; const cur = tabs.includes(tab) ? tab : tabs[0];
  const toast = m => { setMsg(m) };
  const report = ([s, c]) => { toast(s + c === 0 ? 'Rien à synchroniser' : s + ' vente(s) synchronisée(s)' + (c ? ', ' + c + ' conflit(s) à traiter' : '')); if (c) setConf(true) };
  const net = () => { const on = !online; const r = mut(n => { n.settings.online = on; return on ? resolve(n) : [0, 0] }); if (on) report(r); else toast('Mode hors ligne simulé') };
  const syncNow = () => online ? report(mut(n => resolve(n))) : toast('Hors ligne : reconnectez-vous pour synchroniser');
  const simulate = () => {
    const v = d.ventes.find(x => x.sync === 'PENDING' && x.seat != null && x.statut === 'VENDUE');
    if (!v) return toast('Passez hors ligne et vendez un siège numéroté, puis simulez');
    mut(n => { n.remote.push({ departId: v.departId, seat: v.seat, ts: v.ts - 2000, agence: 'Autre agence' }) }); toast('Une autre agence a vendu le siège ' + v.seat + ' juste avant vous')
  };
  const sell = (p, ag, st, cl) => {
    if (sold(d, p, ag) >= (p.quotas[ag] || 0)) return toast('Quota atteint pour cette agence : vente bloquée');
    if (sold(d, p) >= p.capacite) return toast('Départ complet');
    if (p.type === 'NUMEROTE') {
      if (d.ventes.some(v => v.statut === 'VENDUE' && v.departId === p.id && v.seat === st)) return toast('Siège déjà vendu');
      if (online && d.remote.some(r => r.departId === p.id && r.seat === st)) return toast('Siège vendu par une autre agence')
    }
    const v = { id: uid(), no: d.settings.ticket, departId: p.id, agenceId: ag, seat: p.type === 'NUMEROTE' ? st : null, clientNom: cl.nom, clientTel: cl.tel, ts: Date.now(), sync: online ? 'SYNCED' : 'PENDING', statut: 'VENDUE', prix: p.prix, par: user.nom };
    mut(n => { n.settings.ticket++; n.ventes.unshift(v) }); setTicket(v); toast(online ? 'Vente enregistrée' : 'Vente enregistrée hors ligne (en attente de synchro)'); return true
  };
  const cancel = v => { const m = prompt('Motif d’annulation du billet ?'); if (!m) return; mut(n => { const x = n.ventes.find(y => y.id === v.id); x.statut = 'ANNULEE'; x.motif = m }); toast('Billet annulé') };
  const reassign = v => {
    const p = d.departs.find(x => x.id === v.departId);
    const used = new Set([...d.ventes.filter(x => x.statut === 'VENDUE' && x.departId === p.id && x.id !== v.id).map(x => x.seat), ...d.remote.filter(r => r.departId === p.id).map(r => r.seat)]);
    let s = 1; while (used.has(s) && s <= p.capacite) s++; if (s > p.capacite) return toast('Aucun siège libre');
    mut(n => { const x = n.ventes.find(y => y.id === v.id); x.seat = s; x.sync = 'SYNCED' }); toast('Réaffecté au siège ' + s)
  };
  const setChef = (ag, uidc) => mut(n => { n.users.forEach(u => { if (u.agence === ag && u.role === 'chef') u.role = 'caissier' }); const u = n.users.find(x => x.id === uidc); if (u) u.role = 'chef'; });
  const nomAg = id => d.agencies.find(a => a.id === id)?.nom || '—';
  const conflicts = d.ventes.filter(v => v.sync === 'CONFLICT' && v.statut === 'VENDUE'), pending = d.ventes.filter(v => v.sync === 'PENDING' && v.statut === 'VENDUE').length;

  const Dash = () => {
    const scope = isA ? null : user.agence; const act = d.ventes.filter(v => v.statut === 'VENDUE' && (!scope || v.agenceId === scope));
    const libres = d.departs.reduce((s, p) => s + p.capacite - sold(d, p), 0);
    return <>
      <div className="kpis"><div className="kpi"><b>{act.length}</b>Billets vendus</div><div className="kpi"><b>{libres}</b>Places libres (réseau)</div>
        <div className="kpi"><b>{act.filter(v => v.sync === 'PENDING').length}</b>En attente de synchro</div><div className="kpi"><b>{act.filter(v => v.sync === 'CONFLICT').length}</b>Conflits</div></div>
      {d.departs.map(p => <div className="card" key={p.id}><div className="row"><div><b>{p.itineraire}</b> · {dt(p.date)}<br /><small>{d.bus.find(b => b.id === p.busId)?.numero} · {fmt(p.prix)} FCFA</small></div><b>{sold(d, p)}/{p.capacite}</b></div>
        <div className={'bar' + (sold(d, p) >= p.capacite ? ' full' : '')}><i style={{ width: sold(d, p) / p.capacite * 100 + '%' }} /></div>
        <div style={{ marginTop: 10 }}>{Object.entries(p.quotas).filter(([a]) => !scope || a === scope).map(([a, q]) => <span className="tag" key={a}>{nomAg(a)} : {sold(d, p, a)}/{q}</span>)}</div></div>)}
      {isA && <div className="card"><h2>Ventes par agence</h2>{d.agencies.map(a => <div className="row" key={a.id}><span>{a.nom}</span><b>{d.ventes.filter(v => v.statut === 'VENDUE' && v.agenceId === a.id).length} billet(s)</b></div>)}</div>}</>
  };

  const Vente = () => {
    const mine = d.departs.filter(p => isA || (p.quotas[user.agence] || 0) > 0); const ag = isA ? (agSel || d.agencies[0].id) : user.agence;
    const D = mine.find(p => p.id === dep) || mine[0]; if (!D) return <div className="card">Aucun départ ouvert pour votre agence.</div>;
    const q = D.quotas[ag] || 0, u = sold(d, D, ag), t = sold(d, D), full = u >= q || t >= D.capacite;
    const by = {}; d.ventes.filter(v => v.statut === 'VENDUE' && v.departId === D.id).forEach(v => { if (v.seat != null) by[v.seat] = v });
    const rem = new Set(online ? d.remote.filter(r => r.departId === D.id).map(r => r.seat) : []);
    const form = <form className="grid" onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); if (sell(D, ag, seat, { nom: f.nom, tel: f.tel })) { e.target.reset(); setSeat(null) } }}>
      <label>Nom du client<input name="nom" required /></label><label>Téléphone<input name="tel" required /></label>
      <button disabled={full || (D.type === 'NUMEROTE' && seat == null)}>{D.type === 'NUMEROTE' ? (seat ? 'Vendre le siège ' + seat : 'Choisir un siège') : 'Vendre +1'}</button></form>;
    return <>
      <div className="card grid"><label>Départ<select value={D.id} onChange={e => { setDep(e.target.value); setSeat(null) }}>{mine.map(p => <option key={p.id} value={p.id}>{p.itineraire} · {dt(p.date)}</option>)}</select></label>
        {isA ? <label>Agence active<select value={ag} onChange={e => setAgSel(e.target.value)}>{d.agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></label> : <div><small>Agence</small><br /><b>{nomAg(ag)}</b></div>}
        <div><small>Quota agence</small><br /><b>{u}/{q}</b><div className={'bar' + (u >= q ? ' full' : '')}><i style={{ width: Math.min(100, q ? u / q * 100 : 100) + '%' }} /></div></div>
        <div><small>Capacité du bus</small><br /><b>{t}/{D.capacite}</b><div className={'bar' + (t >= D.capacite ? ' full' : '')}><i style={{ width: t / D.capacite * 100 + '%' }} /></div></div></div>
      {full && <div className="alert"><Icon name="alert" /> {t >= D.capacite ? 'Départ complet.' : 'Quota de l’agence atteint.'} Les ventes sont bloquées automatiquement.</div>}
      <div className="card"><h2>{D.type === 'NUMEROTE' ? 'Plan du bus · sièges numérotés' : 'Vente au compteur global'}</h2>
        {D.type === 'NUMEROTE' ? <>
          <div className="legend">{[['Disponible', 'var(--g)'], ['Sélectionné', 'var(--g)'], ['Vendu', '#94A3B8'], ['Vendu ailleurs', 'var(--b)'], ['En attente synchro', 'var(--o)'], ['Conflit', '#B91C1C']].map(([l, c]) => <span key={l} style={{ '--c': c }}>{l}</span>)}</div>
          <div className="bus">{Array.from({ length: D.capacite }, (_, i) => i + 1).map(n => {
            const v = by[n]; const cls = v ? (v.sync === 'PENDING' ? 'pending' : v.sync === 'CONFLICT' ? 'conflict' : 'sold') : rem.has(n) ? 'remote' : seat === n ? 'sel' : '';
            return <Fragment key={n}><button type="button" className={'seat ' + cls} disabled={!!v || rem.has(n) || full} onClick={() => setSeat(n)}>{n}</button>{n % 4 === 2 && <i className="aisle" />}</Fragment>
          })}</div>
          <div style={{ marginTop: 14 }}>{form}</div></> : form}</div>
      <div className="card"><h2>Billets du départ <span className="table-count">{d.ventes.filter(v => v.departId === D.id && v.statut === 'VENDUE').length} vendus</span></h2>
        <div className="table-wrap"><table className="tickets-table"><thead><tr><th>Billet</th><th>Passager</th><th>Siège</th><th>Agence</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>{d.ventes.filter(v => v.departId === D.id).map(v => <tr key={v.id} className={v.statut === 'ANNULEE' ? 'cancelled' : ''}>
            <td><b>#{String(v.no).padStart(6, '0')}</b></td><td>{v.clientNom}<small>{v.clientTel}</small></td><td>{v.seat ?? '—'}</td><td>{nomAg(v.agenceId)}</td><td>{dt(v.ts)}</td>
            <td><span className={'status ' + (v.statut === 'ANNULEE' ? 'status-cancelled' : v.sync === 'PENDING' ? 'status-pending' : v.sync === 'CONFLICT' ? 'status-conflict' : 'status-synced')}>{v.statut === 'ANNULEE' ? 'Annulé' : v.sync === 'PENDING' ? 'À synchroniser' : v.sync === 'CONFLICT' ? 'Conflit' : 'Vendu'}</span></td>
            <td><div className="acts"><button className="sec" onClick={() => setTicket(v)}>Billet</button>{(isA || isC) && v.statut === 'VENDUE' && <button className="red" onClick={() => cancel(v)}>Annuler</button>}</div></td>
          </tr>)}</tbody></table>
          {!d.ventes.some(v => v.departId === D.id) && <p className="muted table-empty">Aucun billet vendu pour ce départ.</p>}</div></div></>
  };

  const Departs = () => {
    const bus = d.bus.find(b => b.id === bsel) || d.bus[0]; const tot = Object.values(qs).reduce((s, x) => s + (+x || 0), 0);
    const createBus = e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const capacite = Number(f.capacite);
      if (d.bus.some(b => b.numero.toLowerCase() === f.numero.trim().toLowerCase())) return toast('Ce numéro de bus existe déjà');
      if (!Number.isInteger(capacite) || capacite < 1) return toast('Indiquez un nombre de places valide');
      const newBus = { id: uid(), numero: f.numero.trim(), capacite, type: f.type };
      mut(n => { n.bus.push(newBus) }); setBsel(newBus.id); e.target.reset(); toast('Bus ajouté à la flotte')
    };
    const createSiteDeparture = e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      if (f.destination === user.agence) return toast('Choisissez une autre agence comme destination');
      mut(n => { n.departs.unshift({ id: uid(), busId: bus.id, itineraire: nomAg(user.agence) + ' → ' + nomAg(f.destination), date: f.date, capacite: bus.capacite, type: bus.type, prix: Number(f.prix) || 0, quotas: { [user.agence]: bus.capacite } }) });
      e.target.reset(); toast('Départ créé pour ' + nomAg(user.agence))
    };
    return <>
      {(isA || isC) && <details className="card bus-creation"><summary><Icon name="bus" /> Ajouter un bus à la flotte</summary>
        <form className="grid" onSubmit={createBus}><label>Numéro du bus<input name="numero" placeholder="Ex. AB-301" required /></label>
          <label>Nombre de places<input name="capacite" type="number" min="1" step="1" placeholder="Ex. 50" required /></label>
          <label>Disposition des sièges<select name="type"><option value="NUMEROTE">Sièges numérotés</option><option value="NON_NUMEROTE">Compteur global</option></select></label>
          <button>Enregistrer le bus</button></form></details>}
      {isC && <form className="card" onSubmit={createSiteDeparture}>
        <h2>Créer un départ pour votre site</h2><p className="muted">Origine : <b>{nomAg(user.agence)}</b> · Le quota de votre site correspond à la capacité du bus sélectionné.</p>
        <div className="grid"><label>Bus<select value={bus.id} onChange={e => setBsel(e.target.value)}>{d.bus.map(b => <option key={b.id} value={b.id}>{b.numero} · {b.capacite} places</option>)}</select></label>
          <label>Destination<select name="destination" required>{d.agencies.filter(a => a.id !== user.agence).map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></label>
          <label>Date et heure<input name="date" type="datetime-local" required /></label><label>Prix (FCFA)<input name="prix" type="number" min="0" defaultValue="5000" required /></label></div>
        <button style={{ marginTop: 12 }}>Créer le départ</button></form>}
      {isA && <form className="card" onSubmit={e => {
        e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); if (f.o === f.t) return toast('Départ et arrivée identiques');
        const quotas = {}; Object.entries(qs).forEach(([k, v]) => { if (+v > 0) quotas[k] = +v });
        mut(n => { n.departs.unshift({ id: uid(), busId: bus.id, itineraire: nomAg(f.o) + ' → ' + nomAg(f.t), date: f.date, capacite: bus.capacite, type: bus.type, prix: +f.prix || 0, quotas }) }); setQs({}); toast('Départ créé'); e.target.reset()
      }}>
        <h2>Créer un départ</h2><div className="grid"><label>Bus<select value={bus.id} onChange={e => setBsel(e.target.value)}>{d.bus.map(b => <option key={b.id} value={b.id}>{b.numero} · {b.capacite} places · {b.type === 'NUMEROTE' ? 'numéroté' : 'compteur'}</option>)}</select></label>
          <label>Départ<select name="o">{d.agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></label><label>Arrivée<select name="t" defaultValue="a2">{d.agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></label>
          <label>Date et heure<input name="date" type="datetime-local" required /></label><label>Prix (FCFA)<input name="prix" type="number" min="0" defaultValue="5000" /></label></div>
        <h2 style={{ marginTop: 14 }}>Quotas par agence · {tot}/{bus.capacite}</h2>
        <div className="grid">{d.agencies.map(a => <label key={a.id}>{a.nom}<input type="number" min="0" value={qs[a.id] ?? ''} onChange={e => setQs({ ...qs, [a.id]: e.target.value })} /></label>)}</div>
        <div className={'bar' + (tot > bus.capacite ? ' full' : '')}><i style={{ width: Math.min(100, tot / bus.capacite * 100) + '%' }} /></div>
        {tot > bus.capacite && <div className="alert" style={{ marginTop: 10 }}>La somme des quotas dépasse la capacité du bus.</div>}
        <button style={{ marginTop: 12 }} disabled={tot > bus.capacite || tot === 0}>Créer le départ</button></form>}
      {d.departs.filter(p => isA || (p.quotas[user.agence] || 0) > 0).map(p => <div className="card" key={p.id}><div className="row"><div><b>{p.itineraire}</b> · {dt(p.date)}<br /><small>{d.bus.find(b => b.id === p.busId)?.numero} · {fmt(p.prix)} FCFA</small></div><span className="tag">{p.type === 'NUMEROTE' ? 'Numéroté' : 'Compteur'}</span></div>
        <div className={'bar' + (sold(d, p) >= p.capacite ? ' full' : '')}><i style={{ width: sold(d, p) / p.capacite * 100 + '%' }} /></div>
        <div style={{ marginTop: 10 }}>{Object.entries(p.quotas).map(([a, q]) => <span className="tag" key={a}>{nomAg(a)} : {sold(d, p, a)}/{q}</span>)}</div></div>)}</>
  };

  const Agences = () => <>
    <form className="card grid" onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); mut(n => { n.agencies.push({ id: uid(), nom: f.nom, sous: [] }) }); e.target.reset(); toast('Agence créée') }}>
      <label>Nouvelle agence / hub<input name="nom" required /></label><button>Créer l’agence</button></form>
    {d.agencies.map(a => {
      const emp = d.users.filter(u => u.agence === a.id); const chef = emp.find(u => u.role === 'chef');
      return <div className="card" key={a.id}><div className="row"><div><b>{a.nom}</b><br /><small>Chef de site : {chef ? chef.nom : 'non nommé'} · {emp.length} employé(s)</small></div>
        <label>Nommer le chef de site<select value={chef?.id || ''} onChange={e => { setChef(a.id, e.target.value); toast('Droits de chef de site accordés') }}><option value="">—</option>{emp.map(u => <option key={u.id} value={u.id}>{u.nom} ({ROLES[u.role]})</option>)}</select></label></div>
        <div>{a.sous.map(s => <span className="tag" key={s}>{s}</span>)}{!a.sous.length && <small>Aucun sous-point de collecte.</small>}</div>
        <form className="grid" style={{ marginTop: 8 }} onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); mut(n => { n.agencies.find(x => x.id === a.id).sous.push(f.s) }); e.target.reset() }}>
          <label>Ajouter un sous-point<input name="s" required /></label><button className="sec">Ajouter</button></form></div>
    })}</>;

  const Employes = () => {
    const list = d.users.filter(u => isA || u.agence === user.agence); const rolesOk = isA ? ['chef', 'caissier', 'agent', 'admin'] : ['caissier', 'agent'];
    return <>
      <form className="card grid" onSubmit={e => {
        e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); if (d.users.some(u => u.login === f.login)) return toast('Identifiant déjà utilisé');
        mut(n => { n.users.push({ id: uid(), nom: f.nom, login: f.login, pass: f.pass, role: f.role, agence: f.role === 'admin' ? null : (isA ? f.agence : user.agence) }) }); e.target.reset(); toast('Employé ajouté')
      }}>
        <label>Nom<input name="nom" required /></label><label>Identifiant<input name="login" required /></label><label>Mot de passe<input name="pass" required /></label>
        <label>Rôle<select name="role">{rolesOk.map(r => <option key={r} value={r}>{ROLES[r]}</option>)}</select></label>
        {isA && <label>Agence<select name="agence">{d.agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></label>}<button>Ajouter</button></form>
      <div className="card"><h2>{isA ? 'Tous les employés' : 'Employés de votre site'} ({list.length})</h2>{list.map(u => <div className="row" key={u.id}><div><b>{u.nom}</b><br /><small>{u.login} · {u.agence ? nomAg(u.agence) : 'Siège'}</small></div>
        <div className="acts" style={{ display: 'flex', gap: 6 }}>{isA ? <select value={u.role} onChange={e => { if (e.target.value === 'chef' && u.agence) setChef(u.agence, u.id); else mut(n => { n.users.find(x => x.id === u.id).role = e.target.value }) }}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> : <span className="tag">{ROLES[u.role]}</span>}
          {u.id !== user.id && (isA || ['caissier', 'agent'].includes(u.role)) && <button className="red" onClick={() => confirm('Supprimer ' + u.nom + ' ?') && mut(n => { n.users = n.users.filter(x => x.id !== u.id) })}>Supprimer</button>}</div></div>)}</div></>
  };

  return <div className="shell">
    <aside className="side"><div className="brand"><Logo /><div>Al Barka<small>Al Barka Line Express</small></div></div>
      <nav className="nav-links">{tabs.map(k => <button key={k} className={cur === k ? 'on' : ''} onClick={() => setTab(k)}><Icon name={TABS[k][0]} />{TABS[k][1]}</button>)}</nav>
      <div className="side-footer">
        <button className={'tools-toggle' + (toolsOpen ? ' expanded' : '')} aria-expanded={toolsOpen} onClick={() => setToolsOpen(!toolsOpen)}><Icon name="settings" /><span>Actions & compte</span><span className="toggle-chevron">{toolsOpen ? '−' : '+'}</span></button>
        {toolsOpen && <div className="side-panel">
          <div className="side-user"><b>{user.nom}</b><small>{ROLES[user.role]}</small></div>
          <div className="side-status"><span className={'status-dot' + (online ? '' : ' offline')} />{online ? 'En ligne' : 'Hors ligne'}<span className="side-pending">{pending} en attente</span></div>
          <button className="side-action" onClick={net}><Icon name="sync" />{online ? 'Passer hors ligne' : 'Passer en ligne'}</button>
          <button className="side-action" onClick={syncNow}><Icon name="sync" />Synchroniser</button>
          {conflicts.length > 0 && <button className="side-action side-alert" onClick={() => setConf(true)}><Icon name="alert" />{conflicts.length} conflit(s) à traiter</button>}
          <button className="side-action" onClick={simulate}><Icon name="alert" />Simuler une vente concurrente</button>
          {isA && <button className="side-action" onClick={() => confirm('Réinitialiser la démo ?') && setD(fresh())}><Icon name="reset" />Réinitialiser la démo</button>}
          <button className="side-action side-logout" onClick={() => { localStorage.removeItem('nt_me'); setMeId(null) }}><Icon name="logout" />Se déconnecter</button>
        </div>}
      </div>
    </aside>
    <div><header className="page-header noprint"><h1>{TABS[cur][1]}</h1><span className="chip sim">Mode simulation</span></header>
      <main key={cur}>{cur === 'dash' && Dash()}{cur === 'vente' && Vente()}{cur === 'departs' && Departs()}{cur === 'agences' && isA && Agences()}{cur === 'employes' && Employes()}</main></div>
    {msg && <div className="toast">{msg}</div>}
    {conf && <div className="modal"><div className="mbox"><h2>Conflits de synchronisation</h2><p style={{ color: 'var(--m)' }}>Une autre agence a vendu ces sièges avant vous (horodatage prioritaire).</p>
      {conflicts.length === 0 && <p>Plus aucun conflit.</p>}
      {conflicts.map(v => <div className="row" key={v.id}><div><b>Siège {v.seat}</b> · {v.clientNom}<br /><small>{nomAg(v.agenceId)}</small></div><div style={{ display: 'flex', gap: 6 }}><button onClick={() => reassign(v)}>Autre siège</button><button className="red" onClick={() => cancel(v)}>Annuler</button></div></div>)}
      <button className="sec" style={{ marginTop: 12 }} onClick={() => setConf(false)}>Fermer</button></div></div>}
    {ticket && (() => {
      const p = d.departs.find(x => x.id === ticket.departId); return <div className="modal"><div className="mbox"><div className="ticket"><Logo s={70} /><h3>AL BARKA LINE EXPRESS</h3><small>Le Plaisir de Voyager</small>
        <p className="no">Billet N° {String(ticket.no).padStart(6, '0')}</p>
        {[['Trajet', p?.itineraire], ['Départ', p && dt(p.date)], ['Passager', ticket.clientNom], ['Téléphone', ticket.clientTel], ['Siège', ticket.seat || 'Compteur global'], ['Prix', fmt(ticket.prix) + ' FCFA'], ['Agence', nomAg(ticket.agenceId)], ['Émis par', ticket.par]].map(([l, v]) => <div className="r" key={l}><b>{l}</b><span>{v}</span></div>)}
        <small>Statut : {ticket.sync === 'PENDING' ? 'en attente de synchronisation' : 'confirmé'}</small></div>
        <div className="noprint" style={{ display: 'flex', gap: 8, marginTop: 12 }}><button onClick={() => window.print()}>Imprimer</button><button className="sec" onClick={() => setTicket(null)}>Fermer</button></div></div></div>
    })()}
  </div>;
}
