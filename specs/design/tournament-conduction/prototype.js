(function () {
  'use strict';
  const demo = window.ConductionDemo;
  const sport = window.ConductionSports;
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const arenaLabel = arena => `Arena ${arena.number}${arena.name ? ` · ${arena.name}` : ''}`;
  const badge = (text, kind = '') => `<span class="badge ${kind}">${escape(text)}</span>`;
  const events = new Map([['monomachia-demo', demo.createScenario()], ['outro-demo', demo.createScenario('empty', 'outro-demo')]]);
  events.get('outro-demo').event.name = 'Encontro · demonstração';
  let activeEvent = 'monomachia-demo';
  let scenarioKey = 'preparation';
  let screenId = 'COND-WF-01';
  let batchPreview = null;
  let drafts = {};
  let menuOpen = false;
  let audience = 'admin';
  const sessionKey = 'kb-conduction-fictional-session-v3';
  const state = () => events.get(activeEvent);
  const personName = id => state().participants.find(person => person.id === id)?.name || 'Participante não encontrado';
  const route = id => `#${id}/${scenarioKey}`;
  const field = (id, label, value, extra = '') => `<label for="${id}">${label}<input id="${id}" name="${id}" data-draft value="${escape(value)}" ${extra}></label>`;
  const views = window.createConductionViews({state,escape,badge,route,notify,render,audience:() => audience,drafts:() => drafts});
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey));
    if (saved?.version === 3 && Array.isArray(saved.events) && saved.events.some(([id]) => id === saved.activeEvent)) {
      events.clear(); saved.events.forEach(([id,value]) => { delete value.pendingBound; sport.ensure(value); events.set(id,value); });
      activeEvent = saved.activeEvent; scenarioKey = state().initialScenario; audience = saved.audience || 'admin';
    }
  } catch { /* A disabled or cleared browser session starts a fresh fictional demo. */ }
  function persist() {
    try { sessionStorage.setItem(sessionKey,JSON.stringify({version:3,events:[...events],activeEvent,audience})); } catch { /* Storage is optional for this offline review. */ }
  }

  function notify(text, error = false) {
    $('notice').className = `notice${error ? ' error' : ''}`;
    $('notice').textContent = text;
    $('notice').hidden = false;
  }

  function preparation() {
    const current = state();
    const allocated = current.matches.some(match => match.arenaId);
    const arenaLocked = current.roundStatus !== 'DRAFT' || allocated;
    return `<dl class="stats"><div><dt>Participantes</dt><dd>${current.participants.length}</dd></div><div><dt>Arenas</dt><dd>${current.arenas.length}</dd></div><div><dt>Fases</dt><dd>2</dd></div></dl>
      <div class="split"><section class="panel"><h3>Dados do torneio</h3>
      <form id="event-form" class="stack">${field('event-name', 'Nome do torneio', drafts['event-name'] ?? current.event.name, 'required')}
      <p class="small muted">Regras da condução: Monomachia. Os dados deste torneio são fictícios.</p><div class="actions"><button type="submit" ${current.roundStatus !== 'DRAFT' ? 'disabled' : ''}>Salvar nome</button><button type="button" data-action="new-event">Criar outro torneio</button></div></form>
      </section><section class="panel"><h3>Fases da competição</h3><div class="phase"><span class="phase-number">1</span><div><h3>Classificatória</h3><p>Sistema suíço · 7 rodadas · 4 classificados</p></div></div><div class="phase"><span class="phase-number">2</span><div><h3>Final</h3><p>Round robin · 4 atletas · 6 confrontos</p></div></div></section></div>
      <section class="panel"><h3>Arenas do evento</h3><p class="muted">Defina o número de cada área de combate. O nome é opcional.</p>
      ${current.arenas.length ? `<ul class="list">${current.arenas.map(arena => `<li><strong>${escape(arenaLabel(arena))}</strong><span class="small muted">Posição ${current.arenas.indexOf(arena) + 1} na distribuição</span></li>`).join('')}</ul>` : '<p class="callout">Nenhuma Arena configurada. Adicione ao menos uma para distribuir lutas.</p>'}
      <form id="arena-form" class="form-row actions">${field('arena-number', 'Número da Arena', drafts['arena-number'] ?? '', 'type="number" min="0" step="1" required')}${field('arena-name', 'Nome da Arena (opcional)', drafts['arena-name'] ?? '')}<button type="submit" ${arenaLocked ? 'disabled' : ''}>Adicionar Arena</button></form>
      ${arenaLocked ? '<p class="helper">As Arenas desta distribuição ficam preservadas. Para testar outra preparação, reinicie o cenário.</p>' : '<p class="helper">As lutas percorrem esta ordem de Arenas e continuam o ciclo quando novas lutas entram.</p>'}</section>
      <div class="actions"><a href="${route('COND-WF-02')}">Continuar para participantes →</a></div>`;
  }

  function participants() {
    const current = state();
    const locked = current.roundStatus !== 'DRAFT' || current.matches.length > 0;
    const present = current.participants.filter(person => person.present).length;
    return `<dl class="stats"><div><dt>Na lista</dt><dd>${current.participants.length}</dd></div><div><dt>Presentes</dt><dd>${present}</dd></div><div><dt>Não marcados</dt><dd>${current.participants.length - present}</dd></div></dl>
      <section class="panel"><h3>Lista de presença</h3><p class="muted">Marque quem está no local. A presença não altera a inscrição ou o resultado de uma luta.</p>
      ${current.participants.length ? `<div class="table-region" tabindex="0" role="region" aria-label="Lista de presença, com rolagem horizontal quando necessário"><table class="people-table"><caption>Origem e presença são informações da equipe.</caption><thead><tr><th scope="col">Participante</th><th scope="col">Origem</th><th scope="col">Presença</th><th scope="col">Participação</th></tr></thead><tbody>${current.participants.map(person => `<tr><td class="participant-name">${escape(person.name)}</td><td>${person.origin === 'TEST' ? 'Teste' : 'Manual'}</td><td><label class="presence"><input type="checkbox" data-presence="${person.id}" id="presence-${person.id}" aria-label="Presença de ${escape(person.name)}" ${person.present ? 'checked' : ''}>${person.present ? 'Presente' : 'Não marcado'}</label></td><td>${person.guardianCheckPending ? badge('Verificação presencial pendente', 'warning') : badge('Inscrição confirmada', 'good')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><h3>A lista está vazia</h3><p>Adicione nomes ou gere jogadores fictícios para preparar os confrontos.</p></div>'}
      ${current.participants.some(person => person.guardianCheckPending) ? '<p class="callout">Menor: a marcação de presença não substitui termo assinado, acompanhamento e verificação presencial dos documentos. Nenhum documento real é usado nesta prévia.</p>' : ''}</section>
      <div class="split"><section class="panel"><h3>Adicionar jogador</h3><form id="participant-form" class="stack">${field('participant-name', 'Nome de exibição', drafts['participant-name'] ?? '', 'required')}<div class="actions"><button type="submit" ${locked ? 'disabled' : ''}>Adicionar jogador</button><button type="button" data-action="generate-test" ${locked ? 'disabled' : ''}>Gerar 8 jogadores de teste</button></div></form></section>
      <section class="panel"><h3>Adicionar vários</h3><form id="batch-form"><label for="batch-names">Um nome por linha<textarea id="batch-names" name="batch-names" data-draft>${escape(drafts['batch-names'] ?? '')}</textarea></label><div class="actions"><button type="submit" ${locked ? 'disabled' : ''}>Revisar nomes</button></div></form>
      ${batchPreview ? `<div id="batch-preview" class="batch-preview"><strong>${batchPreview.values.length} nomes para adicionar</strong><ol>${batchPreview.values.map(name => `<li>${escape(name)}</li>`).join('')}</ol>${batchPreview.duplicates.length ? '<p class="small">Há nomes repetidos. Eles serão mantidos como participantes distintos.</p>' : ''}<button type="button" id="batch-confirm" data-action="confirm-batch">Confirmar inclusão dos nomes</button></div>` : ''}</section></div>
      ${locked ? '<p class="helper">A inclusão de jogadores nesta prévia acontece antes de preparar a rodada. Reinicie o cenário para testar uma nova lista. A presença continua editável.</p>' : ''}<div class="actions"><a href="${route('COND-WF-03')}">Revisar rodada e confrontos →</a></div>`;
  }

  function round() {
    const current = state();
    const published = current.roundStatus === 'PUBLISHED';
    const errors = demo.pairingErrors(current);
    const remaining = current.matches.filter(match => !match.arenaId).length;
    return `<section class="panel"><div class="actions" style="margin-top:0"><div><h3>Classificatória · Rodada 1 de 7</h3>${badge(published ? 'Rodada publicada' : 'Em revisão', published ? 'good' : '')}</div><span class="push small muted">Ordem inicial fornecida</span></div><p class="helper">Revise os adversários e a folga antes de publicar. A primeira rodada usa a ordem inicial deste cenário.</p>
      ${errors.length ? `<div class="callout error-title"><strong>Os confrontos precisam de revisão.</strong><ul>${errors.map(error => `<li>${escape(error)}</li>`).join('')}</ul></div>` : ''}
      ${current.matches.length ? `<div class="table-region" tabindex="0" role="region" aria-label="Confrontos da rodada, com rolagem horizontal quando necessário"><table class="match-table"><caption>${current.matches.length} lutas · ${remaining} sem Arena</caption><thead><tr><th scope="col">Ordem</th><th scope="col">Atleta A</th><th scope="col">Atleta B</th><th scope="col">Arena</th><th scope="col">Situação</th></tr></thead><tbody>${current.matches.map(match => { const arena = current.arenas.find(item => item.id === match.arenaId); return `<tr><td>${match.order}</td><td>${escape(personName(match.athleteA))}</td><td>${escape(personName(match.athleteB))}</td><td>${arena ? escape(arenaLabel(arena)) : 'Não distribuída'}</td><td>${badge(match.status === 'CALLED' ? 'Atletas chamados' : published ? 'Agendada' : 'Rascunho', match.status === 'CALLED' ? 'good' : '')}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty"><h3>Nenhum confronto preparado</h3><p>Revise a lista de participantes e prepare a primeira rodada. São necessários ao menos dois jogadores nesta prévia.</p><a href="${route('COND-WF-02')}">Ir aos participantes →</a></div>`}
      ${current.byeId ? `<p class="callout"><strong>Folga: ${escape(personName(current.byeId))}.</strong> Um ponto será creditado ao confirmar a folga no encerramento da rodada. Não há luta, first blood ou bounds fictícios.</p>` : ''}
      ${!current.arenas.length ? '<p class="callout">Configure uma Arena na preparação antes de distribuir e publicar lutas.</p>' : ''}
      <div class="actions"><button type="button" data-action="prepare-round" ${published || current.participants.filter(person => person.status === 'ACTIVE').length < 2 ? 'disabled' : ''}>${current.matches.length ? 'Recriar sugestão inicial' : 'Preparar primeira rodada'}</button><button type="button" data-action="allocate" ${published || !current.matches.length ? 'disabled' : ''}>Distribuir lutas entre Arenas</button><button type="button" class="primary" data-action="publish" ${published || !current.matches.length ? 'disabled' : ''}>Publicar rodada revisada</button></div>
      <p class="helper">A distribuição usa as Arenas na sequência, sem sorteio. A publicação preserva os confrontos e libera a agenda para a audiência permitida do evento.</p></section>
      <section class="panel"><h3>Próximas etapas esportivas</h3><p class="muted">A próxima rodada depende dos resultados oficiais da anterior. O roteiro preparado permite revisar as sete rodadas e o avanço à final.</p><a href="${route('COND-WF-07')}">Ver avanço e rodadas preparadas →</a></section><div class="actions"><a href="${route('COND-WF-04')}">Ver filas das Arenas →</a></div>`;
  }

  function queues() {
    const current = state();
    if (!current.arenas.length) return '<div class="empty"><h3>Configure as Arenas primeiro</h3><p>Uma Arena precisa de número. O nome é opcional.</p><a href="' + route('COND-WF-01') + '">Voltar à preparação →</a></div>';
    if (current.roundStatus !== 'PUBLISHED') return `<div class="empty"><h3>A rodada ainda não foi publicada</h3><p>Revise os confrontos e distribua as lutas para liberar as filas e chamadas.</p><a href="${route('COND-WF-03')}">Revisar rodada →</a></div>`;
    return `<p class="muted">Chame os atletas da próxima luta de cada Arena. A ordem dos confrontos permanece preservada.</p><div class="queue-grid">${current.arenas.map(arena => {
      const queue = current.matches.filter(match => match.arenaId === arena.id && match.phase === current.phase && match.round === current.currentRound && !match.duel);
      const called = queue.find(match => ['CALLED','RUNNING','PAUSED','AWAITING_CONFIRMATION'].includes(match.status));
      return `<section class="queue"><h3>${escape(arenaLabel(arena))}</h3><p class="small muted">${queue.length} ${queue.length === 1 ? 'luta na fila' : 'lutas na fila'}</p><ol>${queue.map(match => `<li class="${match.status === 'CALLED' ? 'called' : ''}"><span class="small muted">Luta ${match.order} · Rodada ${match.round}</span><p class="athletes">${escape(personName(match.athleteA))}<br><span class="small muted">×</span><br>${escape(personName(match.athleteB))}</p>${badge(sport.statusLabels[match.status], match.status === 'FINALIZED' ? 'good' : '')}${[match.athleteA,match.athleteB].some(id => !current.participants.find(person => person.id === id)?.present) ? '<span class="subline">Há presença ainda não marcada. Nenhum WO foi declarado.</span>' : ''}</li>`).join('') || '<li class="muted">Nenhuma luta atribuída.</li>'}</ol><div class="actions"><button type="button" class="primary" data-call="${arena.id}" ${called || !queue.some(match => match.status === 'SCHEDULED') ? 'disabled' : ''}>${called ? 'Arena ocupada' : 'Chamar próxima luta'}</button>${called ? `<button type="button" data-sport="open" data-match="${called.id}">Operar luta</button>` : ''}</div></section>`;
    }).join('')}</div><p class="helper">A chamada não cria um resultado. A operação do combate registra bounds e confirma o resultado separadamente.</p>`;
  }

  const sourceLink = demo.sourceLink;

  function render(focusHeading = false) {
    sport.refresh(state());
    persist();
    const screen = demo.screens.find(item => item.id === screenId);
    const activeInput = document.activeElement?.id;
    const focusedAction = document.activeElement?.dataset.sport;
    const focusedBound = document.activeElement?.dataset.bound;
    const focusedMatch = document.activeElement?.dataset.match;
    $('screen-picker').value = screenId;
    $('scenario-picker').value = scenarioKey;
    $('audience-picker').value = audience;
    $('audience-label').textContent = audience === 'admin' ? 'Equipe (admin)' : audience === 'member' ? 'Membro / jogador · consulta' : 'Visitante / espectador · consulta';
    const allowed = sport.allowed(state(),audience);
    document.querySelector('.event-context').hidden = !allowed;
    document.querySelector('.app-footer span').textContent = audience === 'admin' ? 'Acesso administrativo em todos os eventos' : 'Consulta esportiva · somente leitura';
    $('event-picker').innerHTML = allowed ? [...events].filter(([,value]) => sport.allowed(value,audience)).map(([id, value]) => `<option value="${id}" ${id === activeEvent ? 'selected' : ''}>${escape(value.event.name)}</option>`).join('') : '';
    $('event-status').textContent = state().published ? 'Resultado final publicado' : state().roundStatus === 'PUBLISHED' ? `${state().phase === 'final' ? 'Final' : 'Classificatória'} · Rodada ${state().currentRound}` : 'Em preparação';
    $('section-links').innerHTML = demo.screens.filter(item => audience === 'admin' || !['COND-WF-01','COND-WF-02','COND-WF-05','COND-WF-08'].includes(item.id)).map(item => `<a href="${route(item.id)}" ${item.id === screenId ? 'aria-current="page"' : ''}>${item.title}</a>`).join('');
    $('section-links').classList.toggle('open', menuOpen);
    $('menu-toggle').setAttribute('aria-expanded', String(menuOpen));
    const body = !allowed ? views.view(screenId) : state().serviceError ? '<div class="empty"><h3 class="error-title">Não foi possível carregar esta visão</h3><p>O torneio continua selecionado. Tente novamente para retomar a preparação.</p><button type="button" data-action="retry">Tentar novamente</button></div>' : views.view(screenId) ?? ({'COND-WF-01':preparation, 'COND-WF-02':participants, 'COND-WF-03':round, 'COND-WF-04':queues}[screenId])();
    $('screen-content').innerHTML = `<div class="page-title"><p class="eyebrow">Condução do torneio</p><h2 id="screen-heading" tabindex="-1">${screen.heading}</h2>${allowed ? `<p class="event-title">${escape(state().event.name)} · ${state().visibility === 'internal' ? 'Interno' : 'Não interno'}</p>` : ''}</div>${body}`;
    $('spec-notes').innerHTML = `<section><h2>Tela e estado</h2><p><strong>${screen.id}</strong><br>${screen.title}<br>Origem: ${demo.scenarioLabels[scenarioKey]}</p><p>${screen.note}</p></section><section><h2>Regras e critérios</h2><div class="rule-links">${[...screen.rules,...screen.acceptance].map(id => `<a href="${sourceLink(id)}" target="_blank" rel="noopener">${id}</a>`).join('')}</div></section><section><h2>Limites da prévia</h2><p>Dados fictícios e sessão local recuperável ao recarregar. Reiniciar cenário limpa suas alterações. Sem autenticação, sincronização entre dispositivos ou serviços reais.</p><p>Rodadas preparadas servem ao roteiro. Não são um algoritmo suíço de produção.</p><p><a href="README.md">Como revisar a prévia ↗</a></p><p><a href="${demo.sources.access}#authorization-rules" target="_blank" rel="noopener">Acesso global dos admins ↗</a></p></section>`;
    if (focusHeading) { $('screen-heading').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'auto'}); }
    else if (activeInput && document.getElementById(activeInput)) document.getElementById(activeInput).focus({preventScroll:true});
    else if (focusedAction) {
      const replacement = [...document.querySelectorAll('[data-sport]')].find(element => element.dataset.sport === focusedAction && element.dataset.bound === focusedBound && element.dataset.match === focusedMatch && !element.disabled);
      (replacement || $('screen-heading')).focus({preventScroll:true});
    }
  }

  function navigate() {
    const [candidateScreen, candidateScenario] = location.hash.slice(1).split('/');
    screenId = demo.screens.some(screen => screen.id === candidateScreen) ? candidateScreen : 'COND-WF-01';
    const nextScenario = Object.hasOwn(demo.scenarioLabels, candidateScenario) ? candidateScenario : 'preparation';
    if (nextScenario !== scenarioKey) {
      const previousName = state().event.name;
      scenarioKey = nextScenario;
      const replacement = demo.createScenario(scenarioKey, activeEvent);
      replacement.event.name = previousName;
      events.set(activeEvent, replacement);
      drafts = {};
      batchPreview = null;
    }
    menuOpen = false;
    $('notice').hidden = true;
    render(true);
  }

  $('screen-picker').innerHTML = demo.screens.map(screen => `<option value="${screen.id}">${screen.title}</option>`).join('');
  $('scenario-picker').innerHTML = Object.entries(demo.scenarioLabels).map(([id,label]) => `<option value="${id}">${label}</option>`).join('');
  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); $('workspace').focus(); $('workspace').scrollIntoView({block:'start'}); });
  $('screen-picker').addEventListener('change', event => { location.hash = route(event.target.value); });
  $('audience-picker').addEventListener('change', event => { audience = event.target.value; $('notice').hidden = true; if (audience !== 'admin' && ['COND-WF-01','COND-WF-02','COND-WF-05','COND-WF-08'].includes(screenId)) { screenId = 'COND-WF-09'; history.replaceState(null,'',route(screenId)); } render(true); });
  $('scenario-picker').addEventListener('change', event => { location.hash = `#${screenId}/${event.target.value}`; });
  $('event-picker').addEventListener('change', event => { activeEvent = event.target.value; scenarioKey = state().initialScenario; history.replaceState(null,'',route(screenId)); drafts = {}; batchPreview = null; $('notice').hidden = true; render(); });
  $('reset-demo').addEventListener('click', () => {
    const name = state().event.name;
    events.set(activeEvent, demo.createScenario(scenarioKey, activeEvent));
    state().event.name = name;
    drafts = {}; batchPreview = null; render(); notify('Cenário reiniciado. As alterações fictícias desta sessão foram limpas.');
  });
  $('toggle-notes').addEventListener('click', event => {
    const hidden = !$('spec-notes').hidden;
    $('spec-notes').hidden = hidden;
    document.body.classList.toggle('without-notes', hidden);
    event.currentTarget.setAttribute('aria-pressed', String(!hidden));
  });
  $('menu-toggle').addEventListener('click', () => { menuOpen = !menuOpen; $('section-links').classList.toggle('open', menuOpen); $('menu-toggle').setAttribute('aria-expanded', String(menuOpen)); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuOpen) { menuOpen = false; $('section-links').classList.remove('open'); $('menu-toggle').setAttribute('aria-expanded','false'); $('menu-toggle').focus(); } });
  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('theme-toggle').textContent = dark ? 'Tema claro' : 'Tema escuro';
    $('theme-toggle').setAttribute('aria-pressed', String(dark));
  }
  try { setTheme(localStorage.getItem('kb-conduction-demo-theme') === 'dark'); } catch { setTheme(false); }
  $('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    setTheme(dark);
    try { localStorage.setItem('kb-conduction-demo-theme', dark ? 'dark' : 'light'); } catch { /* File previews can disable preference storage. */ }
  });
  document.addEventListener('input', event => {
    if (event.target.matches('[data-draft]')) {
      drafts[event.target.id] = event.target.value;
      if (event.target.id === 'batch-names') { batchPreview = null; if ($('batch-preview')) $('batch-preview').hidden = true; }
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'phase-picker') { state().viewPhase = event.target.value; render(); return; }
    if (event.target.id === 'match-picker') { state().selectedMatchId = event.target.value; render(); return; }
    if (event.target.matches('[data-draft]')) drafts[event.target.id] = event.target.value;
    if (!event.target.matches('[data-presence]')) return;
    demo.setPresence(state(), event.target.dataset.presence, event.target.checked);
    const name = personName(event.target.dataset.presence);
    render(); notify(`Presença de ${name}: ${event.target.checked ? 'marcada' : 'não marcada'}. Inscrição e resultados preservados.`);
  });
  document.addEventListener('submit', event => {
    if (['bound-form','edit-bound-form'].includes(event.target.id)) { event.preventDefault(); try { const message = views.submit(event.target.id); render(); notify(message); } catch (error) { notify(error.message,true); } return; }
    if (!['event-form','arena-form','participant-form','batch-form'].includes(event.target.id)) return;
    event.preventDefault();
    try {
      let message = '';
      if (event.target.id === 'event-form') { const name = $('event-name').value.trim(); if (!name) throw new Error('Informe o nome do torneio.'); state().event.name = name; drafts['event-name'] = name; message = 'Nome do torneio salvo nesta prévia.'; }
      if (event.target.id === 'arena-form') { const arena = demo.addArena(state(), $('arena-number').value, $('arena-name').value); drafts['arena-number'] = ''; drafts['arena-name'] = ''; message = `${arenaLabel(arena)} adicionada.`; }
      if (event.target.id === 'participant-form') { const name = $('participant-name').value; const duplicate = demo.previewNames(name, state().participants.map(person => person.name)).duplicates.length; demo.addParticipants(state(), [name]); drafts['participant-name'] = ''; message = duplicate ? 'Jogador adicionado como pessoa distinta. Há nome repetido na lista.' : 'Jogador adicionado à lista.'; }
      if (event.target.id === 'batch-form') { batchPreview = demo.previewNames($('batch-names').value, state().participants.map(person => person.name)); if (!batchPreview.values.length) throw new Error('Informe ao menos um nome para revisar.'); }
      render(); if (message) notify(message);
    } catch (error) { notify(error.message, true); }
  });
  document.addEventListener('click', event => {
    const sportButton = event.target.closest('[data-sport]');
    if (sportButton && !sportButton.disabled) { try { const message = views.handle(sportButton.dataset.sport,sportButton); render(); if (message) notify(message); } catch (error) { notify(error.message,true); } return; }
    const button = event.target.closest('[data-action],[data-call]');
    if (!button || button.disabled) return;
    try {
      let message = '';
      const current = state();
      if (button.dataset.call) { const match = demo.callNext(current, button.dataset.call); const arena = current.arenas.find(item => item.id === button.dataset.call); message = `${arenaLabel(arena)}: ${personName(match.athleteA)} e ${personName(match.athleteB)} chamados para a luta ${match.order}.`; }
      switch (button.dataset.action) {
        case 'new-event': { const id = `evento-demo-${events.size + 1}`; const fresh = demo.createScenario('empty', id); fresh.event.name = 'Novo torneio · demonstração'; fresh.arenas = []; events.set(id, fresh); activeEvent = id; scenarioKey = 'empty'; history.replaceState(null,'',route(screenId)); drafts = {}; batchPreview = null; message = 'Novo torneio fictício criado. Configure suas Arenas e participantes.'; break; }
        case 'generate-test': demo.addParticipants(current, Array.from({length:8}, (_, index) => `Atleta de teste ${current.participants.length + index + 1}`), 'TEST'); message = 'Oito jogadores de teste adicionados, sem contas ou inscrições reais.'; break;
        case 'confirm-batch': if (!batchPreview) throw new Error('Revise os nomes antes de confirmar.'); demo.addParticipants(current, batchPreview.values); message = `${batchPreview.values.length} jogadores adicionados.`; drafts['batch-names'] = ''; batchPreview = null; break;
        case 'prepare-round': demo.prepareRound(current); message = 'Confrontos iniciais preparados para revisão. Nenhuma presença foi alterada.'; break;
        case 'allocate': { const count = demo.allocateMatches(current); message = `${count} lutas distribuídas na sequência das Arenas.`; break; }
        case 'publish': demo.publishRound(current); message = 'Rodada publicada. As filas das Arenas estão disponíveis para chamada.'; break;
        case 'retry': current.serviceError = false; message = 'Visão carregada. A preparação pode continuar.'; break;
      }
      render(); if (message) notify(message);
    } catch (error) { notify(error.message, true); }
  });
  window.addEventListener('hashchange', navigate);
  window.addEventListener('pagehide', persist);
  setInterval(() => {
    const before = state().matches.map(match => match.status).join(',');
    sport.refresh(state());
    if (before !== state().matches.map(match => match.status).join(',')) { render(); notify('Tempo encerrado. Revise e confirme o resultado.'); return; }
    const match = views.selected(); const clock = $('match-clock');
    if (clock && match) clock.textContent = views.seconds(match.duel ? sport.clock(match) : Math.max(0,180-sport.clock(match)));
  },250);
  navigate();
})();
