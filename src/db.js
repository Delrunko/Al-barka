// Données LOCALES (localStorage) : démo sans backend. À remplacer plus tard par l'API / Supabase.
const K='nt_db_v1';
const day=h=>{const t=new Date(Date.now()+864e5),p=n=>String(n).padStart(2,'0');return `${t.getFullYear()}-${p(t.getMonth()+1)}-${p(t.getDate())}T${p(h)}:00`};
export const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const seed=()=>({
 agencies:['Douala','Bafoussam','Yaoundé','Foumban','Koutaba','Foumbot'].map((nom,i)=>({id:'a'+(i+1),nom,sous:[]})),
 users:[['u1','admin','admin123','Administrateur','admin',null],['u2','chef.douala','chef123','Chef de site Douala','chef','a1'],['u3','chef.bafoussam','chef123','Chef de site Bafoussam','chef','a2'],
  ['u4','caisse.douala','caisse123','Caissier Douala','caissier','a1'],['u5','caisse.bafoussam','caisse123','Caissier Bafoussam','caissier','a2'],['u6','agent.foumban','agent123','Agent Foumban','agent','a4']]
  .map(([id,login,pass,nom,role,agence])=>({id,login,pass,nom,role,agence})),
 bus:[{id:'b1',numero:'AB-101',capacite:50,type:'NUMEROTE'},{id:'b2',numero:'AB-205',capacite:40,type:'NON_NUMEROTE'}],
 departs:[{id:'d1',busId:'b1',itineraire:'Douala → Bafoussam',date:day(8),capacite:50,type:'NUMEROTE',prix:5000,quotas:{a1:20,a2:15,a4:10,a5:5}},
  {id:'d2',busId:'b2',itineraire:'Bafoussam → Douala',date:day(14),capacite:40,type:'NON_NUMEROTE',prix:5000,quotas:{a2:20,a1:10,a4:10}}],
 ventes:[[1,'a1'],[2,'a1'],[11,'a2']].map(([seat,agenceId],i)=>({id:'v'+i,no:i+1,departId:'d1',agenceId,seat,clientNom:'Client démo',clientTel:'6XXXXXXXX',ts:Date.now()-36e5*(i+2),sync:'SYNCED',statut:'VENDUE',prix:5000,par:'Administrateur'})),
 remote:[],settings:{online:true,ticket:4}});
export const load=()=>{try{return JSON.parse(localStorage.getItem(K))||seed()}catch{return seed()}};
export const save=d=>localStorage.setItem(K,JSON.stringify(d));
export const fresh=seed;
