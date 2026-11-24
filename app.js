(() => {
  'use strict';
  const KEY = 'bia-barros-producao-v1';
  const DAY = 86400000;
  const $ = (q, root=document) => root.querySelector(q);
  const $$ = (q, root=document) => [...root.querySelectorAll(q)];
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const today = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  const toDate = (s) => { const [y,m,d]=String(s||today()).split('-').map(Number); return new Date(y,m-1,d,12); };
  const iso = (d) => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const shifted = (date, offset) => {const d=toDate(date); d.setDate(d.getDate()+offset); return iso(d);};
  const fmtDate = (s, opts={}) => s ? toDate(s).toLocaleDateString('pt-BR',opts) : '—';
  const shortDate = s => fmtDate(s, {day:'2-digit',month:'2-digit',year:'numeric'});
  const validPhone = p => String(p||'').replace(/\D/g,'');
  const waUrl = (p, msg='') => {let v=validPhone(p); if(v && v.length<=11) v='55'+v; return v ? `https://wa.me/${v}${msg?'?text='+encodeURIComponent(msg):''}` : ''};
  const safeHref = v => esc(v);
  const initialTasks = () => [
    [-7,'Confirmar com a locadora os equipamentos de som e luz'],
    [-7,'Revisar rider e esclarecer dúvidas'],
    [-7,'Confirmar palco, estrutura, monitores side e energia'],
    [-7,'Confirmar corpo de bateria, pedestais e equipe técnica'],
    [-7,'Confirmar GrandMA2 / Command Wing e compatibilidade do show'],
    [-7,'Confirmar camarim privativo, alimentação e água'],
    [-3,'Reconfirmar equipamentos reservados com a locadora'],
    [-3,'Solicitar fotos da estrutura, se necessário'],
    [-3,'Confirmar transporte e hospedagem'],
    [-3,'Resolver pendências e substituições do rider'],
    [-1,'Confirmar que a locadora está pronta'],
    [-1,'Enviar localização e horários para a equipe'],
    [-1,'Conferir mesa, microfones, cabos e direct boxes próprios'],
    [-1,'Confirmar com Mimi o pagamento previsto em contrato'],
    [0,'Conferir palco, energia, som e iluminação com os técnicos'],
    [0,'Verificar camarim, alimentação e água'],
    [0,'Acompanhar a passagem de som'],
    [0,'Confirmar equipe e estrutura antes da chegada da Bia e do Mimi']
  ].map(([offset,title])=>({id:uid(),offset,title,done:false}));
  const initialSchedule = () => [
    ['08:00','Saída da equipe / transporte'], ['12:00','Chegada à cidade'],
    ['14:00','Montagem de palco, som e luz'], ['17:00','Conferência geral'],
    ['18:00','Passagem de som'], ['19:30','Camarim e produção final'],
    ['21:30','Equipe em posição'], ['22:00','Início do show'],
    ['23:30','Término previsto'], ['00:00','Desmontagem e retorno']
  ].map(([time,description])=>({id:uid(),time,description}));
  const NAV_DEFAULT = [
    ['inicio','Início','⌂'],['agenda','Agenda de shows','▦'],['checklist','Checklists','☑'],
    ['cronograma','Cronograma','◷'],['riders','Riders em PDF','▤'],['contatos','Contatos','♧'],
    ['anotacoes','Anotações importantes','✎'],['personalizar','Personalização','⚙'],['ajustes','Conta e backup','☁']
  ];
  const CATEGORIES_DEFAULT = ['Geral','Produção','Técnica','Logística','Equipe','Camarim','Contratantes','Urgente'];
  const SHOW_FIELDS = [['date','Data do show','date'],['city','Cidade','text'],['state','Estado (UF)','text'],['venue','Local do evento','text'],['address','Endereço completo','text'],['arrivalTime','Chegada da equipe','time'],['mountTime','Montagem','time'],['soundTime','Passagem de som','time'],['showTime','Início do show','time'],['notes','Observações','textarea']];
  const showFields = () => {const saved=state.settings.showFields||[];return SHOW_FIELDS.map(([id,label,type])=>({id,label,type,...(saved.find(f=>f.id===id)||{})})).sort((a,b)=>{const ia=saved.findIndex(x=>x.id===a.id),ib=saved.findIndex(x=>x.id===b.id);return (ia<0?999:ia)-(ib<0?999:ib);});};
  const defaultSettings = () => ({pages:NAV_DEFAULT.map(([id,label])=>({id,label,visible:true})),categories:[...CATEGORIES_DEFAULT],customFields:[],accent:'#f58b29'});
  const defaultState = () => ({version:2, contacts:{mimi:{name:'Mimi',role:'Empresário',phone:''},ju:{name:'Ju',role:'Produção',phone:''}},events:[],notes:[],settings:defaultSettings(),pdfMeta:{}});
  const ensureState = () => {
    if(!state || typeof state!=='object') state=defaultState();
    if(!Array.isArray(state.events)) state.events=[];
    state.contacts ||= defaultState().contacts;
    state.contacts.mimi ||= {name:'Mimi',role:'Empresário',phone:''};
    state.contacts.ju ||= {name:'Ju',role:'Produção',phone:''};
    state.notes ||= [];
    if(!Array.isArray(state.notes)) state.notes=[];
    state.pdfMeta ||= {};
    state.settings ||= defaultSettings();
    if(!Array.isArray(state.settings.pages)) state.settings.pages=defaultSettings().pages;
    for(const [id,label] of NAV_DEFAULT) if(!state.settings.pages.some(p=>p.id===id)) state.settings.pages.push({id,label,visible:true});
    state.settings.categories ||= [...CATEGORIES_DEFAULT];
    if(!Array.isArray(state.settings.customFields))state.settings.customFields=[];
    state.settings.accent ||= '#f58b29';
  };
  let state;
  try {state = JSON.parse(localStorage.getItem(KEY) || 'null') || defaultState();} catch {state=defaultState();}
  ensureState();
  let view='inicio', activeId=null, month=new Date(today()+'T12:00:00'), chosenDate='', toastTimer=null;
  const SUPABASE_URL='https://cjounaugqdimenissdbm.supabase.co';
  const SUPABASE_PUBLIC_KEY='sb_publishable_6rGXAZC2jxTzO0dhdxET0g_FrVNCjGA';
  // Public publishable key only; access is restricted server-side by Supabase RLS policies.
  let cloud = null, cloudUser = null, cloudRevision = null, remoteReady = false;
  let pendingRemote = false, cloudConflict = false, syncing = false, syncTimer = null, changeSerial = 0;
  let realtimeChannel = null, syncedSnapshot = '';
  const statusText = () => !cloud ? 'Nuvem indisponível (confira a conexão)' : !cloudUser ? 'Não conectado • dados apenas neste aparelho' : cloudConflict ? 'Conflito de edição • precisa resolver' : !navigator.onLine ? 'Sem internet • alterações guardadas localmente' : syncing ? 'Enviando alterações…' : pendingRemote ? 'Alterações aguardando sincronização' : `Conectado • ${cloudUser.email||'conta ativa'} • sincronizado`;
  function updateStatus(){const badge=$('#sync-status'),top=$('#cloud-status');if(badge)badge.textContent=statusText();if(top){top.textContent=cloudConflict?'⚠ Sincronização':pendingRemote?'◷ Pendente':cloudUser?'☁ Sincronizado':'☁ Entrar';top.title=statusText();}}
  function scheduleSync(){changeSerial++;updateStatus();if(!remoteReady||!cloudUser||cloudConflict)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow().catch(e=>{console.error(e);toast('Não foi possível sincronizar. Confira a internet.');}),600);}
  async function syncNow(manual=false){
    if(!cloudUser||!remoteReady||syncing||cloudConflict)return;
    if(!pendingRemote&&!manual){updateStatus();return;}
    if(!pendingRemote&&manual){await pullCloud();toast('Dados atualizados na nuvem.');return;}
    syncing=true;updateStatus();const serial=changeSerial;const snapshot=JSON.stringify(state);
    try{
      const payload={user_id:cloudUser.id,data:JSON.parse(snapshot),revision:(cloudRevision||0)+1,updated_at:new Date().toISOString()};
      const query=cloud.from('bia_production_state');
      const res=cloudRevision===null?await query.insert(payload).select('revision').single():await query.update(payload).eq('user_id',cloudUser.id).eq('revision',cloudRevision).select('revision').maybeSingle();
      if(res.error)throw res.error;
      if(!res.data){cloudConflict=true;toast('Outra edição foi salva antes. Resolva o conflito sem perder seus dados.');return;}
      cloudRevision=Number(res.data.revision);syncedSnapshot=snapshot;
      if(serial===changeSerial)pendingRemote=false;
    }catch(e){if(e.code==='23505'||e.code==='PGRST116'){cloudConflict=true;toast('Conflito de dados. Resolva antes de continuar.');}else{console.warn('Erro de sincronização',e);if(manual)toast('Sem sincronização: '+String(e.message||e));}}
    finally{syncing=false;updateStatus();if(pendingRemote&&!cloudConflict&&serial!==changeSerial)scheduleSync();}
  }
  const meaningfullyChanged=()=>state.events.length>0||state.notes.length>0||!!Object.values(state.pdfMeta||{}).length||JSON.stringify(state.contacts)!==JSON.stringify(defaultState().contacts)||JSON.stringify(state.settings)!==JSON.stringify(defaultSettings());
  function applyCloud(row){
    if(!row||!row.data)return;
    state=row.data;ensureState();cloudRevision=Number(row.revision);
    pendingRemote=false;cloudConflict=false;remoteReady=true;syncedSnapshot=JSON.stringify(state);
    localStorage.setItem(KEY,syncedSnapshot);
    if(activeId&&!state.events.some(e=>e.id===activeId))activeId=null;
    render();updateStatus();
  }
  async function pullCloud(){
    if(!cloudUser)return;
    const {data,error}=await cloud.from('bia_production_state').select('data,revision').eq('user_id',cloudUser.id).maybeSingle();
    if(error)throw error;
    if(data){
      if(pendingRemote){cloudConflict=true;updateStatus();return;}
      applyCloud(data);
    }else{
      cloudRevision=null;remoteReady=true;pendingRemote=true;scheduleSync();
    }
  }
  async function connectCloud(user){
    if(!user)return;
    if(cloudUser?.id===user.id&&remoteReady)return;
    cloudUser=user;remoteReady=false;cloudConflict=false;pendingRemote=false;cloudRevision=null;
    if(realtimeChannel){await cloud.removeChannel(realtimeChannel);realtimeChannel=null;}
    try{
      const {data,error}=await cloud.from('bia_production_state').select('data,revision').eq('user_id',user.id).maybeSingle();
      if(error)throw error;
      if(data){
        const remoteSerialized=JSON.stringify(data.data);
        if(meaningfullyChanged()&&JSON.stringify(state)!==remoteSerialized){
          // Do not silently erase local changes from a prior version of the app.
          localStorage.setItem(KEY+'-precloud',JSON.stringify(state));
          toast('Os dados locais antigos foram preservados em Conta e backup. Dados da nuvem carregados.');
        }
        applyCloud(data);
      }else{
        remoteReady=true;cloudRevision=null;pendingRemote=true;
        await syncNow();
      }
      realtimeChannel=cloud.channel('bia-change-'+user.id)
        .on('postgres_changes',{event:'*',schema:'public',table:'bia_production_state',filter:'user_id=eq.'+user.id},payload=>{
          const row=payload.new;
          if(!row||!remoteReady)return;
          if(Number(row.revision)<=Number(cloudRevision||0))return;
          if(pendingRemote||syncing){cloudConflict=true;updateStatus();toast('Alterações simultâneas detectadas. Abra Conta e backup.');return;}
          applyCloud(row);
        }).subscribe();
      render();updateStatus();
      migrateLocalPdfs().catch(e=>console.warn('PDF migration:',e));
    }catch(e){console.error(e);remoteReady=false;toast('Não foi possível acessar a nuvem: '+String(e.message||e));updateStatus();}
  }
  async function resolveConflict(){
    if(!cloudUser)return;
    const {data,error}=await cloud.from('bia_production_state').select('data,revision').eq('user_id',cloudUser.id).maybeSingle();
    if(error){toast('Erro ao consultar nuvem: '+error.message);return;}
    if(!data){cloudRevision=null;cloudConflict=false;remoteReady=true;pendingRemote=true;scheduleSync();return;}
    // Preserve local state in a separate recoverable copy before any resolution.
    localStorage.setItem(KEY+'-precloud',JSON.stringify(state));
    const keepLocal=confirm('Conflito de edição!\n\nOK: Enviar os dados DESTE APARELHO e substituir a versão da nuvem.\n\nCancelar: Usar os dados da nuvem (uma cópia dos dados locais ficará em Conta e backup).');
    if(keepLocal){cloudRevision=Number(data.revision);cloudConflict=false;remoteReady=true;pendingRemote=true;await syncNow(true);render();}
    else{applyCloud(data);toast('Versão da nuvem carregada. Cópia local preservada.');}
  }
  function openAuthModal(mode='sign-in'){
    if(!cloud){toast('Conexão com a nuvem indisponível. Verifique sua internet.');return;}
    const signup=mode==='sign-up';
    showModal(signup?'Criar conta da produção':'Entrar na produção',`<p class="muted">Use sempre o <strong>mesmo e-mail e senha</strong> em todos os computadores, tablets e celulares.</p><div class="fields"><label class="field full">E-mail<input type="email" name="email" autocomplete="email" required></label><label class="field full">Senha<input type="password" name="password" minlength="6" autocomplete="${signup?'new-password':'current-password'}" required></label></div><p class="small muted">${signup?'Já tem conta?':'Primeiro acesso?'} <button class="btn soft tiny" type="button" data-action="${signup?'auth-login':'auth-signup'}">${signup?'Fazer login':'Criar conta'}</button></p>`,async f=>{
      const email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||'');
      if(!email||password.length<6){toast('Informe e-mail e senha de pelo menos seis caracteres.');return false;}
      const {data,error}=signup?await cloud.auth.signUp({email,password}):await cloud.auth.signInWithPassword({email,password});
      if(error){toast('Falha no acesso: '+error.message);return false;}
      if(data?.session?.user){await connectCloud(data.session.user);toast('Conta conectada.');}
      else toast('Confira seu e-mail para confirmar o cadastro e depois faça login.');
      return true;
    },signup?'Criar conta':'Entrar');
  }
  async function signOut(){
    if(!cloud)return;
    if(pendingRemote&&!confirm('Ainda há alterações aguardando sincronização. Sair assim mesmo?'))return;
    localStorage.setItem(KEY+'-precloud',JSON.stringify(state));
    if(realtimeChannel){await cloud.removeChannel(realtimeChannel);realtimeChannel=null;}
    await cloud.auth.signOut();cloudUser=null;cloudRevision=null;remoteReady=false;pendingRemote=false;cloudConflict=false;
    state=defaultState();localStorage.removeItem(KEY);activeId=null;view='inicio';render();
  }
  async function initCloud(){
    if(!window.supabase?.createClient){updateStatus();return;}
    cloud=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await cloud.auth.getSession();
    if(error)console.warn('Auth',error);
    if(data?.session?.user)await connectCloud(data.session.user);
    cloud.auth.onAuthStateChange((_event,session)=>{
      if(session?.user&&!cloudUser) setTimeout(()=>connectCloud(session.user),0);
      if(!session?.user&&cloudUser) setTimeout(()=>{cloudUser=null;remoteReady=false;updateStatus();},0);
    });
    updateStatus();
  }
  window.addEventListener('online',()=>{updateStatus();if(cloudUser&&pendingRemote&&!cloudConflict)scheduleSync();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cloudUser&&!pendingRemote&&!cloudConflict)pullCloud().catch(console.warn);});

  const save = () => {
    ensureState();
    try {localStorage.setItem(KEY,JSON.stringify(state));pendingRemote=true;scheduleSync();return true;}
    catch(e){toast('Armazenamento cheio. Exporte seu backup.');return false;}
  };
  const current = () => state.events.find(e=>e.id===activeId) || null;
  const ordered = () => [...state.events].sort((a,b)=>a.date.localeCompare(b.date));
  const tasksOf = e => {e.tasks ||= initialTasks();return e.tasks;};
  const timelineOf = e => {e.schedule ||= initialSchedule();return e.schedule;};
  const contactsOf = e => {e.contacts ||= [];return e.contacts;};
  const pdfsOf = e => {e.pdfIds ||= [];return e.pdfIds;};
  const progress = e => {const a=tasksOf(e);return {done:a.filter(t=>t.done).length,total:a.length,percent:a.length?Math.round(100*a.filter(t=>t.done).length/a.length):100};};
  const toast = msg => {const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3800);};
  const empty = (title,description,action='',label='') => `<div class="empty"><div class="big">✦</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${action?`<button class="btn primary" data-action="${esc(action)}">${esc(label)}</button>`:''}</div>`;
  const button = (label,action,kind='soft',extra='') => `<button class="btn ${kind}" data-action="${esc(action)}" ${extra}>${esc(label)}</button>`;
  const contactCard = (p,kind='global',id='') => {const url=waUrl(p.phone);return `<div class="contact-item"><span class="contact-avatar">♙</span><div class="contact-main"><strong>${esc(p.name||p.role||'Contato')}</strong><span class="muted">${esc(p.role||'')} ${p.phone?'• '+esc(p.phone):'• Número não cadastrado'}</span></div><div class="inline-actions">${url?`<a class="btn wa tiny" href="${safeHref(url)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`:''}${kind==='global'?button('Editar','edit-global-'+id,'tiny'):(kind==='event'?button('Editar','edit-contact-'+id,'tiny'):'')}${kind==='event'?button('×','del-contact-'+id,'danger tiny'):''}</div></div>`};
  const eventCard=e=>`<button class="event-card" data-action="open-event-${esc(e.id)}"><span class="date-pill">${toDate(e.date).getDate()}<span>${fmtDate(e.date,{month:'short'}).replace('.','').toUpperCase()}</span></span><span class="event-text"><strong>Show — Bia Barros</strong><span class="event-city">${esc(e.city||'Cidade não informada')}${e.state?', '+esc(e.state):''}</span><span class="event-venue">${esc(e.venue||'Local a confirmar')} • ${esc(e.showTime||'Horário a confirmar')}</span></span><span class="event-arrow">›</span></button>`;
  function nav(to){view=to; render(); window.scrollTo({top:0,behavior:'instant'});}
  function render(){
    ensureState();
    renderNavigation();
    const titles={inicio:'Visão geral',agenda:'Agenda de shows',evento:'Detalhes do show',checklist:'Checklist por evento',cronograma:'Cronograma da equipe',riders:'Riders técnicos',contatos:'Contatos',anotacoes:'Anotações importantes',personalizar:'Personalização',ajustes:'Conta e backup'};
    const chosenTitle=state.settings.pages.find(p=>p.id===view)?.label;
    $('#page-title').textContent=view==='inicio' && (!chosenTitle || chosenTitle==='Início') ? 'Visão geral' : chosenTitle||titles[view]||'Produção';
    $$('#side-nav [data-nav],.bottom-nav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===(view==='evento'?'agenda':view)));
    $('#top-add').textContent='＋ Novo show';
    $('#content').innerHTML=({inicio:home,agenda:agenda,evento:eventDetails,checklist:checklists,cronograma:cronogramas,riders:riders,contatos:contatos,anotacoes:anotacoes,personalizar:personalizar,ajustes:ajustes}[view]||home)();
    if(view==='riders') queueMicrotask(updatePdfList);
  }
  function home(){const es=ordered(), upcoming=es.filter(e=>e.date>=today());const allPending=es.reduce((sum,e)=>sum+tasksOf(e).filter(t=>!t.done&&shifted(e.date,t.offset)<=today()).length,0);
    return `<section class="hero"><img class="hero-logo" src="./logo.png" alt="Logo Bia Barros, sem fundo"/><div><div class="eyebrow">PRODUÇÃO DE ESTRADA</div><h2>Tudo pronto para o próximo show.</h2><p>Agenda, cidade, contatos, cronograma, rider e conferências em um só lugar.</p><div class="inline-actions">${button('＋ Cadastrar show','new-show','primary')}${button('Ver agenda','go-agenda')}</div></div></section>
    <section class="stats"><div class="stat"><strong>${es.length}</strong><span>Shows cadastrados</span></div><div class="stat"><strong>${upcoming.length}</strong><span>Próximos shows</span></div><div class="stat"><strong>${allPending}</strong><span>Pendências no prazo</span></div></section>
    <div class="inline-actions feature-tools">${button('✎ Anotações importantes','go-anotacoes','soft')}${button('⚙ Personalizar aplicativo','go-personalizar','soft')}${button('☁ Conta e sincronização','go-ajustes','soft')}</div>
    <div class="two-col"><section><div class="section-head"><h2>Próximos shows</h2>${button('Ver todos','go-agenda','tiny')}</div><div class="event-list">${upcoming.length?upcoming.slice(0,5).map(eventCard).join(''):empty('Agenda vazia','Cadastre a próxima apresentação para começar.','new-show','Cadastrar primeiro show')}</div></section>
    <section><div class="section-head"><h2>Contatos principais</h2>${button('Editar','go-contatos','tiny')}</div><div class="card">${contactCard(state.contacts.mimi,'global','mimi')}${contactCard(state.contacts.ju,'global','ju')}<p class="section-caption" style="margin-top:14px">O WhatsApp abre no número cadastrado. Os contatos da locadora e do cerimonial ficam dentro de cada evento.</p></div></section></div>`;
  }
  function calendar(){const first=new Date(month.getFullYear(),month.getMonth(),1,12);const start=(first.getDay()+0)%7;const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();const key=iso(first);const mo=first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    let grid=['D','S','T','Q','Q','S','S'].map(d=>`<span class="cal-label">${d}</span>`).join('');
    for(let i=0;i<Math.ceil((start+count)/7)*7;i++){const d=i-start+1; if(d<1||d>count){grid+='<span class="cal-day other"></span>';continue;}
      const date=iso(new Date(month.getFullYear(),month.getMonth(),d,12));const n=state.events.filter(e=>e.date===date).length;grid+=`<button class="cal-day ${n?'has':''} ${date===today()?'today':''} ${date===chosenDate?'selected':''}" data-action="cal-${date}">${d}${n?`<span>${n} show${n>1?'s':''}</span>`:''}</button>`;
    }
    return `<div class="card"><div class="calendar-heading"><button class="icon-btn" data-action="month-prev" aria-label="Mês anterior">‹</button><strong>${esc(mo.charAt(0).toUpperCase()+mo.slice(1))}</strong><button class="icon-btn" data-action="month-next" aria-label="Mês seguinte">›</button></div><div class="calendar-grid">${grid}</div></div>`;
  }
  function agenda(){const es=ordered().filter(e=>!chosenDate||e.date===chosenDate);return `<div class="compact-top">${button('＋ Novo show','new-show','primary')}${chosenDate?button('Mostrar todas as datas','clear-date','flat'):''}</div><div class="two-col"><section>${calendar()}</section><section><div class="section-head"><h2>${chosenDate?'Shows em '+shortDate(chosenDate):'Todos os shows'}</h2><span class="muted">${es.length} evento(s)</span></div><div class="event-list">${es.length?es.map(eventCard).join(''):empty('Nenhum show encontrado','Escolha outra data ou cadastre um show.','new-show','Novo show')}</div></section></div>`;}
  const miniDetail = (title,val) => `<div class="detail-box"><span class="small">${esc(title)}</span><strong>${esc(val||'A confirmar')}</strong></div>`;
  function defaultDetailFields(){
    if(Array.isArray(state.settings.detailTemplate))return state.settings.detailTemplate.map(f=>({...f}));
    return [...showFields().filter(f=>!['date','city'].includes(f.id)&&f.visible!==false).map(f=>({id:f.id,key:f.id,label:f.label,type:f.type})),...state.settings.customFields.map(f=>({...f}))];
  }
  function detailFields(e){return Array.isArray(e.detailFields)?e.detailFields:defaultDetailFields();}
  function saveTemplate(fields){
    // Preserve existing event layouts before changing defaults.
    state.events.forEach(e=>{if(!Array.isArray(e.detailFields))e.detailFields=defaultDetailFields();});
    state.settings.detailTemplate=fields;return save();
  }
  function templateForm(index=null){const fields=defaultDetailFields();const f=index===null?{id:uid(),label:'',type:'text'}:fields[index];if(!f)return;
    showModal(index===null?'Adicionar campo padrão':'Editar campo padrão',field('Nome do campo','label',f.label,'text','required'),form=>{const label=String(form.get('label')||'').trim();if(!label)return false;f.label=label;if(index===null)fields.push(f);return saveTemplate(fields);});
  }
  function detailValue(e,f){return f.key?e[f.key]:(e.extra||{})[f.id];}
  function updateDetail(e,fields,updates={}){
    const previous={...e};Object.assign(e,updates,{detailFields:fields});
    if(!save()){Object.keys(e).forEach(k=>delete e[k]);Object.assign(e,previous);return false;}return true;
  }
  function detailForm(e,index=null){
    if(!e)return;const fields=detailFields(e).map(f=>({...f}));const f=index===null?{id:uid(),label:'',type:'text'}:fields[index];if(!f)return;
    showModal(index===null?'Adicionar campo':'Editar campo',`<div class="fields">${field('Nome do campo','label',f.label,'text','required')}<label class="field full">Informação<textarea name="value" rows="3" placeholder="A confirmar">${esc(detailValue(e,f)||'')}</textarea></label></div>`,form=>{
      if(current()!==e){toast('O show foi atualizado em outro aparelho. Abra novamente.');return false;}
      const label=String(form.get('label')||'').trim();if(!label){toast('Informe o nome do campo.');return false;}const value=String(form.get('value')||'').trim();f.label=label;if(index===null)fields.push(f);
      const updates=f.key?{[f.key]:value}:{extra:{...(e.extra||{}),[f.id]:value}};
      if(!updateDetail(e,fields,updates))return false;toast('Informação salva.');
    });
  }
  function editDetailHeader(e){if(!e)return;showModal('Editar identificação do show',`<div class="fields">${field('Cidade','city',e.city,'text','required')}${field('Data','date',e.date,'date','required')}${field('Estado','state',e.state||'')}</div>`,form=>{if(current()!==e)return false;const city=String(form.get('city')||'').trim(),date=String(form.get('date')||'');if(!city||!date)return false;if(!updateDetail(e,detailFields(e),{city,date,state:String(form.get('state')||'').trim()}))return false;chosenDate=date;month=new Date(date+'T12:00:00');});}
  function eventDetails(){const e=current();if(!e) return empty('Show não encontrado','Abra um show na agenda.','go-agenda','Abrir agenda');const p=progress(e);return `<div class="compact-top">${button('‹ Agenda','go-agenda','flat')}<div class="inline-actions">${button('Editar cidade / data','edit-show','soft')}${button('Excluir show','delete-show','danger tiny')}</div></div><section class="card"><div class="compact-top"><div><span class="eyebrow">SHOW DA BIA BARROS</span><h2 style="font-size:28px;margin:2px 0;color:var(--orange)">${esc(e.city||'Cidade a confirmar')}${e.state?' — '+esc(e.state):''}</h2><p class="muted">${fmtDate(e.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div><span class="date-pill">${toDate(e.date).getDate()}<span>${fmtDate(e.date,{month:'short'}).toUpperCase()}</span></span></div><div class="section-head"><h3>Informações do show</h3>${button('＋ Adicionar campo','detail-add','primary')}</div><p class="muted small">Toque em qualquer informação para editar. Use as setas para reorganizar.</p><div class="detail-grid">${detailFields(e).map((f,i)=>`<div class="detail-box editable-detail"><button class="detail-value-button" data-action="detail-edit-${i}"><span class="small">${esc(f.label)}</span><strong>${esc(detailValue(e,f)||'A confirmar')}</strong></button><div class="inline-actions">${button('Editar','detail-edit-'+i,'tiny')}${button('↑','detail-up-'+i,'tiny',i===0?'disabled':'')}${button('↓','detail-down-'+i,'tiny',i===detailFields(e).length-1?'disabled':'')}${button('Excluir','detail-delete-'+i,'danger tiny')}</div></div>`).join('')}</div></section>
   <div class="two-col" style="margin-top:16px"><section class="card"><div class="section-head"><h2>Contatos deste show</h2>${button('＋ Contato','new-contact','tiny')}</div>${contactsOf(e).length?contactsOf(e).map(c=>contactCard(c,'event',c.id)).join(''):'<p class="muted">Adicione a locadora, cerimonial e responsável pelo evento.</p>'}</section><section class="card"><h2>Checklist</h2><div class="compact-top"><span>${p.done} de ${p.total} concluídos</span><strong>${p.percent}%</strong></div><div class="progress"><i style="width:${p.percent}%"></i></div><p class="muted small" style="margin:12px 0">Tarefas de 7 dias, 3 dias, véspera e dia do show.</p>${button('Abrir checklist','event-checklist','primary')}</section></div>
   <div class="three-col" style="margin-top:16px"><section class="card"><h3>◷ Cronograma</h3><p class="muted">${timelineOf(e).length} horários da equipe</p>${button('Editar / compartilhar','event-schedule')}</section><section class="card"><h3>▤ Rider técnico</h3><p class="muted">${pdfsOf(e).length} PDF(s) do evento</p>${button('Ver / adicionar PDFs','event-pdfs')}</section><section class="card"><h3>▦ Lembretes</h3><p class="muted">Exporte alertas para o Calendário do iPhone.</p>${button('Exportar calendário','export-ics')}</section></div>`;}
  const groupLabels={'-7':'7 dias antes','-3':'3 dias antes','-1':'1 dia antes','0':'Dia do show'};
  function picker(which){const list=ordered();if(!list.length) return empty('Nenhum show cadastrado','Crie um show para organizar sua produção.','new-show','Cadastrar show');const e=current()||list.find(x=>x.date>=today())||list.at(-1);activeId=e.id;return `<div class="picker-row"><label class="field">Selecionar show<select id="event-picker" aria-label="Selecionar show">${list.map(s=>`<option value="${esc(s.id)}" ${s.id===e.id?'selected':''}>${shortDate(s.date)} — ${esc(s.city)}${s.state?' / '+esc(s.state):''}</option>`).join('')}</select></label>${button('Detalhes do show','to-detail','soft')}</div>`;}
  function checklists(){const h=picker('checklist'), e=current();if(!e) return h;const tasks=tasksOf(e);const offsets=[-7,-3,-1,0,...new Set(tasks.map(t=>+t.offset).filter(n=>![-7,-3,-1,0].includes(n)))];const p=progress(e);
   return `${h}<div class="card"><div class="compact-top"><div><h2 style="margin:0">Checklist • ${esc(e.city)} — ${shortDate(e.date)}</h2><p class="muted small">Marque cada item após confirmar com os responsáveis.</p></div><div class="inline-actions">${button('＋ Item','new-task','soft')}${button('Lembretes do calendário','export-ics','primary')}</div></div><div class="progress"><i style="width:${p.percent}%"></i></div><p class="small muted">${p.done} de ${p.total} concluídos • ${p.percent}%</p>${offsets.map(offset=>{const a=tasks.filter(t=>+t.offset===offset);if(!a.length) return '';return `<section class="group"><div class="group-head"><span>${esc(groupLabels[offset]||`${Math.abs(offset)} dias ${offset>0?'depois':'antes'}`)} • ${shortDate(shifted(e.date,offset))}</span><span>${a.filter(t=>t.done).length} de ${a.length}</span></div>${a.map(t=>`<div class="task ${t.done?'done':''}"><label><input type="checkbox" data-task="${esc(t.id)}" ${t.done?'checked':''}><span>${esc(t.title)}</span></label><div class="task-controls"><button class="icon-btn" data-action="edit-task-${esc(t.id)}" title="Editar item" aria-label="Editar item">✎</button><button class="icon-btn" data-action="delete-task-${esc(t.id)}" title="Excluir item" aria-label="Excluir item">×</button></div></div>`).join('')}</section>`}).join('')}</div>`;
  }
  function scheduleText(e){return `*CRONOGRAMA — BIA BARROS*\n📍 ${e.city||'Cidade a confirmar'}${e.state?' / '+e.state:''}\n📅 ${shortDate(e.date)}\n🏟️ ${e.venue||'Local a confirmar'}\n📌 ${e.address||'Endereço a confirmar'}\n\n${timelineOf(e).slice().sort((a,b)=>a.time.localeCompare(b.time)).map(t=>`${t.time} — ${t.description}`).join('\n')}\n\nProdução Bia Barros`;}
  function cronogramas(){const h=picker('cronograma'),e=current();if(!e) return h;const rows=timelineOf(e).slice().sort((a,b)=>a.time.localeCompare(b.time));return `${h}<section class="card"><div class="compact-top"><div><h2 style="margin:0">Cronograma da equipe</h2><p class="muted small">${esc(e.city)} • ${shortDate(e.date)} — horários podem ser alterados.</p></div><div class="inline-actions">${button('＋ Horário','new-slot','soft')}${button('Enviar pelo WhatsApp','share-schedule','wa')}</div></div>${rows.length?rows.map(s=>`<div class="timeline-row"><span class="timeline-time">${esc(s.time)}</span><span class="timeline-desc">${esc(s.description)}</span><div class="inline-actions">${button('Editar','edit-slot-'+s.id,'tiny')}${button('×','delete-slot-'+s.id,'danger tiny')}</div></div>`).join(''):empty('Nenhum horário','Adicione os horários do show.','new-slot','Adicionar horário')}<p class="section-caption" style="margin-top:15px">O botão do WhatsApp abre a mensagem pronta. Escolha o grupo da equipe para enviar.</p></section>`;}
  function riders(){const h=picker('riders'),e=current();if(!e) return h;const ids=pdfsOf(e);return `${h}<div class="banner">Os PDFs são enviados para sua área privada na nuvem quando você está conectado. Os arquivos antigos deste aparelho são enviados ao entrar na conta.</div><section class="card"><div class="compact-top"><div><h2 style="margin:0">Riders do evento</h2><p class="muted small">${esc(e.city)} • ${shortDate(e.date)}</p></div>${button('＋ Adicionar PDF','new-pdf','primary')}</div><div id="pdf-list">${ids.length?'<p class="muted">Carregando PDFs…</p>':empty('Nenhum rider salvo','Adicione o rider de som, iluminação, mapa de palco ou input list.','new-pdf','Adicionar PDF')}</div></section>`;}
  function contatos(){const es=ordered();return `<div class="two-col"><section class="card"><h2>Contatos principais</h2><p class="muted">Sempre disponíveis na tela inicial.</p>${contactCard(state.contacts.mimi,'global','mimi')}${contactCard(state.contacts.ju,'global','ju')}</section><section class="card"><h2>Contatos dos shows</h2>${es.length?es.map(e=>`<div class="section-head" style="margin-bottom:5px"><div><strong>${esc(e.city)} — ${shortDate(e.date)}</strong><p class="muted small">${esc(e.venue)}</p></div>${button('Abrir','open-event-'+e.id,'tiny')}</div>${contactsOf(e).length?contactsOf(e).map(c=>contactCard(c,'readonly')).join(''):'<p class="muted small">Sem contatos cadastrados.</p>'}`).join(''):empty('Sem shows','Cadastre um evento para incluir locadora, cerimonial e responsável.','new-show','Novo show')}</section></div>`;}
  function ajustes(){return `<section class="card"><h2>Conta e sincronização</h2><p>Entre com a <strong>mesma conta</strong> no computador, tablet ou celular para sincronizar a produção. As mudanças são atualizadas nos outros dispositivos conectados.</p><div class="sync-panel"><span id="sync-status">${esc(statusText())}</span><div class="inline-actions">${cloudUser?`${button('Sincronizar agora','sync-now','primary')}${button('Sair da conta','sign-out','soft')}`:`${button('Entrar ou criar conta','sign-in','primary')}`}${cloudConflict?button('Resolver conflito','resolve-conflict','danger'):''}</div></div><p class="small muted">Sem internet, você pode continuar editando dados locais; a sincronização ocorre quando voltar a conexão. Evite alterações simultâneas até a sincronização terminar.</p></section><section class="card" style="margin-top:16px"><h2>Personalização</h2><p>Altere nomes, ordem e visibilidade das páginas, categorias de anotações e campos adicionais dos shows.</p>${button('Abrir personalização','go-personalizar','primary')}</section><section class="card" style="margin-top:16px"><h2>Backup dos dados</h2><p>Faça uma cópia de segurança antes de mudanças grandes ou de restaurar dados.</p><div class="inline-actions">${button('Exportar backup (.json)','export-backup','soft')}${button('Importar backup','import-backup','soft')}${localStorage.getItem(KEY+'-precloud')?button('Restaurar dados locais antigos','restore-precloud','soft'):''}</div></section><section class="card" style="margin-top:16px"><h2>Instalar no dispositivo</h2><p>No navegador, abra a versão publicada do sistema e use a opção <strong>Adicionar à tela inicial</strong>. No iPhone ou iPad, essa opção fica no menu Compartilhar do Safari.</p></section>`;}
  function showModal(title, body, onSave, saveText='Salvar'){const dlg=$('#modal');$('#modal-title').textContent=title;$('#modal-body').innerHTML=body;$('#modal-actions').innerHTML=`<button type="button" class="btn flat" id="cancel-modal">Cancelar</button><button type="submit" class="btn primary">${esc(saveText)}</button>`;$('#modal-form').onsubmit=async ev=>{ev.preventDefault(); try{const ok=await onSave(new FormData(ev.currentTarget));if(ok===false)return;dlg.close();render();}catch(e){toast(e.message||'Não foi possível salvar.');}};dlg.showModal();}
  const field=(label,name,value='',type='text',extra='')=>`<label class="field">${esc(label)}<input type="${type}" name="${esc(name)}" value="${esc(value)}" ${extra}></label>`;
  function showForm(){showModal('Novo show',`<div class="fields">${field('Data do show','date',chosenDate||today(),'date','required')}${field('Cidade','city','','text','required')}</div><p class="muted">Preencha as demais informações depois, pela agenda.</p>`,form=>{const city=String(form.get('city')||'').trim(),date=String(form.get('date')||'');if(!city||!date)return false;const e={id:uid(),city,date,extra:{},detailFields:defaultDetailFields(),tasks:initialTasks(),schedule:initialSchedule(),contacts:[],pdfIds:[]};state.events.push(e);if(!save()){state.events.pop();return false;}chosenDate=date;month=new Date(date+'T12:00:00');activeId=e.id;view='agenda';toast('Show cadastrado.');});}
    function contactForm(item=null, globalKey=null){const e=current();const isGlobal=!!globalKey;const obj=item||{};showModal(isGlobal?'Contato principal':item?'Editar contato':'Novo contato',`<div class="fields">${field('Nome','name',obj.name||'','text','required')}${field('Função / empresa','role',obj.role||(isGlobal?(globalKey==='mimi'?'Empresário':'Produção'):'Locadora / Cerimonial'))}${field('WhatsApp com DDD','phone',obj.phone||'','tel','placeholder="(47) 99999-9999"')}</div>`,f=>{const p=Object.fromEntries(f);p.name=p.name.trim();if(!p.name)return false;if(isGlobal){state.contacts[globalKey]=p;}else if(item){Object.assign(item,p);}else{contactsOf(e).push({...p,id:uid()});}save();});}
  function taskForm(task=null){const e=current();if(!e)return;showModal(task?'Editar tarefa':'Nova tarefa',`<div class="fields"><label class="field full">Tarefa<textarea name="title" required>${esc(task?.title||'')}</textarea></label><label class="field full">Prazo<select name="offset">${[[-7,'7 dias antes'],[-3,'3 dias antes'],[-1,'1 dia antes'],[0,'Dia do show']].map(([v,l])=>`<option value="${v}" ${Number(task?.offset??-7)===v?'selected':''}>${l}</option>`).join('')}</select></label></div>`,f=>{const title=String(f.get('title')||'').trim();if(!title)return false;const offset=Number(f.get('offset'));if(task)Object.assign(task,{title,offset});else tasksOf(e).push({id:uid(),title,offset,done:false});save();});}
  function slotForm(slot=null){const e=current();if(!e)return;showModal(slot?'Editar horário':'Adicionar horário',`<div class="fields">${field('Horário','time',slot?.time||'12:00','time','required')}<label class="field full">Atividade<textarea name="description" required>${esc(slot?.description||'')}</textarea></label></div>`,f=>{const time=f.get('time'),description=String(f.get('description')||'').trim();if(!time||!description)return false;if(slot)Object.assign(slot,{time,description});else timelineOf(e).push({id:uid(),time,description});save();});}
  function openPDFForm(){const e=current();if(!e)return;showModal('Adicionar rider em PDF','<p class="muted">Selecione um PDF armazenado no seu aparelho. Tamanho recomendado: até 20 MB.</p><label class="field">Arquivo PDF<input type="file" name="file" accept="application/pdf,.pdf" required /></label>',async f=>{const file=f.get('file');if(!file||!file.name)return false;if(!file.name.toLowerCase().endsWith('.pdf')&&file.type!=='application/pdf'){toast('Selecione um PDF válido.');return false;}if(file.size>20*1024*1024){toast('PDF acima de 20 MB. Escolha um arquivo menor.');return false;}const id=uid();await pdfPut({id,name:file.name,size:file.size,type:'application/pdf',blob:file});state.pdfMeta[id]={name:file.name,size:file.size,uploaded:false};pdfsOf(e).push(id);save();if(cloudUser)uploadCloudPdf(id,file).catch(console.warn);toast('PDF salvo. O envio à nuvem será feito quando possível.');});}
  function confirmAction(title, description, callback, destructive=true){showModal(title,`<p>${esc(description)}</p>`, async()=>{await callback();return true;},destructive?'Excluir':'Confirmar');}
  function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  function icsEscape(s){return String(s??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
  function icsDateTime(date, time='09:00'){return date.replaceAll('-','')+'T'+time.replace(':','')+'00';}
  function icsFor(e){const timing=[[-7,'Revisar rider e confirmar locadora'],[-3,'Reconfirmar estrutura e resolver pendências'],[-1,'Conferência final da produção'],[0,'Dia do show — checagem final']];const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bia Barros//Producao//PT-BR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Bia Barros - Lembretes'];timing.forEach(([offset,desc],i)=>{const d=shifted(e.date,offset), start=icsDateTime(d,'09:00'), end=icsDateTime(d,'09:15');lines.push('BEGIN:VEVENT',`UID:${e.id}-${i}@biabarros-producao`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=America/Sao_Paulo:${start}`,`DTEND;TZID=America/Sao_Paulo:${end}`,`SUMMARY:${icsEscape('Bia Barros: '+desc)}`,`DESCRIPTION:${icsEscape(e.city+' - '+shortDate(e.date)+' - '+desc)}`,'BEGIN:VALARM','TRIGGER:-PT0M','ACTION:DISPLAY',`DESCRIPTION:${icsEscape(desc)}`,'END:VALARM','END:VEVENT');});lines.push('END:VCALENDAR');return lines.join('\r\n')+'\r\n';}
  async function shareSchedule(){const e=current();if(!e)return;const message=scheduleText(e);const url=`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;window.open(url,'_blank','noopener,noreferrer');toast('Escolha o grupo ou contato no WhatsApp para enviar.');}
  function dbOpen(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(new Error('O navegador não permite salvar PDFs.'));return;}const r=indexedDB.open('bia-barros-pdfs-v1',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function pdfPut(obj){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(obj);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
  async function pdfGet(id){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly');const req=tx.objectStore('files').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();});}
  async function pdfDel(id){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
  async function pdfAll(){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly');const req=tx.objectStore('files').getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();});}
  const formatBytes=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB';
  const pdfCloudPath=id=>`${cloudUser.id}/${id}.pdf`;
  async function uploadCloudPdf(id,blob){
    if(!cloudUser||!cloud||!blob)return false;
    try{
      const {error}=await cloud.storage.from('bia-riders').upload(pdfCloudPath(id),blob,{contentType:'application/pdf',upsert:true});
      if(error)throw error;
      if(state.pdfMeta[id]&&!state.pdfMeta[id].uploaded){state.pdfMeta[id].uploaded=true;save();}
      return true;
    }catch(e){console.warn('Falha no upload do PDF',e);return false;}
  }
  async function migrateLocalPdfs(){
    if(!cloudUser)return;
    const allIds=new Set(state.events.flatMap(e=>pdfsOf(e)));
    for(const id of allIds){
      const f=await pdfGet(id).catch(()=>null);
      if(!f)continue;
      if(!state.pdfMeta[id]){state.pdfMeta[id]={name:f.name,size:f.size,uploaded:false};save();}
      if(!state.pdfMeta[id].uploaded)await uploadCloudPdf(id,f.blob);
    }
    if(view==='riders')updatePdfList();
  }
  async function cloudPdfGet(id){
    if(!cloudUser)return null;
    const {data,error}=await cloud.storage.from('bia-riders').download(pdfCloudPath(id));
    if(error)throw error;
    const metadata=state.pdfMeta[id]||{};
    const record={id,name:metadata.name||'Rider.pdf',size:metadata.size||data.size,type:'application/pdf',blob:data};
    pdfPut(record).catch(console.warn);return record;
  }
  async function cloudPdfDel(id){
    if(!cloudUser)return;
    const {error}=await cloud.storage.from('bia-riders').remove([pdfCloudPath(id)]);
    if(error)console.warn('Remoção nuvem PDF:',error);
  }
  async function updatePdfList(){
    if(view!=='riders'||!current()||!$('#pdf-list'))return;
    const el=$('#pdf-list'),ids=[...pdfsOf(current())];if(!ids.length)return;
    try{
      const files=await Promise.all(ids.map(id=>pdfGet(id).catch(()=>null)));
      if(!$('#pdf-list')||view!=='riders')return;
      el.innerHTML=ids.map((id,i)=>{
        const f=files[i]||state.pdfMeta[id];
        return `<div class="pdf-item"><span class="pdf-icon">PDF</span><div class="pdf-meta"><strong>${esc(f?.name||'Documento antigo')}</strong><small>${f?.size?formatBytes(f.size):'PDF'} ${state.pdfMeta[id]?.uploaded?'• Na nuvem':(files[i]?'• Neste aparelho':'• Não disponível')}</small></div><div class="inline-actions">${button('Abrir','open-pdf-'+id,'soft tiny')}${button('Excluir','delete-pdf-'+id,'danger tiny')}</div></div>`;
      }).join('');
    }catch(e){el.innerHTML='<p class="muted">Erro ao carregar os PDFs.</p>';}
  }
  const blobToBase64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  async function exportBackup(){toast('Preparando backup dos shows e PDFs…');const files=await pdfAll();const withData=[];for(const f of files)withData.push({id:f.id,name:f.name,type:f.type,size:f.size,data:await blobToBase64(f.blob)});const data=JSON.stringify({app:'Bia Barros Produção',exportedAt:new Date().toISOString(),state,files:withData});downloadBlob(new Blob([data],{type:'application/json'}),`bia-barros-backup-${today()}.json`);toast('Backup exportado. Guarde o arquivo em local seguro.');}
  function importBackup(){const d=document.createElement('input');d.type='file';d.accept='.json,application/json';d.onchange=async()=>{const file=d.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data.state||!Array.isArray(data.state.events)||!Array.isArray(data.files))throw Error('Arquivo não é um backup válido.');if(!confirm('Importar este backup vai substituir os shows e contatos salvos neste aparelho. Continuar?'))return;for(const old of await pdfAll())await pdfDel(old.id);for(const f of data.files){const b=atob(f.data);const bytes=new Uint8Array(b.length);for(let i=0;i<b.length;i++)bytes[i]=b.charCodeAt(i);await pdfPut({id:f.id,name:f.name,type:'application/pdf',size:bytes.length,blob:new Blob([bytes],{type:'application/pdf'})});}state=data.state;ensureState();save();migrateLocalPdfs().catch(console.warn);activeId=null;view='inicio';render();toast('Backup importado.');}catch(e){toast('Não foi possível importar: '+e.message);}};d.click();}
  // Anotações categorizadas e preferências de navegação
  let notesFilter='Todas', notesQuery='';
  function renderNavigation(){
    const pages=state.settings.pages.filter(p=>p.visible!==false);
    const iconFor=id=>NAV_DEFAULT.find(n=>n[0]===id)?.[2]||'◻';
    $('#side-nav').innerHTML=pages.map(p=>`<button class="nav-item" data-nav="${esc(p.id)}"><span>${iconFor(p.id)}</span> ${esc(p.label)}</button>`).join('');
    $('.bottom-nav').innerHTML=pages.filter(p=>['inicio','agenda','checklist','cronograma','riders','contatos'].includes(p.id)).map(p=>`<button data-nav="${esc(p.id)}"><span>${iconFor(p.id)}</span>${esc(p.id==='checklist'?'Lista':p.id==='riders'?'Rider':p.id==='agenda'?'Agenda':p.id==='inicio'?'Início':p.label)}</button>`).join('');
    document.documentElement.style.setProperty('--orange',/^#[a-f0-9]{6}$/i.test(state.settings.accent)?state.settings.accent:'#f58b29');
    updateStatus();
  }
  function anotacoes(){
    const cats=['Todas',...state.settings.categories];
    const notes=state.notes.filter(n=>(notesFilter==='Todas'||n.category===notesFilter)&&(!notesQuery||[n.title,n.body,n.category,...(n.items||[]).map(x=>x.text)].join(' ').toLocaleLowerCase('pt-BR').includes(notesQuery.toLocaleLowerCase('pt-BR'))));
    return `<div class="compact-top"><div><p class="muted">Crie listas como Camarim, Palco e Transporte. Confira cada item ao chegar ao local.</p></div><div class="inline-actions">${button('＋ Nova lista','new-note','primary')}${button('Gerenciar categorias','go-personalizar','soft')}</div></div>
      <section class="card"><div class="notes-tools"><label class="field">Categoria<select id="notes-category">${cats.map(c=>`<option ${c===notesFilter?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="field">Buscar<input id="notes-search" type="search" placeholder="Buscar lista ou item" value="${esc(notesQuery)}"></label></div></section>
      <div class="note-grid note-checklist">${notes.length?notes.map(n=>{const items=Array.isArray(n.items)?n.items:[];const done=items.filter(x=>x.done).length;return `<article class="card note-card"><div class="note-check-row"><h3>${esc(n.title||'Sem título')}</h3><span class="chip">${esc(n.category||'Geral')}</span></div>${n.body?`<p class="note-body">${esc(n.body).replace(/\n/g,'<br>')}</p>`:''}<p class="small muted">${done} de ${items.length} conferidos</p><div class="note-items">${items.map(item=>`<div class="note-item ${item.done?'note-item-done':''}"><label class="note-item-label"><input type="checkbox" data-note-item-check="${esc(n.id)}" data-item-id="${esc(item.id)}" ${item.done?'checked':''}><span>${esc(item.text)}</span></label><div class="inline-actions">${button('Editar','edit-note-item-'+n.id+'-'+item.id,'tiny')}${button('×','delete-note-item-'+n.id+'-'+item.id,'danger tiny')}</div></div>`).join('')||'<p class="muted small">Nenhum item ainda. Adicione o que precisa conferir.</p>'}</div><div class="inline-actions">${button('＋ Adicionar item','add-note-item-'+n.id,'primary tiny')}${button('Editar lista','edit-note-'+n.id,'soft tiny')}${button('Excluir lista','delete-note-'+n.id,'danger tiny')}</div></article>`;}).join(''):empty('Nenhuma lista','Crie uma lista como Camarim e adicione os itens para conferir.','new-note','Criar lista')}</div>`;
  }
  function noteForm(note=null){
    const n=note||{};
    showModal(note?'Editar lista':'Nova lista de conferência',`<div class="fields">${field('Nome da lista (ex.: Camarim)','title',n.title||'','text','required')}<label class="field">Categoria<select name="category">${state.settings.categories.map(c=>`<option value="${esc(c)}" ${c===n.category?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="field full">Observações gerais (opcional)<textarea name="body" rows="3">${esc(n.body||'')}</textarea></label></div>`,f=>{
      const title=String(f.get('title')||'').trim(),body=String(f.get('body')||'').trim();if(!title)return false;
      const change={title,body,category:String(f.get('category')||'Geral'),updatedAt:new Date().toISOString()};
      if(note)Object.assign(note,change);else state.notes.push({id:uid(),items:[],...change});
      save();toast('Lista salva. Agora adicione os itens.');
    });
  }
  function noteItemForm(note,item=null){
    if(!note)return;
    showModal(item?'Editar item':'Adicionar item em '+note.title,field('O que precisa conferir?','text',item?.text||'','text','required'),f=>{
      const text=String(f.get('text')||'').trim();if(!text)return false;
      note.items ||= [];
      if(item)item.text=text;else note.items.push({id:uid(),text,done:false});
      note.updatedAt=new Date().toISOString();save();toast('Item salvo.');
    });
  }
  function personalizar(){
    const sections=state.settings.pages;
    return `<div class="compact-top"><p class="muted">Estas configurações fazem parte dos dados sincronizados da conta.</p>${button('Conta e backup','go-ajustes','soft')}</div>
    <section class="card"><div class="section-head"><h2>Páginas e menus</h2></div><p class="small muted">Renomeie, mova para cima ou para baixo e oculte páginas. "Conta e backup" continua acessível.</p>
      ${sections.map((p,i)=>`<div class="config-row"><div class="config-name"><strong>${esc(p.label)}</strong><span class="muted small">${esc(p.id)}</span></div><div class="inline-actions">${button('Renomear','rename-page-'+p.id,'tiny')}${button('↑','page-up-'+p.id,'tiny',i===0?'disabled':'')}${button('↓','page-down-'+p.id,'tiny',i===sections.length-1?'disabled':'')}${p.id!=='ajustes'?button(p.visible===false?'Mostrar':'Ocultar','toggle-page-'+p.id,'soft tiny'):''}</div></div>`).join('')}</section>
    <section class="card" style="margin-top:16px"><div class="compact-top"><h2>Categorias das anotações</h2>${button('＋ Categoria','new-category','primary')}</div>${state.settings.categories.map(c=>`<div class="config-row"><strong>${esc(c)}</strong><div class="inline-actions">${button('Renomear','rename-category-'+encodeURIComponent(c),'tiny')}${c!=='Geral'?button('Excluir','delete-category-'+encodeURIComponent(c),'danger tiny'):''}</div></div>`).join('')}</section>
    <section class="card" style="margin-top:16px"><div class="compact-top"><h2>Campos padrão da ficha do show</h2>${button('＋ Adicionar campo','template-add','primary')}</div><p class="muted small">Configure os quadrados da ficha dos próximos shows. Data e cidade são cadastradas separadamente. Fichas existentes permanecem intactas.</p><div class="detail-grid">${defaultDetailFields().map((f,i,a)=>`<div class="detail-box editable-detail"><button class="detail-value-button" data-action="template-edit-${i}"><span class="small">${esc(f.label)}</span><strong>A confirmar</strong></button><div class="inline-actions">${button('Editar','template-edit-'+i,'tiny')}${button('↑','template-up-'+i,'tiny',i===0?'disabled':'')}${button('↓','template-down-'+i,'tiny',i===a.length-1?'disabled':'')}${button('Excluir','template-delete-'+i,'danger tiny')}</div></div>`).join('')}</div></section>
    <section class="card" style="margin-top:16px"><h2>Cor de destaque</h2><div class="inline-actions">${[['#f58b29','Âmbar'],['#eab0c9','Rosa claro'],['#54a5e4','Azul'],['#71c7a0','Verde']].map(([color,label])=>button(label,'theme-'+color,'tiny')).join('')}</div></section>`;
  }
  function categoryForm(oldName=null){
    showModal(oldName?'Renomear categoria':'Criar categoria',`${field('Nome da categoria','category',oldName||'','text','required')}`,f=>{
      const name=String(f.get('category')||'').trim().slice(0,60);if(!name)return false;
      if(state.settings.categories.some(x=>x.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')&&x!==oldName)){toast('Essa categoria já existe.');return false;}
      if(oldName){state.settings.categories=state.settings.categories.map(x=>x===oldName?name:x);state.notes.forEach(n=>{if(n.category===oldName)n.category=name;});if(notesFilter===oldName)notesFilter=name;}
      else state.settings.categories.push(name);
      save();
    });
  }
  function fieldForm(item=null){const existing=item||{};showModal(item?'Editar campo':'Novo campo',`<div class="fields">${field('Nome do campo','label',existing.label||'','text','required')}<label class="field">Tipo<select name="type">${[['text','Texto'],['date','Data'],['time','Horário'],['number','Número']].map(([k,l])=>`<option value="${k}" ${existing.type===k?'selected':''}>${l}</option>`).join('')}</select></label></div>`,f=>{
    const label=String(f.get('label')||'').trim().slice(0,70),type=String(f.get('type')||'text');if(!label)return false;
    if(item)Object.assign(item,{label,type});else state.settings.customFields.push({id:uid(),label,type});save();
  });}
  function renamePage(id){const p=state.settings.pages.find(x=>x.id===id);if(!p)return;showModal('Renomear página',field('Nome do menu','label',p.label,'text','required'),f=>{const label=String(f.get('label')||'').trim().slice(0,35);if(!label)return false;p.label=label;save();});}

  document.addEventListener('click',async ev=>{
    const el=ev.target.closest('[data-nav],[data-action]');if(!el)return;
    if(el.dataset.nav){nav(el.dataset.nav);return;}
    const a=el.dataset.action||'';
    try{
      if(a==='sign-in'){openAuthModal();return;}
      if(a==='auth-signup'){$('#modal').close();openAuthModal('sign-up');return;}
      if(a==='auth-login'){$('#modal').close();openAuthModal('sign-in');return;}
      if(a.startsWith('show-')){const match=/^show-(label|up|down|toggle)-(.+)$/.exec(a);if(match){const [,op,id]=match;const items=showFields();const idx=items.findIndex(f=>f.id===id);if(idx<0)return;const item=items[idx];if(op==='label'){showModal('Renomear campo',field('Nome do campo','label',item.label,'text','required'),form=>{const label=String(form.get('label')||'').trim().slice(0,60);if(!label)return false;item.label=label;state.settings.showFields=items;save();});return;}if(op==='toggle'&&id!=='date'&&id!=='city'){if(!confirm('Excluir este campo da lista e do formulário? As informações dos shows antigos serão preservadas.'))return;item.visible=false;}if(op==='up'&&idx>0)[items[idx-1],items[idx]]=[items[idx],items[idx-1]];if(op==='down'&&idx<items.length-1)[items[idx+1],items[idx]]=[items[idx],items[idx+1]];state.settings.showFields=items;save();render();return;}}
      if(a==='sign-out'){await signOut();return;}
      if(a==='sync-now'){if(!cloudUser){openAuthModal();return;}if(cloudConflict){toast('Resolva o conflito antes.');return;}await syncNow(true);return;}
      if(a==='resolve-conflict'){await resolveConflict();return;}
      if(a==='restore-precloud'){const old=localStorage.getItem(KEY+'-precloud');if(old)confirmAction('Restaurar dados locais','Substituir dados atuais por uma cópia antiga salva neste aparelho? Faça um backup dos dados atuais antes.',()=>{state=JSON.parse(old);ensureState();save();});return;}
      if(a.startsWith('add-note-item-')){noteItemForm(state.notes.find(n=>n.id===a.slice(14)));return;}
      if(a.startsWith('edit-note-item-')||a.startsWith('delete-note-item-')){
        const editing=a.startsWith('edit-');const key=a.slice(editing?15:17);const note=state.notes.find(n=>key.startsWith(n.id+'-'));
        if(!note)return;const item=note.items?.find(x=>x.id===key.slice(note.id.length+1));if(!item)return;
        if(editing)noteItemForm(note,item);else confirmAction('Excluir item','Excluir este item da lista?',()=>{note.items=note.items.filter(x=>x.id!==item.id);save();render();});return;
      }
      if(a==='new-note'){noteForm();return;}
      if(a.startsWith('edit-note-')){noteForm(state.notes.find(n=>n.id===a.slice(10)));return;}
      if(a.startsWith('pin-note-')){const n=state.notes.find(x=>x.id===a.slice(9));if(n){n.pinned=!n.pinned;n.updatedAt=new Date().toISOString();save();render();}return;}
      if(a.startsWith('delete-note-')){const id=a.slice(12);confirmAction('Excluir anotação','Remover esta anotação em todos os seus dispositivos?',()=>{state.notes=state.notes.filter(n=>n.id!==id);save();});return;}
      if(a==='new-category'){categoryForm();return;}
      if(a.startsWith('rename-category-')){categoryForm(decodeURIComponent(a.slice('rename-category-'.length)));return;}
      if(a.startsWith('delete-category-')){const name=decodeURIComponent(a.slice('delete-category-'.length));confirmAction('Excluir categoria','As anotações desta categoria passarão para Geral.',()=>{state.settings.categories=state.settings.categories.filter(c=>c!==name);state.notes.forEach(n=>{if(n.category===name)n.category='Geral';});if(notesFilter===name)notesFilter='Todas';save();});return;}
      if(a.startsWith('extra-up-')||a.startsWith('extra-down-')){const up=a.startsWith('extra-up-'),id=a.slice(up?9:11),items=state.settings.customFields,i=items.findIndex(f=>f.id===id),j=i+(up?-1:1);if(i>=0&&j>=0&&j<items.length){[items[i],items[j]]=[items[j],items[i]];save();render();}return;}
      if(a==='new-field'){fieldForm();return;}
      if(a.startsWith('edit-field-')){fieldForm(state.settings.customFields.find(f=>f.id===a.slice('edit-field-'.length)));return;}
      if(a.startsWith('delete-field-')){const id=a.slice('delete-field-'.length);confirmAction('Excluir campo','Remover este campo do cadastro? Os valores dos shows antigos serão preservados.',()=>{state.settings.customFields=state.settings.customFields.filter(f=>f.id!==id);save();});return;}
      if(a.startsWith('rename-page-')){renamePage(a.slice('rename-page-'.length));return;}
      if(a.startsWith('toggle-page-')){const p=state.settings.pages.find(p=>p.id===a.slice('toggle-page-'.length));if(p&&p.id!=='ajustes'){p.visible=p.visible===false?true:false;save();render();}return;}
      if(a.startsWith('page-up-')||a.startsWith('page-down-')){const id=a.slice(a.startsWith('page-up-')?8:10),list=state.settings.pages,i=list.findIndex(p=>p.id===id),j=i+(a.startsWith('page-up-')?-1:1);if(i>=0&&j>=0&&j<list.length){[list[i],list[j]]=[list[j],list[i]];save();render();}return;}
      if(a.startsWith('theme-')){state.settings.accent=a.slice(6);save();render();return;}
      if(a.startsWith('go-')){nav(a.slice(3));return;}
      if(a.startsWith('open-event-')){activeId=a.slice(11);view='evento';render();return;}
      if(a==='new-show'||a==='top-add'){showForm();return;}
      if(a==='edit-show'){editDetailHeader(current());return;}
      if(a==='template-add'){templateForm();return;}
      if(a.startsWith('template-')){const m=/^template-(edit|delete|up|down)-(\d+)$/.exec(a);if(!m)return;const fields=defaultDetailFields(),i=Number(m[2]);if(!fields[i])return;if(m[1]==='edit'){templateForm(i);return;}if(m[1]==='delete'){confirmAction('Excluir campo padrão','Remover este campo dos próximos shows?',()=>{fields.splice(i,1);if(!saveTemplate(fields))throw Error('Não foi possível salvar.');});return;}const j=i+(m[1]==='up'?-1:1);if(j>=0&&j<fields.length){[fields[i],fields[j]]=[fields[j],fields[i]];if(saveTemplate(fields))render();}return;}
      if(a==='detail-add'){detailForm(current());return;}
      if(a.startsWith('detail-')){const m=/^detail-(edit|delete|up|down)-(\d+)$/.exec(a);const e=current();if(!m||!e)return;const i=Number(m[2]),fields=detailFields(e).map(f=>({...f})),f=fields[i];if(!f)return;
        if(m[1]==='edit'){detailForm(e,i);return;}
        if(m[1]==='delete'){confirmAction('Excluir campo','Remover '+f.label+' apenas deste show?',()=>{if(current()!==e)throw Error('Show atualizado. Tente novamente.');fields.splice(i,1);if(!updateDetail(e,fields))throw Error('Não foi possível salvar.');});return;}
        const j=i+(m[1]==='up'?-1:1);if(j>=0&&j<fields.length){[fields[i],fields[j]]=[fields[j],fields[i]];if(updateDetail(e,fields))render();}return;
      }
      if(a==='delete-show'){const e=current();if(e)confirmAction('Excluir show',`Excluir o show de ${e.city} em ${shortDate(e.date)}? Essa ação também apaga a lista de PDFs deste show.`,async()=>{for(const id of pdfsOf(e)){await pdfDel(id).catch(console.warn);await cloudPdfDel(id);delete state.pdfMeta[id];}state.events=state.events.filter(x=>x.id!==e.id);save();activeId=null;view='agenda';});return;}
      if(a==='new-contact'){contactForm();return;}
      if(a.startsWith('edit-global-')){const id=a.slice('edit-global-'.length);contactForm(state.contacts[id],id);return;}
      if(a.startsWith('edit-contact-')){const id=a.slice('edit-contact-'.length);contactForm(contactsOf(current()).find(c=>c.id===id));return;}
      if(a.startsWith('del-contact-')){const id=a.slice('del-contact-'.length);confirmAction('Excluir contato','Remover este contato do show?',()=>{current().contacts=contactsOf(current()).filter(c=>c.id!==id);save();});return;}
      if(a==='month-prev'||a==='month-next'){month=new Date(month.getFullYear(),month.getMonth()+(a==='month-prev'?-1:1),1,12);chosenDate='';render();return;}
      if(a.startsWith('cal-')){chosenDate=a.slice(4);const events=state.events.filter(e=>e.date===chosenDate);if(events.length===1){activeId=events[0].id;view='evento';}render();return;}
      if(a==='clear-date'){chosenDate='';render();return;}
      if(a==='to-detail'){view='evento';render();return;}
      if(a==='event-checklist'){view='checklist';render();return;}
      if(a==='event-schedule'){view='cronograma';render();return;}
      if(a==='event-pdfs'){view='riders';render();await updatePdfList();return;}
      if(a==='new-task'){taskForm();return;}
      if(a.startsWith('edit-task-')){taskForm(tasksOf(current()).find(t=>t.id===a.slice('edit-task-'.length)));return;}
      if(a.startsWith('delete-task-')){const id=a.slice('delete-task-'.length);confirmAction('Excluir tarefa','Remover esta tarefa do checklist?',()=>{current().tasks=tasksOf(current()).filter(t=>t.id!==id);save();});return;}
      if(a==='new-slot'){slotForm();return;}
      if(a.startsWith('edit-slot-')){slotForm(timelineOf(current()).find(s=>s.id===a.slice('edit-slot-'.length)));return;}
      if(a.startsWith('delete-slot-')){const id=a.slice('delete-slot-'.length);confirmAction('Excluir horário','Remover esta atividade do cronograma?',()=>{current().schedule=timelineOf(current()).filter(s=>s.id!==id);save();});return;}
      if(a==='share-schedule'){await shareSchedule();return;}
      if(a==='new-pdf'){openPDFForm();return;}
      if(a.startsWith('open-pdf-')){const id=a.slice('open-pdf-'.length);let f=await pdfGet(id).catch(()=>null);if(!f&&cloudUser)f=await cloudPdfGet(id);if(!f){toast('PDF indisponível. Entre na conta que recebeu o arquivo.');return;}const url=URL.createObjectURL(f.blob);const w=window.open(url,'_blank');if(!w)downloadBlob(f.blob,f.name);setTimeout(()=>URL.revokeObjectURL(url),60000);return;}
      if(a.startsWith('delete-pdf-')){const id=a.slice('delete-pdf-'.length);confirmAction('Excluir PDF','Excluir o documento deste aparelho?',async()=>{await pdfDel(id).catch(console.warn);await cloudPdfDel(id);delete state.pdfMeta[id];current().pdfIds=pdfsOf(current()).filter(x=>x!==id);save();});return;}
      if(a==='export-ics'){const e=current();if(!e){toast('Selecione um show primeiro.');return;}downloadBlob(new Blob([icsFor(e)],{type:'text/calendar;charset=utf-8'}),`lembretes-bia-${e.date}-${e.city.replace(/[^a-z0-9]/gi,'-')}.ics`);toast('Arquivo .ics gerado. Importe no Calendário para ativar os alertas.');return;}
      if(a==='export-backup'){await exportBackup();return;}
      if(a==='import-backup'){importBackup();return;}
    }catch(e){console.error(e);toast('Ocorreu um erro: '+(e.message||e));}
  });
  document.addEventListener('change',async ev=>{
    if(ev.target.matches('[data-note-item-check]')){const n=state.notes.find(x=>x.id===ev.target.dataset.noteItemCheck);const item=n?.items?.find(x=>x.id===ev.target.dataset.itemId);if(item){item.done=ev.target.checked;item.doneAt=item.done?new Date().toISOString():null;save();render();}return;}
    if(ev.target.matches('[data-note-check]')){const n=state.notes.find(x=>x.id===ev.target.dataset.noteCheck);if(n){n.checked=ev.target.checked;n.checkedAt=n.checked?new Date().toISOString():null;save();render();toast(n.checked?'Anotação conferida.':'Anotação reaberta.');}return;}
    if(ev.target.id==='event-picker'){activeId=ev.target.value;render();if(view==='riders')await updatePdfList();}
    if(ev.target.id==='notes-category'){notesFilter=ev.target.value;render();}

    if(ev.target.matches('[data-task]')){const e=current(),t=e&&tasksOf(e).find(x=>x.id===ev.target.dataset.task);if(t){t.done=ev.target.checked;t.doneAt=t.done?new Date().toISOString():null;save();render();}}
  });
  let noteSearchTimer;
  document.addEventListener('input',ev=>{if(ev.target.id==='notes-search'){notesQuery=ev.target.value;clearTimeout(noteSearchTimer);noteSearchTimer=setTimeout(()=>{const focus=document.activeElement?.id==='notes-search';const position=ev.target.selectionStart;render();const el=$('#notes-search');if(focus&&el){el.focus();el.setSelectionRange(position,position);}},280);}});
  $('#close-modal').addEventListener('click',()=>$('#modal').close());
  $('#modal-actions').addEventListener('click',ev=>{if(ev.target.id==='cancel-modal')$('#modal').close();});
  $('#top-add').addEventListener('click',()=>showForm());
  $('#modal').addEventListener('close',()=>{$('#modal-form').onsubmit=null;});
  // Account-scoped cloud synchronization; local editing stays possible during outages.
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js?v=15',{updateViaCache:'none'}).catch(()=>{});
  render();
  window.addEventListener('supabase-sdk-ready',()=>initCloud().catch(e=>{console.error('Erro ao conectar à nuvem:',e);toast('Falha ao conectar: '+(e.message||e));}));
  window.addEventListener('supabase-sdk-error',()=>{toast('Biblioteca da nuvem bloqueada. Verifique bloqueadores de conteúdo ou a rede.');updateStatus();});
  if(window.__cloudSdkStatus==='ready'||window.supabase?.createClient)initCloud().catch(console.warn);
  window.addEventListener('storage',ev=>{if(ev.key===KEY && !pendingRemote){try{state=JSON.parse(ev.newValue)||defaultState();ensureState();render();}catch{}}});
  // As the renderer replaces PDF cards, refresh them after any page render.
})();
