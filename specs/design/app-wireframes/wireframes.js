/* Karlbrüder application wireframes
**Created**: 2026-10-18
**Last updated**: 2026-11-14

Design-only, offline wireframes. No API, authentication, uploads, or persistence.
*/
const A = '../../../landing/public/';
const registrationOptions = {
  social: {name: 'Inscrição Social', price: 'R$ 50,00', description: 'Participação e troféu em caso de vitória. Não inclui outras premiações, cupons ou brindes de patrocinadores.'},
  plena: {name: 'Inscrição Plena', price: 'R$ 100,00', description: 'Participação, premiações para ganhadores e distribuição de cupons e brindes de patrocinadores.'},
  plus: {name: 'Inscrição Plus', price: 'R$ 200,00', description: 'Tudo da Plena e pacote de boas-vindas e participação com camiseta, brindes e café da manhã. Conteúdo completo a confirmar.'}
};
let selectedRegistrationOption = 'plena';
function registrationOptionChoices() {
  return `<fieldset class="registration-options"><legend>Escolha sua inscrição *</legend><p>Compare os benefícios antes de escolher.</p>${Object.entries(registrationOptions).map(([id, option]) => `<label class="registration-option"><input type="radio" name="registration-option" value="${id}" ${selectedRegistrationOption === id && !['stale','optionerror'].includes(state) ? 'checked' : ''}><span><strong>${option.name}</strong><span class="option-price">${option.price}</span><span>${option.description}</span></span></label>`).join('')}</fieldset>`;
}

const screens = [
 {id:'WF-26',title:'26 · Atletas do torneio',phase:'Proposta',role:'Staff (admin)',states:{list:'Participantes',empty:'Nenhuma inscrição',filtered:'Busca sem resultados',matching:'Busca com resultado',unlimited:'Capacidade ilimitada',zero:'Capacidade zero'},rules:['ADM-001','ADM-002','ADM-013'],refs:['tournaments/administration.md'],notes:['Selecione uma inscrição para gerenciar os dados e as tags daquele atleta.','A busca e os dados são ilustrativos.'],render:staffTagRegistrations},
 {id:'WF-24',title:'24 · Minhas tags',phase:'Proposta',role:'Participante',states:{edit:'Editar seleção',closed:'Janela encerrada',saved:'Seleção salva',empty:'Torneio sem tags'},rules:['REG-005','REG-008'],refs:['tournaments/registration.md'],notes:['Proposta: seleção opcional e múltipla. A equipe verifica elegibilidade no evento.','O prazo e a seleção após encerramento antecipado são propostas sujeitas a decisão.'],render:participantTags},
 {id:'WF-25',title:'25 · Gerenciar inscrição',phase:'Proposta',role:'Staff (admin)',states:{review:'Editar inscrição',add:'Alterar tags',added:'Tags salvas',remove:'Remover tag',removed:'Tags salvas',conflict:'Correção cria duplicidade'},rules:['ADM-001','ADM-003','ADM-012'],refs:['tournaments/administration.md','tournaments/registration.md'],notes:['A equipe pode corrigir dados e alterar tags após o encerramento das inscrições.','Dados e tags são salvos separadamente. Alterações de tags não exigem histórico ou notificações.'],render:staffTags},
 {id:'WF-01',title:'03 · Catálogo de torneios',phase:'Primeira entrega',role:'Visitante',states:{public:'Público',member:'Membro da guilda',empty:'Sem torneios',error:'Falha de carregamento'},rules:['PROD-003','CAT-001','CAT-004','CAT-005'],refs:['tournaments/catalog.md','product.md'],notes:['Eventos internos só aparecem para membros e staff. Não exibir cartões bloqueados ao visitante.','Monomachia é uma configuração do catálogo. O segundo evento é fictício e demonstra reutilização.','Busca, filtros e composição dos cartões são propostas de apresentação.'],render:catalog},
 {id:'WF-02',title:'04 · Detalhes do torneio',phase:'Primeira entrega',role:'Visitante / participante',states:{open:'Inscrições abertas',athlete:'Visão do atleta · documentos disponíveis',documentspartial:'Visão do atleta · política ausente',documentsmissing:'Visão do atleta · sem documentos',full:'Lotado, inscrições abertas',closed:'Inscrições encerradas',unknown:'Informações não configuradas'},rules:['CAT-002','CAT-003','CAT-004','CAT-008','CAP-008','MONO-003'],refs:['tournaments/catalog.md','tournaments/events/monomachia-2027.md','tournaments/capacity-and-waitlist.md'],notes:['Lotação e encerramento são estados diferentes. Um evento lotado ainda pode receber inscrições.','Social custa R$ 50; Plena custa R$ 100; Plus custa R$ 200. Capacidade e janela são exemplos.','Os arquivos de exemplo ilustram a consulta no torneio. A seção aparece quando há arquivos disponíveis. Se faltar um documento da inscrição, mostre a indisponibilidade na seção.'],render:detail},
 {id:'WF-03',title:'02 · Entrar e criar conta',phase:'Primeira entrega',role:'Visitante',states:{login:'Entrar',signup:'Criar conta',verify:'Verificar e-mail',recover:'Recuperar senha',reset:'Definir nova senha',changepassword:'Alterar senha (sessão ativa)',expired:'Sessão expirada',unavailable:'Serviço indisponível'},rules:['AUTH-001','AUTH-002','AUTH-003','AUTH-006','REG-011'],refs:['identity/authentication-and-access.md','tournaments/registration.md'],notes:['E-mail/senha e Google. A escolha do torneio continua após autenticação.','Recuperação e alteração com sessão ativa usam `/account/new-password` e `/account/password` na aplicação.','O protótipo simula navegação; não autentica ninguém e não envia e-mails.'],render:auth},
 {id:'WF-04',title:'05 · Inscrição pessoal',phase:'Primeira entrega',role:'Participante',states:{adult:'Maior de idade',minor:'Menor de idade',documentspartial:'Política de cancelamento ausente',documentsmissing:'Sem documentos',full:'Evento lotado',invalid:'Campos inválidos',duplicate:'Inscrição duplicada',closed:'Encerrado durante o preenchimento',stale:'Opção alterada',unavailable:'Opção indisponível',optionerror:'Falha ao atualizar opções'},rules:['REG-001','REG-004','REG-005','REG-010','REG-011','REG-015','REG-019','PRIV-001','PRIV-002','PRIV-005','PRIV-010'],refs:['tournaments/registration.md','tournaments/consent-and-privacy.md'],notes:['Somente a própria pessoa. E-mail exibido é o e-mail da conta; documento não é usado como credencial de acesso.','Formulário único com seções; não propõe salvar rascunho nem inscrição de terceiros.','O regulamento informa a transmissão oficial e o público dos resultados antes do aceite. PRIV-Q1 acompanha o texto final e as decisões do evento.','Sem opt-out de lista de participantes. Sem campo de nota interna visível ao participante.'],render:registration},
 {id:'WF-05',title:'06 · Pix e comprovante',phase:'Primeira entrega',role:'Participante',states:{initial:'Aguardando pagamento',replace:'Substituir comprovante',rejected:'Comprovante recusado',fileerror:'Arquivo inválido',late:'Prazo de pagamento passado'},rules:['PAY-001','PAY-003','PAY-004','PAY-006','PAY-010','PAY-011'],refs:['tournaments/payments-and-confirmation.md','tournaments/registration.md'],notes:['Pix é realizado fora da plataforma; enviar o arquivo não transfere dinheiro nem confirma vaga.','PDF, JPEG e PNG até 10 MB. Participante vê somente a versão mais recente.','A chave é propositalmente fictícia/não utilizável. O seletor de arquivo não lê nem envia o conteúdo.'],render:payment},
 {id:'WF-06',title:'07 · Situação da inscrição',phase:'Primeira entrega',role:'Participante',states:{review:'Aguardando confirmação do pagamento',confirmed:'Inscrição confirmada',waitlist:'Pagamento aprovado, em espera'},rules:['REG-006','REG-007','CAP-002','CAP-005','CAP-007','PAY-011'],refs:['tournaments/registration.md','tournaments/capacity-and-waitlist.md','tournaments/payments-and-confirmation.md'],notes:['Sem posição na fila, previsão de chamada ou promoção automática. Staff escolhe quem confirmar.','A tela de espera diz explicitamente que o pagamento está aprovado e a vaga não está confirmada.','Para menor: confirmação não dispensa acompanhamento e conferência presencial de documentos.'],render:status},
 {id:'WF-07',title:'08 · Minhas inscrições',phase:'Primeira entrega',role:'Participante',states:{list:'Com inscrições',empty:'Nenhuma inscrição'},rules:['REG-007','REG-008','REG-004','AUTH-009'],refs:['tournaments/registration.md','identity/authentication-and-access.md'],notes:['Listagem restrita ao proprietário. O número de inscrição não concede acesso a outros registros.','Atalhos de pagamento e acompanhamento dependem do estado da inscrição.'],render:myRegistrations},
 {id:'WF-08',title:'09 · Dados da minha inscrição',phase:'Primeira entrega',role:'Participante',states:{edit:'Editar dados permitidos',conflict:'Correção cria duplicidade',tagssaved:'Tags salvas',tagsclosed:'Edição de tags encerrada'},rules:['REG-008','REG-009','PRIV-005','PRIV-003'],refs:['tournaments/registration.md','tournaments/consent-and-privacy.md'],notes:['Esta tela edita TournamentRegistration, não atribui roles ou muda a identidade da conta.','Status, titular, evento, número e timestamps não são editáveis. Nota de segurança não aparece.','Declarações registradas são somente para consulta. Dúvidas e solicitações seguem pelo contato da organização e pela política de privacidade.'],render:editRegistration},
 {id:'WF-09',title:'15 · Fila de análise da equipe',phase:'Primeira entrega',role:'Staff (admin)',states:{queue:'Comprovantes pendentes',empty:'Sem pendências',loading:'Carregando',error:'Falha de carregamento',forbidden:'Acesso restrito'},rules:['ADM-001','ADM-002','ADM-004','AUTH-008','PRIV-004'],refs:['tournaments/administration.md','identity/authentication-and-access.md','tournaments/consent-and-privacy.md'],notes:['Staff tem acesso global, sem atribuição por torneio. Controles continuam limitados pelas regras de domínio.','Não propõe controle genérico para editar status. Exportações ficam fora desta primeira entrega.'],render:staffQueue},
 {id:'WF-10',title:'16 · Revisar pagamento',phase:'Primeira entrega',role:'Staff (admin)',states:{available:'Vaga disponível',full:'Sem vaga disponível',reject:'Solicitar novo comprovante',late:'Pix após o prazo',minor:'Documentação de menor',race:'Vaga ocupada durante análise',changed:'Evidência alterada',notification:'Decisão salva · e-mail não enviado',loading:'Carregando',error:'Falha de carregamento',forbidden:'Acesso restrito'},rules:['PAY-004','PAY-005','PAY-011','PAY-013','CAP-003','ADM-005','PRIV-010'],refs:['tournaments/payments-and-confirmation.md','tournaments/administration.md','tournaments/consent-and-privacy.md','tournaments/capacity-and-waitlist.md'],notes:['Aprovar pagamento confere elegibilidade/documentação e capacidade no backend, atomicamente.','Lotação muda o resultado para espera, nunca para overbooking. Arquivo não comprova transferência por si só.','Recusa precisa de motivo e notificação; não cancela a inscrição. Staff vê histórico de evidências.','Ações são simulações locais. Não há dados, documentos ou recibos reais.'],render:staffReview},
 {id:'WF-11',title:'17 · Seleção da lista de espera',phase:'Extensão de torneios',role:'Staff (admin)',states:{seat:'Uma vaga disponível',full:'Sem vaga disponível'},rules:['CAP-003','CAP-005','CAP-009','ADM-006'],refs:['tournaments/capacity-and-waitlist.md','tournaments/administration.md'],notes:['Capacidade inicial já é protegida; esta interface mais ampla de operação é uma extensão.','Não ordenar por prioridade de fila nem criar convites com prazo. A seleção é decisão explícita de staff.','Pagamento já aprovado: a ação é confirmar participação, não cobrar ou aprovar novamente.'],render:waitlist},
 {id:'WF-12',title:'14 · Configuração do torneio',phase:'Extensão de torneios',role:'Staff (admin)',states:{edit:'Editar informações',create:'Criar torneio',capacityerror:'Capacidade abaixo dos confirmados',saved:'Configuração salva',policyempty:'Documentos ainda não enviados',policyuploading:'Enviando regulamento',policyerror:'Falha ao substituir regulamento',policysaved:'Regulamento substituído',policyadditional:'Documento adicional',tagadd:'Adicionar tag ao torneio',tagrename:'Renomear tag',tagdelete:'Confirmar exclusão de tag',taginuse:'Exclusão impedida · tag em uso',tagdeleted:'Tag removida do torneio',productcreate:'Criar com produtos',productempty:'Sem produtos reutilizáveis',productinvalid:'Produto inválido',producterror:'Falha ao salvar produto',productloading:'Carregando produtos',productloaderror:'Falha ao carregar produtos',productsaving:'Salvando produtos',productsaved:'Produtos salvos'},rules:['CAT-008','CAT-009','CAP-009','ADM-008','ADM-010'],refs:['tournaments/catalog.md','tournaments/administration.md','tournaments/capacity-and-waitlist.md'],notes:['Não adiciona ciclo rascunho/publicado/arquivado ao recurso Tournament.','Notificações por alterações foram adiadas em #75, apesar de CAT-008 e ADM-010. Os documentos ficam depois dos dados e das tags. A substituição de uma política preserva as versões vinculadas a aceites anteriores.','Capacidade em branco significa ilimitada. Não há override abaixo dos confirmados.'],render:eventSettings},
 {id:'WF-13',title:'10 · Cancelamento e reembolso',phase:'Jornada de torneios',role:'Participante / staff',states:{confirm:'Solicitar cancelamento pago',unpaid:'Cancelamento sem pagamento',pending:'Cancelado, reembolso pendente',refunded:'Reembolso concluído',queue:'Fila de reembolsos da equipe',staff:'Registrar devolução pela equipe'},rules:['REG-013','REG-016','PAY-009','PAY-012','ADM-006','ADM-009'],refs:['tournaments/registration.md','tournaments/payments-and-confirmation.md','tournaments/administration.md'],notes:['Cancelamento libera a vaga imediatamente. Reembolso é uma dimensão separada da participação.','Reembolso exato do valor recebido em até 10 dias úteis. Sem transferência automática.','Sem botão Reabrir. Nova inscrição pode ser criada mesmo com reembolso anterior pendente.'],render:refund},
 {id:'WF-14',title:'20 · Resultados e participantes',phase:'Extensão de torneios',role:'Visitante / membro',states:{unavailable:'Resultados indisponíveis',published:'Área de resultados publicados',directory:'Lista limitada de participantes',restricted:'Evento interno — acesso negado'},rules:['RES-001','RES-003','RES-004','RES-AC-002','PRIV-006'],refs:['tournaments/results.md','tournaments/consent-and-privacy.md'],notes:['RES-Q1–Q4 permanecem abertas: não desenhar placar ao vivo, ranking, chave, importação ou publicação como decisão aprovada.','Área publicada é um contêiner sem formato definido. Diretório usa apenas nome, equipe, cidade/país e confirmação.','Diretório mostrado em contexto autenticado; resultados públicos não expõem registros privados.'],render:results},
 {id:'WF-15',title:'21 · Associação e mensalidades',phase:'Futuro · conceito',role:'Membro da guilda',states:{concept:'Estrutura sem política definida'},rules:['MEM-001','MEM-002','MEM-003','MEM-004','MEM-006'],refs:['membership/overview.md'],notes:['MEM-Q1–Q5 bloqueiam vocabulário de situação, cálculo e cobrança. Não supor mensalidade, inadimplência ou período.','Não há pagar agora, cobrança recorrente ou débito automático. Pagamento de torneio não muda mensalidade.','Exceções e descontos estão reservados como contexto futuro, não regras calculadas.'],render:membership},
 {id:'WF-17',title:'01 · Início autenticado',phase:'Início',role:'Pessoa autenticada',states:{current:'Atual · conta',currentadmin:'Atual · admin',list:'Proposta · com inscrições',empty:'Proposta · sem inscrições',loading:'Proposta · carregando',error:'Proposta · falha',admin:'Proposta · admin'},rules:['AUTH-002','AUTH-008','REG-008'],refs:['identity/authentication-and-access.md','tournaments/registration.md'],notes:['A tela atual oferece senha, inscrição Monomachia, saída e conferência de pagamentos para admins.','A lista entre torneios e o painel da Guilda são propostas, não recursos entregues. Ver issue #63.','Os dados e ações neste protótipo são ilustrativos.'],render:home},
 {id:'WF-18',title:'11 · Painel da Guilda',phase:'Proposta',role:'Staff (admin)',states:{overview:'Painel',loading:'Carregando',error:'Falha de carregamento',forbidden:'Acesso restrito'},rules:['AUTH-008','ADM-001'],refs:['identity/authentication-and-access.md','tournaments/administration.md'],notes:['Acesso administrativo global. O backend é responsável pela autorização.','Painel proposto em #75. Gestão de usuários é proposta em #74.'],render:staffHome},
 {id:'WF-19',title:'12 · Torneios da equipe',phase:'Proposta',role:'Staff (admin)',states:{list:'Lista',empty:'Sem torneios',loading:'Carregando',error:'Falha',forbidden:'Acesso restrito'},rules:['AUTH-008','CAT-009'],refs:['identity/authentication-and-access.md','tournaments/catalog.md'],notes:['Lista e criação propostas em #75. Dados fictícios.'],render:staffTournaments},
 {id:'WF-20',title:'13 · Detalhes e exclusão',phase:'Proposta',role:'Staff (admin)',states:{detail:'Detalhes',confirm:'Confirmar exclusão',deleted:'Exclusão concluída',registered:'Exclusão recusada · há inscrições',closed:'Exclusão recusada · inscrições encerradas',error:'Falha na exclusão',offerempty:'Sem ofertas',offeradd:'Adicionar oferta',offersearch:'Busca sem resultados',offeredit:'Editar produto',offerprice:'Alterar preço',offerdeactivate:'Desativar produto',offererror:'Falha ao salvar alteração',offersaving:'Salvando alteração',offersaved:'Alteração salva'},rules:['AUTH-008','CAT-009','CAT-010'],refs:['identity/authentication-and-access.md','tournaments/catalog.md'],notes:['#75 impede exclusão com qualquer inscrição, mesmo após encerramento.','Resultados de partidas futuros também impedirão exclusão.'],render:staffTournamentDetail},
 {id:'WF-21',title:'18 · Usuários e níveis de acesso',phase:'Proposta',role:'Staff (admin)',states:{list:'Lista',filtered:'Filtro aplicado',empty:'Nenhum resultado',loading:'Carregando',error:'Falha',forbidden:'Acesso restrito'},rules:['AUTH-007','AUTH-008'],refs:['identity/authentication-and-access.md'],notes:['#74 prevê três níveis de acesso e permite autodespromoção e despromoção do último admin.','Somente admins. O backend valida a autorização e não confia em metadados editáveis pelo usuário.'],render:staffUsers},
 {id:'WF-22',title:'19 · Alterar nível de acesso',phase:'Proposta',role:'Staff (admin)',states:{choose:'Escolher nível de acesso',confirm:'Confirmar alteração',self:'Confirmar autodespromoção',last:'Confirmar último admin',success:'Alteração concluída',error:'Falha ao alterar'},rules:['AUTH-007','AUTH-008'],refs:['identity/authentication-and-access.md'],notes:['#74 permite autodespromoção e remoção do último admin. Supabase é o caminho de recuperação.','Tokens existentes podem conservar o nível de acesso anterior até atualização ou expiração.'],render:staffRole},
 {id:'WF-16',title:'22 · Inventário da guilda',phase:'Futuro · conceito',role:'Staff (admin)',states:{list:'Lista de equipamentos',edit:'Editar registro'},rules:['INV-001','INV-003','INV-004','INV-005','INV-006','INV-007'],refs:['inventory/overview.md'],notes:['Somente admins podem ver e gerenciar. Membros usam fisicamente equipamentos, mas não acessam esta interface.','Apenas equipamento, tipo, quantidade e condição. Sem empréstimos, reservas, localização, manutenção ou patrimônio por unidade.','Retirar do inventário é uma intenção; arquivamento versus exclusão fica para implementação.'],render:inventory}
];
let current = screens[0], state = 'public', currentEvent = 'mono';
const eventTitle = () => currentEvent === 'mono' ? 'Monomachia Karlbrüder 2027' : 'Encontro de esgrima da guilda';
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tag = (text,color='gray') => `<span class="tag ${color}">${text}</span>`;
const button = (text,id,variant='',extra='') => `<button type="button" class="button ${variant}" ${id ? `data-go="${id}"` : ''} ${extra}>${text}</button>`;
const noticeMarks = {info: 'i', success: '✓', error: '!', neutral: '–'};
const notice = (title, text, kind = '', id = '') => `<div class="notice ${kind}"${id ? ` id="${id}"` : ''}>
  <span class="notice-mark" aria-hidden="true">${noticeMarks[kind] ?? '!'}</span>
  <div><strong>${title}</strong>${text}</div>
</div>`;
const field = (label,value='',opts='') => `<label class="field">${label}<input ${opts} value="${esc(value)}"></label>`;
const textarea = (label,value='') => `<label class="field">${label}<textarea>${esc(value)}</textarea></label>`;
const selectField = (label,options) => `<label class="field">${label}<select>${options.map(v=>`<option>${v}</option>`).join('')}</select></label>`;
const facts = rows => `<dl class="facts">${rows.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>`;
const intro = (category,title,sub='',action='') => `<div class="page-intro"><div><p class="overline">${category}</p><h2>${title}</h2>${sub?`<p class="muted no-margin">${sub}</p>`:''}</div>${action}</div>`;
const file = (name='comprovante-exemplo.pdf',details='Último envio · exemplo fictício') => `<div class="file"><span class="file-icon">PDF</span><div><p><strong>${name}</strong></p><p class="muted">${details}</p></div><button type="button" class="text-button" data-dialog="proof" style="margin-left:auto">Visualizar</button></div>`;
const upload = (label,proof=true) => `<div class="upload"><div class="icon" aria-hidden="true">↑</div><label>${label}<input type="file" ${proof?'accept="application/pdf,image/jpeg,image/png"':''} aria-label="${label}"></label><p>${proof?'PDF, JPEG ou PNG · até 10 MB':'Termo assinado e digitalizado · formatos a definir'}</p></div>`;
const checkbox = label => `<label class="check"><input type="checkbox"> <span>${label}</span></label>`;
function registrationDeclarations() {
  const [[, rulesFile], [, cancellationFile]] = athletePolicyFiles();
  const declarations = [
    ['Li e aceito o regulamento do torneio, incluindo as condições de transmissão oficial e publicação dos resultados.', rulesFile && documentPreviewLink('Regulamento', rulesFile)],
    ['Li a política de cancelamento, reembolso e desclassificação.', cancellationFile && documentPreviewLink('Política de cancelamento', cancellationFile)],
    ['Li as informações sobre o tratamento dos dados e a visibilidade de participação e resultados.', documentPreviewLink('Política de Privacidade')],
    ['Declaro que as informações fornecidas são verdadeiras.'],
    ['Li a declaração de ciência dos riscos da esgrima histórica.'],
    ['Declaro possuir o equipamento obrigatório.'],
    ['Li e aceito a declaração de aptidão física.'],
  ];
  return `<h4 class="registration-declarations-title">Declarações</h4>
    ${declarations.map(([text, link], index) => `<div class="check">
      <input id="registration-declaration-${index}" type="checkbox" ${invalidRegistrationField()}>
      <span><label for="registration-declaration-${index}">${text}</label>${link ? ' ' + link : ''}</span>
    </div>`).join('')}`;
}
const navigationLabels = {
  'pt-BR': {
    catalog: 'Karlbrüder, catálogo', menu: 'Menu', application: 'Aplicação',
    tournaments: 'Torneios', registrations: 'Minhas inscrições', administration: 'Administração',
    home: 'Início', signIn: 'Entrar', account: 'Minha conta', password: 'Alterar senha', signOut: 'Sair', theme: 'Tema', language: 'Idioma',
    light: 'Claro', dark: 'Escuro', system: 'Sistema', guildPanel: 'Painel da Guilda',
    overview: 'Visão geral', payments: 'Pagamentos', refunds: 'Reembolsos', users: 'Usuários',
  },
  en: {
    catalog: 'Karlbrüder, catalog', menu: 'Menu', application: 'Application',
    tournaments: 'Tournaments', registrations: 'My registrations', administration: 'Administration',
    home: 'Home', signIn: 'Sign in', account: 'My account', password: 'Change password', signOut: 'Sign out', theme: 'Theme', language: 'Language',
    light: 'Light', dark: 'Dark', system: 'System', guildPanel: 'Guild panel',
    overview: 'Overview', payments: 'Payments', refunds: 'Refunds', users: 'Users',
  },
};

function applyNavigationLanguage() {
  const language = wireframePreferences.language;
  const labels = navigationLabels[language];
  for (const region of document.querySelectorAll('.app-header, .staff-nav')) {
    region.lang = language;
    for (const element of region.querySelectorAll('[data-nav-text]')) {
      element.textContent = labels[element.dataset.navText];
    }
    for (const element of [region, ...region.querySelectorAll('[data-nav-label]')]) {
      if (element.dataset.navLabel) element.setAttribute('aria-label', labels[element.dataset.navLabel]);
    }
  }
}

const headerIconPaths = {
  light: '<circle cx="10" cy="10" r="3.25"/><path d="M10 1.75v2m0 12.5v2m8.25-8.25h-2m-12.5 0h-2m14.1-5.85-1.4 1.4m-8.9 8.9-1.4 1.4m11.7 0-1.4-1.4m-8.9-8.9-1.4-1.4"/>',
  dark: '<path d="M16.9 12A7.2 7.2 0 0 1 8 3.1 7.3 7.3 0 1 0 16.9 12Z"/>',
  system: '<rect x="2.5" y="3" width="15" height="10.5" rx=".5"/><path d="M10 13.5V17m-3.5 0h7"/>',
  language: '<circle cx="10" cy="10" r="7.5"/><ellipse cx="10" cy="10" rx="3.25" ry="7.5"/><path d="M2.7 10h14.6"/>',
  menu: '<path d="M3 5h14M3 10h14M3 15h14"/>',
  chevron: '<path d="m5 7.5 5 5 5-5"/>',
  password: '<circle cx="7" cy="8" r="3.5"/><path d="m9.5 10.5 7 7m-2.5-2.5 2.5-2.5"/>',
  signOut: '<path d="M8 3H4v14h4m0-7h9m-3-3 3 3-3 3"/>',
  check: '<path d="m4.5 10 3.5 3.5 7.5-7.5"/>',
};

function headerIcon(name, className = '') {
  return `<svg class="${className}" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"
    fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${headerIconPaths[name]}</svg>`;
}

function headerPreferences() {
  return `<button class="header-icon-button" type="button" data-preference-trigger="theme"
      aria-controls="theme-choices" aria-expanded="false">
      <span class="current-theme-icon"></span>
    </button>
    <div class="preference-popover" id="theme-choices" role="group" data-nav-label="theme" hidden>
      ${['light', 'dark', 'system'].map(mode => `<button type="button" class="preference-option" data-theme-choice="${mode}">
        ${headerIcon(mode)}<span data-nav-text="${mode}"></span>${headerIcon('check', 'preference-check')}
      </button>`).join('')}
    </div>
    <button class="header-icon-button language-trigger" type="button" data-preference-trigger="language"
      aria-controls="language-choices" aria-expanded="false">
      ${headerIcon('language')}<span class="language-code" aria-hidden="true"></span>${headerIcon('chevron', 'language-chevron')}
    </button>
    <div class="preference-popover" id="language-choices" role="group" data-nav-label="language" hidden>
      <button type="button" class="preference-option" lang="pt-BR" data-language-choice="pt-BR">
        Português${headerIcon('check', 'preference-check')}
      </button>
      <button type="button" class="preference-option" lang="en" data-language-choice="en">
        English${headerIcon('check', 'preference-check')}
      </button>
    </div>`;
}

function refreshHeaderPreferences() {
  const {theme, language} = wireframePreferences;
  const labels = navigationLabels[language];
  const languageName = language === 'en' ? 'English' : 'Português';
  const themeTrigger = document.querySelector('[data-preference-trigger="theme"]');
  const languageTrigger = document.querySelector('[data-preference-trigger="language"]');
  const themeLabel = `${labels.theme}: ${labels[theme]}`;
  const languageLabel = `${labels.language}: ${languageName}`;

  const accountTrigger = document.querySelector('[data-preference-trigger="account"]');
  if (accountTrigger) {
    const initials = accountTrigger.dataset.accountInitials;
    accountTrigger.setAttribute('aria-label', initials ? `${labels.account} · ${initials}` : labels.account);
  }
  themeTrigger.setAttribute('aria-label', themeLabel);
  themeTrigger.title = themeLabel;
  themeTrigger.querySelector('.current-theme-icon').innerHTML = headerIcon(theme);
  languageTrigger.setAttribute('aria-label', languageLabel);
  languageTrigger.title = languageLabel;
  languageTrigger.querySelector('.language-code').textContent = language === 'en' ? 'EN' : 'PT';

  for (const option of document.querySelectorAll('[data-theme-choice], [data-language-choice]')) {
    option.setAttribute('aria-pressed', String(option.dataset.themeChoice === theme || option.dataset.languageChoice === language));
  }
}

let journeyRole;

function headerRole() {
  if (current.id === 'WF-03') {
    return state === 'changepassword' ? journeyRole || 'athlete' : 'guest';
  }
  if (state === 'restricted' || state === 'forbidden') return 'athlete';
  if (current.role.startsWith('Staff') ||
    (current.id === 'WF-17' && ['admin', 'currentadmin'].includes(state)) ||
    (current.id === 'WF-13' && ['queue', 'staff'].includes(state))) return 'staff';
  if (journeyRole && journeyRole !== 'guest') return journeyRole;
  if ((current.id === 'WF-01' && state !== 'member') ||
    (current.id === 'WF-02' && !isAthleteTournamentDetail()) ||
    (current.id === 'WF-14' && state !== 'directory')) return 'guest';
  return 'athlete';
}

function accountMenu(staff) {
  const name = staff ? 'Bruno Exemplo' : 'Ana Exemplo';
  const email = staff ? 'bruno@example.test' : 'ana@example.test';
  const avatar = staff
    ? '<svg viewBox="0 0 32 32" aria-hidden="true" class="avatar"><circle cx="16" cy="16" r="16" fill="#ddd1b9"/><path d="M6 32c0-7 4-11 10-11s10 4 10 11" fill="#642226"/><circle cx="16" cy="14" r="6" fill="#ad775c"/><path d="M10 13c0-6 4-8 8-7 3 1 4 3 4 6-3 0-5-1-6-3-2 3-3 4-6 4" fill="#202326"/></svg>'
    : '<span class="avatar" aria-hidden="true">AE</span>';
  return `<div class="header-account">
    <button class="header-icon-button account-trigger" type="button" data-preference-trigger="account" data-account-initials="${staff ? '' : 'AE'}"
      aria-controls="account-choices" aria-expanded="false">
      ${avatar}
    </button>
    <div class="preference-popover account-popover" id="account-choices" hidden>
      <div class="account-menu-identity"><strong>${name}</strong><small>${email}</small></div>
      <a href="#WF-03/changepassword" class="account-action">${headerIcon('password')}<span data-nav-text="password"></span></a>
      <a href="#WF-03/login" class="account-action account-sign-out">${headerIcon('signOut')}<span data-nav-text="signOut"></span></a>
    </div>
  </div>`;
}

function header() {
  const role = headerRole();
  const staff = role === 'staff';
  const guest = role === 'guest';
  const home = staff ? '#WF-17/currentadmin' : '#WF-17/current';
  const active = id => current.id === id ? 'aria-current="page"' : '';
  const staffSection = staff && (current.role.startsWith('Staff') || (current.id === 'WF-13' && ['queue', 'staff'].includes(state)));
  return `<header class="app-header">
    <a class="brand" href="${guest ? '#WF-01' : home}" aria-label="Karlbrüder">
      <img src="${A}logos/logo_white_with_name.png" alt="">
    </a>
    <button class="app-menu-toggle header-icon-button" type="button" aria-controls="app-nav"
      aria-expanded="false" data-nav-label="menu">
      ${headerIcon('menu')}
    </button>
    <nav id="app-nav" class="app-nav" data-nav-label="application">
      ${guest ? '' : `<a href="${home}" data-nav-text="home" ${active('WF-17')}></a>`}
      <a href="#WF-01" data-nav-text="tournaments" ${active('WF-01')}></a>
      ${guest ? `<a href="#WF-03/login" data-nav-text="signIn" ${current.id === 'WF-03' && state === 'login' ? 'aria-current="page"' : ''}></a>`
        : `<a href="#WF-07" data-nav-text="registrations" ${active('WF-07')}></a>`}
      ${staff ? `<a href="#WF-19/list" data-nav-text="administration" ${active('WF-19') || (staffSection ? 'aria-current="location"' : '')}></a>` : ''}
    </nav>
    <div class="header-tools">
      ${headerPreferences()}
      ${guest ? '' : accountMenu(staff)}
    </div>
  </header>`;
}
function catalog(){if(state==='empty'||state==='error')return `<div class="app-body">${intro('Circuito Karlbrüder','Torneios da guilda')}<div class="empty"><h3>${state==='empty'?'Nenhum torneio disponível':'Não foi possível carregar os torneios'}</h3><p class="muted">${state==='empty'?'Novos encontros aparecerão aqui quando estiverem disponíveis.':'Tente novamente. Nenhum dado de inscrição foi alterado.'}</p>${button('Voltar ao catálogo','WF-01')}</div></div>`;return `<div class="app-body">${intro('Esgrima histórica · Karlbrüder','Encontre seu próximo desafio.','Torneios, encontros e experiências para quem vive a esgrima.')}<div class="hero"><div>${tag('Inscrições abertas','wine')}<h2>Monomachia<br>Karlbrüder 2027</h2><p class="sub">Um encontro de técnica, respeito e espírito de guilda.</p><div class="hero-meta"><span>17 jan 2027</span><span>Longsword</span><span>Evento público</span></div><div class="actions">${button('Conhecer o torneio →','WF-02','','data-event="mono"')}</div></div><div class="event-mark"><img src="${A}monomachia/logo.svg" alt="Identidade Monomachia"></div></div><div class="panel-heading"><h3>Todos os torneios</h3><span class="small muted">${state==='member'?'3 eventos visíveis para membros':'2 eventos públicos · exemplo'}</span></div><div class="grid-2"><article class="event-card"><div class="cover wine"><strong>MONOMACHIA</strong><span class="small">2027</span></div><div class="content">${tag('Inscrições abertas','green')}<h3>Monomachia Karlbrüder</h3><p class="muted">Longsword · 17 de janeiro de 2027<br>Local a confirmar</p><footer><span>3 opções de inscrição</span>${button('Ver detalhes','WF-02','secondary','data-event="mono"')}</footer></div></article><article class="event-card"><div class="cover"><strong>Encontros da guilda</strong><span class="small">EXEMPLO</span></div><div class="content">${tag('Data a confirmar')}<h3>Encontro de esgrima da guilda</h3><p class="muted">Evento fictício para demonstrar o catálogo<br>Data, local e valor a confirmar</p><footer><span>Evento público</span>${button('Ver detalhes','WF-02','secondary','data-event="other" data-state="unknown"')}</footer></div></article>${state==='member'?`<article class="event-card"><div class="cover"><strong>Encontro interno</strong><span class="small">EXEMPLO</span></div><div class="content">${tag('Somente membros','blue')}<h3>Treino competitivo interno</h3><p class="muted">Acesso de membros da guilda e staff.</p>${button('Ver detalhes','','secondary','data-dialog="internal"')}</div></article>`:''}</div></div>`;}
function detail(){const full=state==='full',unknown=state==='unknown',closed=state==='closed',athlete=isAthleteTournamentDetail();return `<div class="app-body"><a class="return-link" href="#WF-01">← Todos os torneios</a><div class="hero"><div><p class="overline">Karlbrüder apresenta</p><h2>${eventTitle()}</h2><div class="hero-meta"><span>${currentEvent==='mono'?'17 jan 2027':'Data a confirmar'}</span><span>Longsword</span><span>Público</span></div></div><div class="event-mark"><img src="${A}${currentEvent==='mono'?'monomachia/logo.svg':'logos/logo_white.png'}" alt="Marca do evento"></div></div>${full?notice('Vagas preenchidas. Inscrições continuam abertas.','Se o pagamento for aprovado sem uma vaga disponível, sua inscrição entrará na lista de espera. Inscrever-se e enviar comprovante não reservam vaga.'):closed?notice('Inscrições encerradas','Não é possível criar uma nova inscrição. Inscrições existentes continuam acessíveis.','neutral'):''}<div class="split"><section><div class="panel"><h3>Sobre o torneio</h3><p>Encontre as informações de participação, consulte o regulamento e acompanhe sua inscrição pela plataforma Karlbrüder.</p>${facts([['Modalidade','Longsword'],['Local','A confirmar'],['Programação','A confirmar'],['Participação','Inscrição individual e pessoal']])}</div><div class="panel"><h3>Antes de se inscrever</h3>${athleteDocumentSection(athlete)}<details><summary>Equipamentos obrigatórios</summary><p class="muted">A lista final de equipamentos será informada pela equipe.</p></details><p class="small muted" style="margin-top:15px">Menores precisam de termo assinado pelo responsável, acompanhamento no evento e conferência presencial dos documentos de ambos.</p></div></section><aside><div class="panel"><span class="inline-label">INSCRIÇÃO</span><div class="amount">${currentEvent==='mono'?'3 opções':'A confirmar'}</div><p class="small muted">${currentEvent==='mono'?'Social, Plena e Plus · escolha na inscrição':'Valor ainda não informado'}</p>${facts([['Período',unknown?'A confirmar':'01 nov – 10 jan · exemplo'],['Fuso','GMT-3'],['Disponibilidade',closed?'Encerrada':full?'Sem vaga confirmável':unknown?'A confirmar':'Inscrições abertas']])}<div class="actions">${closed||unknown?'<button class="button wide" disabled>Inscrições indisponíveis</button>':button(full?'Continuar com ciência da espera':'Inscrever-me',athlete?'WF-04':'WF-03','wide',athlete&&state!=='athlete'?`data-state="${state}"`:'')}</div><p class="small muted" style="margin-top:12px">${athlete?'Você só pode inscrever a si mesmo.':'Entre ou crie uma conta para se inscrever. Você só pode inscrever a si mesmo.'}</p></div></aside></div></div>`;}
function home(){
 const currentHome=['current','currentadmin'].includes(state), admin=state==='admin';
 if(currentHome)return `<div class="app-body">${intro('Área pessoal','Olá, Ana.','Ana Exemplo · conta fictícia')}<div class="split"><section><div class="home-section-heading"><p class="overline">SEU TORNEIO</p><h3>Inscrição</h3></div><article class="home-registration"><div class="home-registration-heading"><div><p class="overline">MONOMACHIA</p><h3><a href="#WF-04">Inscrição Monomachia</a></h3></div></div><p class="muted">Acesse o torneio para se inscrever ou acompanhar sua inscrição.</p><a class="screen-link" href="#WF-04">Acessar inscrição →</a></article></section><aside>${state==='currentadmin'?`<div class="panel home-shortcuts"><p class="overline">SOMENTE ADMIN</p><h3>Guilda</h3><ul><li><a href="#WF-09"><span><strong>Conferência de pagamentos</strong><small>Revise comprovantes pendentes</small></span><span aria-hidden="true">→</span></a></li></ul></div>`:''}</aside></div></div>`;
 const registration=state==='loading'?'<p role="status">Carregando inscrições…</p>':state==='error'?`<div role="alert"><h3>Não foi possível carregar suas inscrições.</h3><p class="muted">Tente novamente para consultar a situação.</p>${button('Tentar novamente','WF-17','secondary','data-state="list"')}</div>`:state==='empty'?`<div class="home-empty"><h3>Nenhuma inscrição ainda.</h3><p class="muted">Quando você se inscrever, poderá acompanhar sua participação aqui.</p><a class="screen-link" href="#WF-04">Inscrição Monomachia →</a></div>`:`<ul class="home-registrations"><li><article class="home-registration"><div class="home-registration-heading"><div><p class="overline">TORNEIO · EXEMPLO</p><h3><a href="#WF-06">Monomachia Karlbrüder 2027</a></h3></div>${tag('Em análise','blue')}</div><p class="muted">Longsword · 17 jan 2027</p><div class="home-next"><strong>Próximo passo</strong><span>A equipe está conferindo seu comprovante. Sua vaga ainda não está reservada.</span></div><a class="screen-link" href="#WF-06">Acompanhar inscrição →</a></article></li></ul>`;
 return `<div class="app-body">${intro('Área pessoal','Olá, Ana.','Acompanhe seus torneios e cuide da sua conta.')}${notice('Proposta para revisão','A lista pessoal entre torneios e o painel da Guilda ainda não estão implementados.','info')}<div class="split"><section><div class="home-section-heading"><div><p class="overline">SEUS TORNEIOS</p><h3>Minhas inscrições</h3></div></div>${registration}</section><aside><div class="panel home-shortcuts"><p class="overline">ACESSO RÁPIDO</p><h3>Seu torneio</h3><ul><li><a href="#WF-04"><span><strong>Inscrição Monomachia</strong><small>Acesse o torneio</small></span><span aria-hidden="true">→</span></a></li></ul></div>${admin?`<div class="panel home-shortcuts"><p class="overline">SOMENTE ADMIN</p><h3>Guilda</h3><ul><li><a href="#WF-18"><span><strong>Painel da Guilda</strong><small>Torneios, pagamentos e usuários</small></span><span aria-hidden="true">→</span></a></li></ul><p class="small muted">Painel da Guilda · proposta</p></div>`:''}</aside></div></div>`;
}
function auth(){const signup=state==='signup',recover=state==='recover',reset=state==='reset',changepassword=state==='changepassword',verify=state==='verify';return `<div class="auth-layout"><section class="auth-story"><p class="overline">Sua próxima experiência</p><h2>Da primeira inscrição<br>ao próximo encontro.</h2><p>Uma conta para acompanhar seus torneios na Karlbrüder.</p><hr class="divider">${changepassword?'<p class="small">Você já está autenticada.</p>':'<p class="small">Você está continuando a inscrição em<br><strong>'+eventTitle()+'</strong></p>'}</section><section class="auth-form">${intro('Sua conta',verify?'Confira seu e-mail':recover?'Recuperar acesso':reset?'Escolha uma nova senha':changepassword?'Alterar senha':signup?'Faça parte.':'Boas-vindas de volta.')} ${state==='expired'?notice('Sua sessão expirou','Entre novamente para continuar no torneio selecionado.','info'):''}${state==='unavailable'?notice('Serviço temporariamente indisponível','Não foi possível conectar ao serviço de acesso. Tente novamente em instantes.','error'):''}${verify?`${notice('Enviamos as instruções de verificação','Consulte sua caixa de entrada e siga o link para ativar o acesso.','success')}<p class="muted">Após verificar seu e-mail, entre para continuar.</p>${button('Voltar para entrar','WF-03','wide')}`:reset||changepassword?`${field('Nova senha','','type="password" autocomplete="new-password"')}${field('Repita a nova senha','','type="password" autocomplete="new-password"')}${button('Atualizar senha',changepassword?'WF-17':'WF-03','wide')}`:`${!recover?button('Continuar com Google','WF-04','secondary wide')+'<div class="or">ou use seu e-mail</div>':''}${field('E-mail','','type="email" placeholder="voce@exemplo.com" autocomplete="email"')}${!recover?field('Senha','','type="password" autocomplete="current-password"'):''}${button(recover?'Enviar link de recuperação':signup?'Criar minha conta':'Entrar',recover?'':signup?'WF-03':'WF-04','wide',recover?'data-dialog="recovery"':signup?'data-state="verify"':'')}${!signup&&!recover?'<div class="actions"><button class="text-button" data-go="WF-03" data-state="recover">Esqueci minha senha</button></div>':''}<hr class="divider"><p class="small">${signup||recover?'Já tem acesso?':'Ainda não tem conta?'} <button class="text-button" data-go="WF-03" data-state="${signup||recover?'login':'signup'}">${signup||recover?'Entrar':'Criar conta'}</button></p>`}</section></div>`;}
function invalidRegistrationField() {
  return current.id === 'WF-04' && state === 'invalid'
    ? 'aria-invalid="true" aria-describedby="registration-validation"'
    : '';
}
function identityFields(edit=false){return `<div class="form-grid">${field('Nome completo *','Ana Exemplo','autocomplete="name"')}${field('Nome social (opcional)','','placeholder="Como prefere ser chamada"')}${field('E-mail da inscrição *','ana@example.com',edit?'type="email"':'type="email" readonly')}${field('Telefone *','','type="tel" placeholder="DDD + número"')}${selectField('Documento *',['CPF','Passaporte'])}${field('Número do documento *','','placeholder="Informe o documento" '+invalidRegistrationField())}${field('Data de nascimento *','','type="date"')}${field('País *','Brasil')}${field('Cidade *','')}${field('Estado / província (opcional)','')}</div>`;}
function sportFields(){return `<div class="form-grid">${field('Tempo de prática em HEMA','','placeholder="Duração em anos / meses"')}${field('Ano de início em HEMA','','inputmode="numeric" placeholder="Ou informe o ano de início"')}<p class="small muted full">Informe tempo de prática, ano de início ou ambos.</p>${field('Torneios anteriores *','0','type="number" min="0"')}${field('Escola / equipe (opcional)','')}${field('Instrutor responsável (opcional)','')}${field('Referência HEMA Ratings (opcional)','')}${field('Lateralidade (opcional)','','placeholder="Ex.: destra"')}${field('Categoria / caso especial (opcional)','','placeholder="Sujeito à avaliação da equipe"')}</div>`;}
function emergency(){return `<div class="form-grid">${field('Contato de emergência *','',`placeholder="Nome completo" ${invalidRegistrationField()}`)}${field('Telefone de emergência *','',`type="tel" ${invalidRegistrationField()}`)}</div>`;}
function registration(){let n='';if(state==='full')n=notice('O torneio está lotado','O envio da inscrição não coloca você na lista de espera. Após pagamento aprovado, a equipe confirma se houver vaga ou registra a espera.');if(state==='invalid')n=notice('Revise os campos antes de continuar','Informe seu documento, contato de emergência e os aceites obrigatórios. Nenhuma inscrição foi criada.','error','registration-validation');if(state==='duplicate')n=notice('Já existe uma inscrição ativa','Encontramos uma inscrição para esta conta, e-mail ou documento neste torneio. Retorne à inscrição deste torneio para acompanhá-la.','error');if(state==='stale')n=notice('Sua opção mudou','Confira as opções atualizadas e selecione novamente. Seus dados e o termo selecionado permanecem no formulário.','info');if(state==='optionerror')n=notice('Não foi possível atualizar as opções','Seus dados e o termo selecionado permanecem no formulário. Tente novamente.','error')+button('Tentar novamente','WF-04','secondary','data-state="stale"');if(state==='closed')n=notice('As inscrições foram encerradas','O período terminou ou a equipe encerrou novas inscrições. Seus dados não foram enviados.','error');return `<div class="app-body"><a href="#WF-02/${['documentspartial','documentsmissing'].includes(state)?state:'athlete'}" class="return-link">← ${eventTitle()}</a>${intro('Inscrição pessoal','Seu próximo passo começa aqui.','Campos com * são obrigatórios. Você está se inscrevendo para si.')}<ol class="stepper"><li class="active"><span>1</span> Inscrição</li><li><span>2</span> Pix e comprovante</li><li><span>3</span> Acompanhamento</li></ol>${n}<div class="split"><section>${currentEvent==='mono'?`<div class="panel">${registrationOptionChoices()}${state==='unavailable'?'<p>Inscrição anterior · indisponível para novas inscrições</p>':''}</div>`:''}<div class="panel"><h3><span class="form-section-number">01</span> Dados pessoais</h3>${identityFields()}<p class="small muted">O e-mail corresponde à sua conta. Seus dados privados não aparecem na lista de participantes.</p></div><div class="panel"><h3><span class="form-section-number">02</span> Sua experiência</h3>${sportFields()}</div><div class="panel"><h3>Suas tags</h3>${tagChoices(false)}<p class="small muted">Você pode alterar sua seleção até o encerramento da janela de inscrições. A equipe verificará a elegibilidade no evento.</p></div>${registrationDocumentCard()}<div class="panel"><h3><span class="form-section-number">03</span> Segurança e participação</h3>${emergency()}${state==='minor'?notice('Participação de menor de idade','Envie o termo assinado pelo responsável. O termo informa se haverá transmissão da categoria e quem poderá consultar seu nome e seus resultados. No evento, você deverá estar acompanhado e ambos apresentarão seus documentos para conferência.','info')+upload('Termo de responsabilidade assinado',false):''}${registrationDeclarations()}</div></section><aside><div class="panel tinted"><h3>${eventTitle()}</h3><p id="registration-option-summary">${currentEvent==='mono'?(['stale','optionerror'].includes(state)?'Selecione uma opção':registrationOptions[selectedRegistrationOption].name+' · '+registrationOptions[selectedRegistrationOption].price):''}</p>${facts([['Modalidade','Longsword'],['Data',currentEvent==='mono'?'17 jan 2027':'A confirmar']])}<p class="small muted" style="margin-top:15px">Sua vaga só é confirmada após a análise da equipe, conforme a disponibilidade.</p>${button('Enviar minha inscrição','WF-05','wide',state==='closed'?'disabled':'')}<p class="small muted" style="margin-top:13px">Não há salvamento automático de inscrição incompleta nesta proposta.</p></div></aside></div></div>`;}
function payment(){const replacing=state==='replace';const resubmitting=replacing||state==='rejected';return `<div class="app-body"><a href="#WF-07" class="return-link">← Minhas inscrições</a>${intro('Inscrição MONO2027001 · exemplo',replacing?'Substituir comprovante.':state==='rejected'?'Precisamos de outro comprovante.':'Inscrição recebida. Agora, o Pix.',eventTitle(),tag(replacing?'Nova evidência':state==='rejected'?'Reenvio solicitado':'Aguardando pagamento','amber'))}${replacing?notice('Envie uma nova evidência','A equipe analisará o novo arquivo. Substituir o comprovante não é realizar outro pagamento nem obter aprovação automática.','info'):state==='rejected'?notice('Comprovante recusado','Motivo de exemplo: não foi possível identificar o valor e o favorecido. Envie um novo arquivo. Você também recebe uma notificação.','error'):state==='fileerror'?notice('Este arquivo não foi aceito','Escolha PDF, JPEG ou PNG de até 10 MB. Nenhum novo comprovante foi armazenado.','error'):state==='late'?notice('O prazo de pagamento passou','A equipe avaliará manualmente a transferência. O prazo vencido não confirma nem cancela a inscrição automaticamente.'):notice('A inscrição ainda não garante vaga','Faça o pagamento via Pix e envie o comprovante. A equipe fará a conferência antes da confirmação.','info')}<div class="split"><section><div class="panel"><h3>1. ${resubmitting?'Confira o pagamento realizado':'Faça o Pix fora da plataforma'}</h3>${resubmitting?'<p class="small">O reenvio de um comprovante, por si só, não exige outra transferência. Confira os dados antes de enviar a evidência.</p>':''}<div class="amount">${currentEvent==='mono'?registrationOptions[selectedRegistrationOption].price:'Valor a confirmar'}</div><p class="small muted">${currentEvent==='mono'?registrationOptions[selectedRegistrationOption].name:'Valor ainda não informado'}</p>${facts([['Favorecido','[Conta recebedora configurada]'],['Chave Pix','[Chave a ser configurada]'],['Prazo','12 jan 2027 · exemplo']])}<p class="small muted" style="margin-top:16px">Confira os dados do favorecido no aplicativo do seu banco. Este wireframe não contém uma chave Pix utilizável.</p></div><div class="panel"><h3>2. Envie seu comprovante</h3>${resubmitting?file('comprovante-anterior.pdf',replacing?'Último envio · exemplo':'Último envio · recusado'):''}${upload('Selecionar comprovante')}${replacing?button('Enviar novo comprovante','','wide','data-dialog="replacement"'):button('Enviar comprovante','WF-06','wide','data-state="review"')}<p class="small muted" style="margin-top:13px">Enviar arquivo não realiza pagamento nem reserva vaga.</p></div></section><aside><div class="panel"><h3>Sua inscrição</h3>${facts([['Participante','Ana Exemplo'],['Número','MONO2027001'],['Evento',eventTitle()]])}<ol class="timeline"><li class="done">Inscrição recebida<small>Dados enviados para este torneio</small></li><li class="current">Enviar comprovante<small>Aguardando seu envio</small></li><li>Análise da equipe<small>Confirmação depende de elegibilidade e capacidade</small></li></ol></div></aside></div></div>`;}
function status(){const cfg=state==='confirmed'?['Inscrição confirmada.','Sua participação está confirmada. Consulte o regulamento e prepare seu equipamento.','Confirmada','green']:state==='waitlist'?['Pagamento aprovado. Aguardando vaga.','Você está na lista de espera, sem vaga confirmada. A equipe decide quem selecionar quando houver disponibilidade.','Lista de espera','amber']:['Recebemos seu comprovante.','A equipe vai conferir seu pagamento. Até a confirmação, nenhuma vaga está reservada.','Aguardando confirmação do pagamento','blue'];return `<div class="app-body"><a class="return-link" href="#WF-07">← Minhas inscrições</a>${intro('MONO2027001 · exemplo',cfg[0],eventTitle(),tag(cfg[2],cfg[3]))}<div class="split"><section><div class="panel"><div class="state-title"><span class="state-icon" aria-hidden="true">${state==='confirmed'?'✓':'◷'}</span><h3 class="no-margin">${cfg[2]}</h3></div><p>${cfg[1]}</p>${state==='waitlist'?notice('Não é necessário pagar novamente','Não há promoção automática, posição de prioridade ou prazo de chamada. A entrada na espera é comunicada por e-mail.'):''}${state==='confirmed'?notice('Se você for menor de idade','Leve o responsável. No evento, a equipe verificará os documentos de ambos; o termo enviado não substitui essa conferência.','info'):''}${facts([['Participante','Ana Exemplo'],['Tipo de inscrição',registrationOptions[selectedRegistrationOption].name],['Data do evento','17 jan 2027'],['Local','A confirmar'],['Pagamento',state==='review'?'Em análise':'Aprovado'],['Vaga',state==='confirmed'?'Confirmada':'Não reservada']])}<div class="home-inline-links"><a href="#WF-08">Ver meus dados →</a><a href="#WF-02">Ver detalhes do torneio →</a></div></div><div class="panel"><h3>Último comprovante enviado</h3>${file()}${button('Substituir comprovante','WF-05','secondary','data-state="replace"')}<p class="small muted" style="margin-top:12px">A substituição gera uma nova evidência para análise. A equipe mantém o histórico de envios.</p></div></section><aside><div class="panel"><h3>Acompanhamento</h3><ol class="timeline"><li class="done">Inscrição recebida<small>Número gerado</small></li><li class="done">Comprovante enviado<small>Arquivo recebido pela plataforma</small></li><li class="${state==='review'?'current':'done'}">${state==='review'?'Aguardando confirmação do pagamento':'Pagamento aprovado'}</li><li class="${state==='confirmed'?'done':state==='waitlist'?'current':''}">${state==='confirmed'?'Participação confirmada':state==='waitlist'?'Aguardando seleção da equipe':'Aguardar decisão da equipe'}</li></ol></div></aside></div></div>`;}
function myRegistrations(){return `<div class="app-body">${intro('Área pessoal','Minhas inscrições','Acompanhe seus pagamentos e sua participação.')}<p><a class="screen-link" href="#WF-01">Explorar torneios →</a></p>${state==='empty'?`<div class="home-empty"><h3>Nenhuma inscrição ainda.</h3><p class="muted">Quando você se inscrever, poderá acompanhar sua participação aqui.</p><a class="screen-link" href="#WF-01">Ver torneios →</a></div>`:`<ul class="home-registrations"><li><article class="home-registration"><div class="home-registration-heading"><div><p class="overline">MONO2027001 · EXEMPLO</p><h3><a href="#WF-06">${eventTitle()}</a></h3></div>${tag('Em análise','blue')}</div><p class="muted">Longsword · 17 jan 2027 · Ana Exemplo</p><p><strong>Tipo de inscrição:</strong> ${registrationOptions[selectedRegistrationOption].name}</p><div class="home-next"><strong>Comprovante recebido</strong><span>A equipe está conferindo o pagamento. Sua vaga ainda não está reservada.</span></div><div class="home-inline-links"><a href="#WF-06">Acompanhar inscrição →</a><a href="#WF-08">Editar meus dados →</a></div></article></li></ul><p class="small muted">Só você e a equipe autorizada acessam os detalhes privados desta inscrição.</p>`}</div>`;}
function editRegistration(){return `<div class="app-body"><a class="return-link" href="#WF-06">← Acompanhar inscrição</a>${intro('MONO2027001 · exemplo','Meus dados da inscrição','Correções mantêm o mesmo titular, torneio e número.')} <p><strong>Tipo de inscrição:</strong> ${registrationOptions[selectedRegistrationOption].name}</p> ${state==='conflict'?notice('Não foi possível salvar','O documento ou e-mail conflita com uma inscrição ativa deste torneio. Nenhum dado foi alterado.','error'):state==='tagssaved'?notice('Tags salvas · simulação','A seleção foi atualizada. Os demais dados não foram alterados.','success'):''}<div class="panel"><h3>Dados pessoais</h3>${identityFields(true)}<h3>Experiência e equipe</h3>${sportFields()}<h3>Suas tags</h3>${tagChoices(true,state==='tagsclosed')}<p class="small muted">${state==='tagsclosed'?'A janela de inscrições foi encerrada. Suas tags não podem mais ser alteradas.':'Você pode alterar suas tags até o encerramento da janela de inscrições. A equipe verificará a elegibilidade no evento.'}</p>${state==='tagsclosed'?'':button('Salvar tags','WF-08','secondary','data-state="tagssaved"')}<p class="small muted">As tags são salvas separadamente dos demais dados desta inscrição.</p><h3>Contato de emergência</h3>${emergency()}<details><summary>Rever minhas declarações e autorizações</summary><p>Suas declarações registradas permanecem vinculadas a esta inscrição.</p><p>Declarações obrigatórias aceitas · exemplo</p><p>Se suas circunstâncias mudarem ou você tiver dúvidas sobre suas declarações, entre em contato com a organização: <a href="mailto:suporte@karlbruder.com">suporte@karlbruder.com</a>.</p><p>Para solicitações sobre dados pessoais, consulte a <a href="/privacy-policy">Política de Privacidade</a>.</p></details><div class="actions">${button('Salvar alterações','','','data-dialog="saved"')}${button('Voltar','WF-06','secondary')}</div></div></div>`;}
function staffNav() {
  return `<nav class="staff-nav" data-nav-label="guildPanel">
    <a href="#WF-18" data-nav-text="overview"></a>
    <a href="#WF-19" data-nav-text="tournaments"></a>
    <a href="#WF-09" data-nav-text="payments"></a>
    <a href="#WF-13/queue" data-nav-text="refunds"></a>
    <a href="#WF-21" data-nav-text="users"></a>
  </nav>`;
}
function staffState(){if(state==='forbidden')return `<div class="empty"><h3>Acesso restrito à equipe.</h3><p>Esta conta não tem acesso administrativo.</p><a class="screen-link" href="#WF-17">Voltar ao início →</a></div>`;if(state==='loading')return '<div class="panel" role="status">Carregando…</div>';if(state==='error')return '<div class="panel" role="alert"><h3>Não foi possível carregar.</h3><p>Tente novamente.</p></div>';return '';}
function staffHome(){const status=staffState();return `<div class="app-body">${intro('Administração · proposta','Painel da Guilda','Acesso administrativo em todos os torneios.')}${status||`${staffNav()}<div class="grid-2"><div class="panel home-shortcuts"><h3>Torneios</h3><p>Consulte e configure os eventos.</p><ul><li><a href="#WF-19"><span><strong>Gerenciar torneios</strong><small>Lista, criação e configuração</small></span><span aria-hidden="true">→</span></a></li></ul></div><div class="panel home-shortcuts"><h3>Operações</h3><ul><li><a href="#WF-09"><span><strong>Conferir pagamentos</strong><small>Comprovantes aguardando análise</small></span><span aria-hidden="true">→</span></a></li><li><a href="#WF-21"><span><strong>Gerenciar usuários</strong><small>Consultar e alterar níveis de acesso · proposta #74</small></span><span aria-hidden="true">→</span></a></li></ul></div></div>`}</div>`;}
function staffTournaments(){const status=staffState();return `<div class="app-body">${intro('Equipe · proposta','Torneios','Gerencie eventos em toda a guilda.',status?'':button('Criar torneio','WF-12','','data-state="create"'))}${status||`${staffNav()}${state==='empty'?'<div class="empty"><h3>Nenhum torneio cadastrado.</h3><p>Crie um torneio para começar.</p></div>':`<div class="panel home-shortcuts"><h3>Todos os torneios</h3><ul><li><a href="#WF-20"><span><strong>Monomachia Karlbrüder 2027</strong><small>Longsword · 17 jan 2027 · exemplo</small><small>Inscrições encerradas · exemplo</small></span><span aria-hidden="true">→</span></a></li></ul></div>`}`}</div>`;}
function offeringDrafts(){
 const invalid=state==='productinvalid', failed=state==='producterror', pending=state==='productsaving';
 return `<section class="panel"><h3>Produtos de inscrição</h3><p>Selecione produtos existentes ou prepare novos produtos. Eles serão criados junto com o torneio.</p>${state==='productloading'?'<p role="status">Carregando produtos…</p>':state==='productloaderror'?notice('Não foi possível carregar produtos','Os dados do torneio e novos produtos permanecem para tentar novamente.','error')+button('Tentar novamente','WF-12','secondary','data-state="productcreate"'):state==='productempty'?'<p>Nenhum produto reutilizável encontrado.</p>':`${field('Buscar produto existente','','placeholder="Nome do produto"')}${checkbox('Inscrição Social · R$ 50,00 · oferecido em Torneio de exemplo')}${checkbox('Inscrição Plena · R$ 100,00 · oferecido em Monomachia 2027')}`}<h4>Novo produto · exemplo</h4>${field('Nome do produto *',invalid?'':'Inscrição Plus',invalid?'aria-invalid="true" aria-describedby="product-errors"':'')}${textarea('Descrição dos benefícios *','Participação e pacote de boas-vindas.')}${field('Preço em BRL *',invalid?'-1':'200.00',`type="number" min="0" step="0.01" ${invalid?'aria-invalid="true" aria-describedby="product-errors"':''}`)}${state==='productcreate'?`<h4>Outro produto · exemplo</h4>${field('Nome do segundo produto *','Inscrição iniciante')}${textarea('Descrição do segundo produto *','Participação para iniciantes.')}${field('Preço do segundo produto em BRL *','80.00','type="number" min="0" step="0.01"')}`:''}${invalid?'<p id="product-errors" role="alert">Informe um nome e um valor não negativo com até duas casas decimais.</p>':''}${failed?notice('Não foi possível salvar','O torneio e os produtos não foram criados. Os dados permanecem para tentar novamente.','error'):''}${state==='productsaved'?notice('Produtos salvos','O torneio e suas ofertas foram criados.','success'):''}<div class="actions">${button('Adicionar outro produto','WF-12','secondary','data-state="productcreate"')}${button(failed?'Tentar novamente':pending?'Salvando…':'Criar torneio com produtos','WF-12','','data-state="productsaved" '+(pending?'disabled':''))}</div><p class="small muted">A seleção e os valores são exemplos. Sem ofertas, o torneio pode ser configurado depois.</p></section>`;
}
function offeringManagement(){
 const edit=['offeredit','offerprice','offerdeactivate','offererror','offersaving'].includes(state);
 return `<section class="panel offering-management"><h3>Produtos de inscrição</h3>${state==='offerempty'?'<p>Nenhum produto oferecido neste torneio.</p>':`<p><strong>Inscrição Plena</strong> · R$ 100,00 · Ativo</p><p>Participação, premiações e brindes de patrocinadores.</p><p class="small">Oferecido em: Monomachia Karlbrüder 2027 e Torneio de exemplo.</p><div class="actions">${button('Editar detalhes','WF-20','secondary','data-state="offeredit"')}${button('Alterar preço','WF-20','secondary','data-state="offerprice"')}${button('Desativar','WF-20','danger','data-state="offerdeactivate"')}</div>`}<div class="actions">${button('Adicionar produto','WF-20','secondary','data-state="offeradd"')}</div>${['offeradd','offersearch'].includes(state)?`<hr class="divider"><h4>Adicionar produto</h4>${field('Buscar produto existente','','placeholder="Nome do produto"')}${state==='offersearch'?'<p>Nenhum produto encontrado. Crie um novo produto abaixo.</p>':checkbox('Inscrição Social · R$ 50,00 · Torneio de exemplo')}${button('Buscar','WF-20','secondary','data-state="offersearch"')}<h4>Ou criar produto</h4>${field('Nome do produto *','')}${textarea('Descrição dos benefícios *')}${field('Preço em BRL *','','type="number" min="0" step="0.01"')}${button('Adicionar ao torneio','WF-20','','data-state="offersaved"')}`:''}${edit?`<hr class="divider"><h4 id="offering-review" tabindex="-1">${state==='offerdeactivate'?'Desativar Inscrição Plena?':state==='offerprice'?'Alterar preço':'Editar Inscrição Plena'}</h4>${state==='offerdeactivate'?'':`${field('Nome do produto *','Inscrição Plena')}${textarea('Descrição dos benefícios *','Participação, premiações e brindes de patrocinadores.')}${field('Preço em BRL *','100.00','type="number" min="0" step="0.01"')}`}<p><strong>Esta alteração afeta todos os torneios que oferecem este produto:</strong> Monomachia Karlbrüder 2027 e Torneio de exemplo.</p><p>Desativar impede novas inscrições nos dois torneios. Inscrições anteriores mantêm nome, descrição e valor acordados. Um novo valor cria um novo preço.</p>${state==='offererror'?notice('Não foi possível salvar','Nenhuma alteração foi confirmada. Os dados permanecem para tentar novamente.','error'):''}<div class="actions">${button(state==='offersaving'?'Salvando…':'Confirmar alteração','WF-20','','data-state="offersaved" '+(state==='offersaving'?'disabled':''))}${button('Cancelar','WF-20','secondary','data-state="detail"')}</div>`:''}${state==='offersaved'?notice('Alteração salva','Os torneios vinculados agora usam as novas condições para futuras inscrições.','success'):''}</section>`;
}
function staffTournamentDetail(){const confirmation=state==='confirm',rejected=['registered','closed'].includes(state);return `<div class="app-body">${intro('Equipe · torneios','Monomachia Karlbrüder 2027','Exemplo fictício de configuração')}${staffNav()}${state==='deleted'?notice('Torneio excluído','O torneio elegível foi removido nesta simulação.','success'):rejected?notice('Não foi possível excluir','Este torneio possui inscrições. Ele e suas inscrições permanecem intactos, mesmo após o encerramento de novas inscrições.','error'):state==='error'?notice('Falha ao excluir','Nenhuma exclusão foi confirmada. Tente novamente.','error'):''}${state==='deleted'?button('Voltar à lista','WF-19','secondary'):`<div class="panel"><h3>Configuração</h3>${facts([['Modalidade','Longsword'],['Data','17 jan 2027'],['Local','Não configurado'],['Inscrições','Encerradas · exemplo'],['Pagamento Pix','Não configurado']])}<div class="home-inline-links"><a href="#WF-12/edit">Editar configuração →</a><a href="#WF-09">Conferir pagamentos →</a><a href="#WF-26/list">Gerenciar atletas →</a></div></div>${offeringManagement()}${confirmation?`<div class="panel"><h3>Excluir este torneio?</h3><p>A exclusão depende de não haver inscrições. Resultados de partidas futuros também impedirão a exclusão.</p><div class="actions">${button('Confirmar exclusão','WF-20','danger','data-state="registered"')}${button('Manter torneio','WF-20','secondary')}</div><p class="small muted">Use o seletor para comparar sucesso e falhas.</p></div>`:`<div class="panel"><h3>Excluir torneio</h3><p>Um torneio com inscrições não pode ser excluído, mesmo após o encerramento. Resultados futuros também impedirão exclusão.</p>${button('Excluir torneio','WF-20','danger','data-state="confirm"')}</div>`}`}</div>`;}
function staffUsers(){const status=staffState();return `<div class="app-body">${intro('Equipe · proposta #74','Usuários e níveis de acesso','Consulte contas e seus níveis de acesso na aplicação.')}${status||`${staffNav()}<div class="panel"><label class="field">Filtrar usuários<input placeholder="Nome ou e-mail de exemplo"></label><div class="actions">${button('Filtrar','WF-21','secondary','data-state="filtered"')}${button('Limpar','WF-21','secondary','data-state="list"')}</div></div>${state==='empty'?'<div class="empty"><h3>Nenhum usuário encontrado.</h3><p>Altere o filtro e tente novamente.</p></div>':`<div class="panel home-shortcuts"><h3>Usuários · exemplos fictícios</h3><ul>${(state==='filtered'?['Ana Exemplo']:['Ana Exemplo','Bruno Exemplo','Carla Exemplo']).map((name,i)=>`<li><a href="#WF-22"><span><strong>${name}</strong><small>${['Usuário','Membro da guilda','Administrador'][i]} · conta de exemplo</small></span><span aria-hidden="true">→</span></a></li>`).join('')}</ul></div>`}`}</div>`;}
function staffRole(){const confirm=['confirm','self','last'].includes(state);return `<div class="app-body">${intro('Equipe · usuários','Alterar nível de acesso','Ana Exemplo · conta fictícia')}${staffNav()}${state==='success'?notice('Nível de acesso atualizado','A alteração foi registrada. Tokens existentes podem manter o nível de acesso anterior até atualização ou expiração.','success'):state==='error'?notice('Não foi possível alterar o nível de acesso','Nenhuma alteração foi confirmada. Tente novamente.','error'):''}<div class="panel"><h3>Nível de acesso da conta</h3><p>Nível de acesso atual: <strong>Administrador</strong></p>${confirm?`<p>Confirme a alteração para <strong>Usuário</strong>.</p>${state==='self'||state==='last'?notice(state==='self'?'Você está alterando seu próprio nível de acesso':'Esta conta é o último admin','A alteração é permitida. O acesso pelo Supabase é o caminho de recuperação. Tokens existentes podem manter o nível de acesso anterior até atualização ou expiração.','info'):''}<div class="actions">${button('Confirmar alteração','WF-22','','data-state="success"')}${button('Voltar','WF-22','secondary')}</div>`:`${selectField('Novo nível de acesso',['Usuário','Membro da guilda','Administrador'])}<p class="small muted">A escolha nesta tela é ilustrativa. A confirmação mostra um exemplo.</p><div class="actions">${button('Revisar alteração','WF-22','','data-state="confirm"')}${button('Voltar aos usuários','WF-21','secondary')}</div>`}</div></div>`;}
function staffQueue(){const status=staffState();return status?`<div class="app-body">${intro('Guilda Karlbrüder','Conferência de pagamentos','Todos os torneios · acesso administrativo')}${status}</div>`:`<div class="app-body">${intro('Guilda Karlbrüder','Conferência de pagamentos','Todos os torneios · acesso administrativo')}${staffNav()}<div class="panel"><label class="field">Buscar inscrição exata<input placeholder="Número da inscrição"></label><div class="actions"><button class="button" type="button">Buscar</button><button class="button secondary" type="button">Atualizar fila</button></div></div>${state==='empty'?'<div class="empty"><h3>Nenhum comprovante pendente.</h3><p class="muted">Novos envios aparecerão nesta fila.</p></div>':`<div class="panel home-shortcuts"><div class="panel-heading"><h3>Comprovantes aguardando análise</h3><span class="small muted">Amostra fictícia</span></div><ul>${['Ana Exemplo','Bruno Exemplo','Carla Exemplo'].map((n,i)=>`<li><a href="#WF-10"><span><strong>${n}</strong><small>MONO202700${i+1} · Monomachia 2027</small><small>Enviado em · exemplo</small></span><span aria-hidden="true">→</span></a></li>`).join('')}</ul><nav class="actions" aria-label="Páginas da fila"><button class="button secondary" disabled>Anterior</button><span>1–3 / 3</span><button class="button secondary" disabled>Próxima</button></nav></div>`}<p class="small muted">A abertura de uma análise não reserva vagas. Busca e paginação são ilustrativas.</p></div>`;}
function staffReview(){const full=['full','race'].includes(state),status=staffState();if(status)return `<div class="app-body">${intro('Equipe','Conferir pagamento e participação')}${status}</div>`;return `<div class="app-body"><a class="return-link" href="#WF-09">← Fila de análise</a>${intro('Equipe · MONO2027001','Conferir pagamento e participação.','Ana Exemplo · Monomachia Karlbrüder 2027',tag('Em análise','blue'))}${staffNav()}${state==='changed'?notice('O comprovante ou a análise mudou','Atualize e confira a evidência antes de tentar novamente.','error'):state==='notification'?notice('Análise registrada','A decisão foi registrada, mas o e-mail não foi enviado.','info'):''}${state==='race'?notice('A disponibilidade mudou','Outra confirmação ocupou a última vaga. A decisão deverá considerar a lotação atual; nenhum participante pode ser confirmado acima do limite.','info'):''}${state==='late'?notice('Transferência após o prazo','Aceitar segue a regra normal de vagas. Para recusar participação após dinheiro recebido, use cancelamento com reembolso; recusar comprovante é uma ação diferente.'):''}<div class="split"><section><div class="panel"><h3>Comprovante mais recente</h3><div class="proof-sheet"><div class="proof-paper"><p class="overline">DOCUMENTO FICTÍCIO</p><h4>Comprovante de Pix</h4><div class="metric">R$ 150,00</div><hr><p>Ana Exemplo → conta da guilda</p><p>Sem dados bancários reais</p><p class="muted">Ilustração do espaço de conferência</p></div></div>${file('comprovante-atual.pdf','Versão 2 · exemplo')}<details><summary>Histórico de comprovantes · 2 versões</summary>${file('comprovante-anterior.pdf','Versão 1 · recusada') }<p class="small muted">Histórico restrito à equipe.</p></details></div><div class="panel"><h3>Dados e elegibilidade</h3>${button('Gerenciar inscrição · proposta','WF-25','secondary')}${facts([['Nome','Ana Exemplo'],['Equipe','Equipe de exemplo'],['Experiência HEMA','2 anos · exemplo'],['Torneios anteriores','0'],['Documento','[Acesso privado de staff]']])}${state==='minor'?notice('Participante menor de idade','Conferir termo assinado antes da decisão. No evento, verificar documentos do participante e responsável e o acompanhamento.','info')+file('termo-responsabilidade.pdf','Documento privado · exemplo'):''}<details><summary>Dados restritos e nota de segurança</summary><p>Nota de segurança: [informação privada de exemplo]</p><p class="small muted">Consulta restrita à equipe.</p></details></div></section><aside><div class="panel"><h3>Decisão da equipe</h3>${facts([['Valor configurado','R$ 150,00 · exemplo'],['Participação confirmada',full?'64 / 64':'56 / 64'],['Resultado da aprovação',full?'Lista de espera':'Confirmar, se elegível']])}${full?notice('Sem vaga disponível','Aprovar o pagamento inclui na espera e notifica por e-mail. Não confirma vaga.'):''}${state==='changed'?button('Atualizar análise','WF-10','secondary','data-state="available"'):state==='notification'?'':`${field('Valor recebido (BRL)','','type="number" min="0" step="0.01"')}${checkbox('Conferi o recebimento e o valor do pagamento.')}${checkbox('Conferi os requisitos de participação e a documentação aplicável.')}${state==='reject'?`${textarea('Motivo da recusa *','Não foi possível identificar o favorecido no arquivo.')}<p class="small muted">O motivo será mostrado ao participante e enviado na notificação.</p>${button('Recusar e solicitar novo envio','','wide danger','data-dialog="rejected"')}`:`${button(full?'Aprovar pagamento → lista de espera':'Aprovar pagamento e confirmar','','wide','data-dialog="approved"')}${button('Recusar comprovante','WF-10','secondary wide','data-state="reject" style="margin-top:9px"')}`}`}${state==='late'?`<div class="actions">${button('Cancelar e encaminhar reembolso','WF-13','secondary','data-state="staff"')}</div>`:''}<p class="small muted" style="margin-top:13px">A decisão registra responsável e horário. A capacidade é conferida novamente ao confirmar.</p></div></aside></div></div>`;}
function waitlist(){return `<div class="app-body">${intro('Operação · Monomachia 2027','Participantes em espera','Pagamentos já aprovados. A seleção é uma decisão da equipe.')}<div class="stats"><div><div class="metric">${state==='seat'?'63':'64'} / 64</div><p>Participantes confirmados</p></div><div><div class="metric">3</div><p>Participantes em espera</p></div><div><div class="metric">${state==='seat'?'1':'0'}</div><p>Vagas disponíveis</p></div></div>${notice('Nenhuma promoção automática','O surgimento de uma vaga não muda nenhuma inscrição. Selecione explicitamente quem confirmar.','info')}<div class="panel"><div class="table-wrap" role="region" aria-label="Tabela com rolagem horizontal" tabindex="0"><table><thead><tr><th>Participante</th><th>Inscrição</th><th>Pagamento</th><th>Ação</th></tr></thead><tbody>${['Ana Exemplo','Bruno Exemplo','Carla Exemplo'].map((n,i)=>`<tr><td>${n}</td><td>MONO202700${i+1}</td><td>${tag('Aprovado','green')}</td><td>${button('Confirmar participação','','secondary',state==='full'?'disabled':'data-dialog="waitlist-confirm"')}</td></tr>`).join('')}</tbody></table></div></div><p class="small muted">A ordem ilustrativa da tabela não representa prioridade. A confirmação ainda verifica elegibilidade e capacidade.</p></div>`;}
function eventSettings(){const creating=['create','productcreate','productempty','productinvalid','producterror','productloading','productloaderror','productsaving','productsaved'].includes(state);return `<div class="app-body">${intro('Administração · proposta',creating?'Criar torneio':'Informações do torneio','Configuração ilustrativa. Dados não fornecidos permanecem em branco.')}${staffNav()}${state==='saved'?notice('Configuração salva · simulação','Aceites anteriores permanecem preservados.','success'):''}${state==='capacityerror'?notice('Capacidade não pode ser menor que 56','Existem 56 participantes confirmados neste cenário. A alteração foi recusada sem cancelar inscrições.','error'):''}<div class="panel"><div class="form-grid">${field('Nome',creating?'':'Monomachia Karlbrüder 2027')}${field('Modalidade',creating?'':'Longsword')}${field('Início do evento',creating?'':'2027-01-17','type="date"')}${field('Término do evento',creating?'':'2027-01-17','type="date"')}${field('Abertura das inscrições',creating?'':'2026-11-01','type="date"')}${field('Encerramento das inscrições',creating?'':'2027-01-10','type="date"')}${field('Prazo de pagamento',creating?'':'2027-01-12','type="date"')}${field('Capacidade total',state==='capacityerror'?'50':creating?'':'64','type="number" min="0"')}${field('Local','','placeholder="A confirmar"')}</div><p class="small muted">Valores preenchidos são exemplos. Campos desconhecidos ficam em branco. Capacidade em branco é ilimitada. Janela de inscrição inclui ambos os dias em GMT-3.</p>${checkbox('Torneio interno — somente membros da guilda e staff')}${textarea('Programação')}${textarea('Equipamentos obrigatórios')}${checkbox('Permitir reembolsos conforme a política de cancelamento')}${field('Chave Pix opcional','','placeholder="Não configurada"')}${field('Favorecido opcional','','placeholder="Não configurado"')}<div class="actions">${creating ? '' : button('Salvar configuração','WF-12','','data-state="saved"')}${creating?'':button('Encerrar novas inscrições','','danger','data-dialog="close-registration"')}</div><p class="small muted" style="margin-top:12px">Encerrar inscrições não cancela inscrições existentes. Lotação, por si só, não encerra o formulário.</p></div>${creating ? offeringDrafts() : tournamentTagsInline()}${tournamentDocuments(creating)}</div>`;}
function refund() {
  if (state === 'queue') {
    return `<div class="app-body">${intro('Guilda Karlbrüder','Reembolsos pendentes','Todos os torneios · acesso administrativo')}${staffNav()}
      <div class="panel">${field('Buscar inscrição exata','')}${button('Buscar','WF-13/queue','secondary')}</div>
      <div class="panel"><h3>Ana Exemplo</h3><p>T422027001 · Torneio de exemplo</p><p>R$ 150,00 · Prazo do reembolso: 30/10/2026</p>${button('Registrar reembolso realizado','WF-13/staff','secondary')}</div>
    </div>`;
  }
  const pending = state === 'pending';
  const done = state === 'refunded';
  const staff = state === 'staff';
  const unpaid = state === 'unpaid';
  const cancelled = pending || done || staff || unpaid;
  const title = staff ? 'Registrar reembolso realizado' : cancelled ? 'Sua inscrição' : 'Cancelar participação';
  return `<div class="app-body">${intro(staff ? 'Equipe · reembolso' : 'Minha inscrição', title, 'Torneio de exemplo')}
    ${staff ? staffNav() : ''}
    <div class="split"><div>
      <div class="panel">${facts([['Inscrição','T422027001'],['Tipo de inscrição',registrationOptions[selectedRegistrationOption].name],['Participação',cancelled ? 'Cancelada' : 'Confirmada']])}</div>
      <div class="panel">${cancelled
        ? `<h3>Reembolso</h3>${unpaid ? '<p>Nenhum reembolso registrado para esta inscrição.</p>' : facts([['Situação do reembolso',done ? 'Reembolso concluído' : 'Aguardando reembolso'],['Valor do reembolso','R$ 150,00'],['Prazo do reembolso','30/10/2026'], ...(done ? [['Transferência realizada em (UTC−03:00)','23/10/2026 11:00']] : []), ...(staff ? [['Cancelamento registrado em (UTC−03:00)','16/10/2026 15:00']] : [])])}`
        : notice('O cancelamento encerra a participação','Qualquer vaga ocupada será liberada imediatamente.') + '<p>A guilda devolve o valor integral do pagamento verificado em até 10 dias úteis.</p>'}
      ${staff ? `${field('Transferência realizada em (UTC−03:00)','','type="datetime-local" step="1"')}${checkbox('Confirmei a transferência do valor integral.')}${button('Registrar devolução concluída','WF-13','','data-state="queue"')}<div class="actions">${button('Voltar aos reembolsos','WF-13/queue','secondary')}<a href="#WF-10">Ver evidência de pagamento</a></div>`
        : cancelled ? button('Voltar à inscrição pessoal','WF-06','secondary')
        : `<div class="actions">${button('Confirmar cancelamento','WF-13','danger','data-state="pending"')}${button('Manter participação','WF-06','secondary','data-state="confirmed"')}</div>`}
      </div></div>
      <aside class="panel tinted"><h3>${staff ? 'Transferência do reembolso' : 'Participação e dinheiro'}</h3><p>${staff ? 'Faça a transferência fora da plataforma antes de registrar a devolução.' : 'A guilda realiza a devolução fora da plataforma.'}</p></aside>
    </div></div>`;
}
function results(){return `<div class="app-body">${intro('Monomachia Karlbrüder 2027',state==='directory'?'Participantes':'Resultados',state==='directory'?'Projeção limitada · contexto autenticado':'Consulta vinculada ao torneio selecionado')}${state==='restricted'?`<div class="empty"><h3>Acesso restrito.</h3><p class="muted">Não é possível acessar este conteúdo com a conta atual. Dados do evento interno não são exibidos.</p>${button('Voltar aos torneios','WF-01')}</div>`:state==='directory'?`<div class="panel"><div class="table-wrap" role="region" aria-label="Tabela com rolagem horizontal" tabindex="0"><table><thead><tr><th>Nome de exibição</th><th>Escola / equipe</th><th>Cidade / país</th><th>Confirmação</th></tr></thead><tbody><tr><td>Ana Exemplo</td><td>Equipe de exemplo</td><td>Cidade de exemplo / Brasil</td><td>${tag('Confirmada','green')}</td></tr></tbody></table></div></div>`:state==='published'?`<div class="panel"><h3>Resultados publicados</h3><div class="skeleton">Área reservada ao formato aprovado de resultados.<br>Conteúdo e representação dependem de RES-Q1–Q4.<br>Não há ranking, pontuação ou chave presumidos.</div><p class="small muted" style="margin-top:18px">Apenas resultados públicos de eventos não internos podem ser consultados por visitantes.</p></div>`:`<div class="empty"><h3>Resultados ainda não disponíveis.</h3><p class="muted">Quando houver resultados publicados para este evento, você poderá consultá-los aqui.</p>${button('Ver detalhes do torneio','WF-02','secondary')}</div>`}</div>`;}
function membership(){return `<div class="app-body">${intro('Área do membro · conceito futuro','Minha associação','Acompanhamento de vínculo e mensalidades, separado dos torneios.')}<div class="grid-2"><div class="panel"><h3>Meu vínculo com a guilda</h3><div class="skeleton">[Informações de vínculo autorizadas]<br>Admissão, saída e vocabulário de situação a definir — MEM-Q1 e MEM-Q2.</div></div><div class="panel"><h3>Minhas mensalidades</h3><div class="skeleton">[Informações de períodos e valores]<br>Política de cobrança, isenções e descontos a definir — MEM-Q3 e MEM-Q4.</div></div></div>${notice('Cada pagamento tem seu propósito','Pagar a inscrição de um torneio não quita mensalidades da associação. Nem todo membro é pagante.','info')}<div class="panel"><h3>Registro de pagamentos</h3><div class="skeleton">Forma de registro a definir — MEM-Q5.<br>Este conceito não estabelece cobrança recorrente, gateway ou prazo de vencimento.</div></div></div>`;}
const exampleTags = [
  ['Mystai', 'Atletas que disputam sua primeira competição.'],
  ['Neophytoi', 'Atletas com menos de um ano de prática de esgrima histórica.'],
  ['Amazones', 'Atletas mulheres cisgênero.'],
  ['Poikilia', 'Atletas de gêneros sub-representados.'],
  ['Hoplitai', 'Atletas experientes que atendam a pelo menos dois dos critérios: 35 anos ou mais, um ou mais filhos, emprego com carteira assinada.']
];
const tagPill = name => `<span class="athlete-tag">${esc(name)}</span>`;
function tagChoices(selected, disabled=false) {
  return `<fieldset class="tag-picker"><legend>Selecione as tags aplicáveis</legend><p class="tag-picker-hint">Opcional · Escolha quantas fizerem sentido para você.</p><div class="tag-choice-list">${exampleTags.map(([name,description],index)=>`<label class="tag-choice"><input type="checkbox" ${selected && index < 2 ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="tag-choice-body">${tagPill(name)}<span class="tag-description">${description}</span></span></label>`).join('')}</div></fieldset>`;
}
function tournamentTagsInline(){return `<div class="panel"><div class="panel-heading"><h3>Tags do torneio · proposta</h3>${button('Adicionar tag','WF-12','secondary','data-state="tagadd"')}</div><p>Configure as tags e os critérios de elegibilidade deste torneio.</p>${state==='tagdeleted'?notice('Tag removida · simulação','A lista ilustrativa foi atualizada.','success'):state==='taginuse'?notice('Não é possível excluir Mystai','Esta tag está selecionada em inscrições. Remova a tag dessas inscrições antes de excluí-la.','error'):''}${state==='tagadd'||state==='tagrename'?`<div class="panel"><h4>${state==='tagadd'?'Nova tag':'Renomear Mystai'}</h4>${field('Nome',state==='tagrename'?'Mystai':'')}${state==='tagadd'?textarea('Critério de elegibilidade'):''}<div class="actions">${button(state==='tagadd'?'Salvar tag':'Salvar nome','WF-12','','data-state="edit"')}${button('Cancelar','WF-12','secondary','data-state="edit"')}</div></div>`:''}${state==='tagdelete'?notice('Excluir Poikilia?','Esta tag de exemplo não está selecionada em inscrições.','info')+`<div class="actions">${button('Confirmar exclusão','WF-12','danger','data-state="tagdeleted"')}${button('Cancelar','WF-12','secondary','data-state="edit"')}</div>`:''}${exampleTags.filter(([name])=>state!=='tagdeleted'||name!=='Poikilia').map(([name,description])=>`<div class="panel"><div class="tag-manage-heading">${tagPill(name)}</div><p>${description}</p><div class="actions">${name==='Mystai'?button('Renomear','WF-12','secondary','data-state="tagrename"')+button('Excluir tag','WF-12','secondary','data-state="taginuse"'):name==='Poikilia'?button('Excluir tag','WF-12','secondary','data-state="tagdelete"'):''}</div></div>`).join('')}<p class="small muted">Tags em uso por inscrições não podem ser excluídas. Ações e dados são ilustrativos.</p></div>`;}
function staffTagRegistrations(){const empty=state==='empty',filtered=state==='filtered',capacity=state==='unlimited'?'Ilimitada':state==='zero'?'0':'64';return `<div class="app-body"><a class="return-link" href="#WF-20/detail">← Torneio</a>${intro('Equipe · Monomachia 2027','Atletas do torneio','Encontre uma inscrição para gerenciar os dados e as tags do atleta.')}${staffNav()}<div class="panel"><p><strong>Inscrições totais: ${empty?'0':'72'}</strong> · Confirmadas: ${empty||state==='zero'?'0':'56'} · Capacidade: ${capacity}</p><p class="small muted">O total inclui inscrições canceladas. Somente confirmadas ocupam vagas. A busca não altera estes números.</p></div><div class="panel">${field('Buscar por nome ou número da inscrição','','placeholder="Nome ou número"')}${button('Buscar','WF-26','secondary','data-state="filtered"')}</div>${empty||filtered?`<div class="panel"><h3>${empty?'Nenhuma inscrição':'Nenhuma inscrição encontrada'}</h3><p>Não há participantes para exibir neste cenário.</p></div>`:`<div class="panel"><div class="table-wrap" role="region" aria-label="Tabela com rolagem horizontal" tabindex="0"><table><thead><tr><th>Atleta</th><th>Inscrição</th><th>Tipo de inscrição</th><th>Tags</th><th>Ação</th></tr></thead><tbody><tr><td>Ana Exemplo</td><td>MONO2027001</td><td>Inscrição Plena<br><small>Nome no momento da inscrição</small></td><td><div class="athlete-tag-list">${tagPill('Mystai')}${tagPill('Neophytoi')}</div></td><td>${button('Gerenciar inscrição','WF-25','secondary')}</td></tr>${state==='matching'?'':`<tr><td>Bruno Exemplo</td><td>MONO2027002</td><td>Indisponível</td><td>—</td><td>${button('Gerenciar inscrição','WF-25','secondary')}</td></tr>`}</tbody></table></div><p class="small muted">Dados fictícios para revisão. O nome comprado permanece mesmo após alteração ou desativação.</p></div>`}</div>`;}
function participantTags(){return `<div class="app-body"><a class="return-link" href="#WF-08/edit">← Meus dados</a>${intro('MONO2027001 · proposta','Minhas tags','Monomachia Karlbrüder 2027')}${state==='saved'?notice('Seleção salva · simulação','A equipe verificará os critérios no evento.','success'):''}${state==='closed'?notice('Janela de inscrições encerrada','Sua seleção está disponível para consulta. Procure a equipe para dúvidas.','info'):''}<div class="panel">${state==='empty'?'<h3>Este torneio não oferece tags</h3>':`${tagChoices(true,state==='closed')}<p class="small muted">A seleção é sujeita à conferência da equipe. Prazo ilustrativo: até 10 jan 2027, inclusive, em GMT-3.</p>${state==='closed'?'':button('Salvar seleção','WF-24','','data-state="saved"')}`}</div></div>`;}
function staffTags(){return `<div class="app-body"><a class="return-link" href="#WF-26/list">← Atletas do torneio</a>${intro('Equipe · MONO2027001','Gerenciar inscrição','Ana Exemplo · Monomachia Karlbrüder 2027')}${staffNav()}<p>Correções mantêm o mesmo titular, torneio e número.</p><p><strong>Tipo de inscrição:</strong> ${registrationOptions[selectedRegistrationOption].name}</p>${state==='conflict'?notice('Não foi possível salvar','O documento ou e-mail conflita com outra inscrição ativa. Nenhum dado foi alterado.','error'):['added','removed'].includes(state)?notice('Tags salvas · simulação','A seleção foi atualizada. Os demais dados não foram alterados.','success'):''}<div class="panel"><h3>Dados pessoais</h3>${identityFields(true)}<h3>Experiência e equipe</h3>${sportFields()}<h3>Contato de emergência</h3>${emergency()}<div class="actions">${button('Salvar alterações','','','data-dialog="saved"')}</div></div><div class="panel"><h3>Gerenciar tags do atleta</h3><div class="athlete-tag-list">${tagPill('Mystai')}${tagPill('Neophytoi')}</div>${tagChoices(true,false)}<p class="small muted">A equipe verifica a elegibilidade no evento. As tags podem ser alteradas após o encerramento das inscrições.</p>${button('Salvar tags','WF-25','secondary','data-state="added"')}<p class="small muted">As tags são salvas separadamente dos demais dados desta inscrição.</p></div></div>`;}

function inventory(){return `<div class="app-body">${intro('Administração da guilda · futuro','Equipamentos compartilhados','Inventário independente dos torneios.',state==='list'?button('Adicionar equipamento','WF-16','','data-state="edit"'):'')}${state==='edit'?`<div class="panel"><div class="form-grid">${field('Equipamento','Máscara de esgrima')}${field('Tipo','Proteção')}${field('Quantidade','8','type="number" min="0"')}${field('Condição','Boa','placeholder="Descrição da condição"')}</div><div class="actions">${button('Salvar registro','WF-16')}${button('Retirar do inventário','','danger','data-dialog="retire"')}${button('Voltar','WF-16','secondary')}</div></div>`:`<div class="panel"><div class="table-wrap" role="region" aria-label="Tabela com rolagem horizontal" tabindex="0"><table><thead><tr><th>Equipamento</th><th>Tipo</th><th>Quantidade</th><th>Condição</th><th></th></tr></thead><tbody>${[['Máscara de esgrima','Proteção','8','Boa'],['Espada de treino','Longsword','4','Nova'],['Broquel','Escudo','3','Desgastada']].map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}<td>${button('Editar','WF-16','secondary','data-state="edit"')}</td></tr>`).join('')}</tbody></table></div><p class="small muted" style="margin-top:18px">Dados fictícios. Condições são descrições ilustrativas, não uma lista fechada.</p></div>`}<p class="small muted">Área exclusiva de staff. O uso físico por membros não concede acesso a estes registros.</p></div>`;}
function isAthleteTournamentDetail() {
  return ['athlete', 'documentspartial', 'documentsmissing'].includes(state);
}

function athletePolicyFiles() {
  const missing = currentEvent !== 'mono' || ['unknown', 'documentsmissing'].includes(state);
  return [
    ['Regulamento', missing ? null : 'regulamento-monomachia.pdf'],
    ['Política de cancelamento', missing || state === 'documentspartial' ? null : 'politica-de-cancelamento.pdf'],
  ];
}

function documentPreviewLink(title, fileName = title, content = esc(title)) {
  return `<a class="new-tab-link" href="document-preview.html?file=${encodeURIComponent(fileName)}&amp;theme=${wireframePreferences.theme}" target="_blank"
    rel="noopener noreferrer" aria-label="${esc(title)} (abre em nova aba)">${content}<span class="new-tab-icon" aria-hidden="true">&nbsp;↗</span></a>`;
}

function athleteDocumentList(showAdditional) {
  const policies = athletePolicyFiles();
  const venueMap = showAdditional && currentEvent === 'mono' && !['unknown', 'documentsmissing'].includes(state);
  const documents = venueMap ? [...policies, ['Mapa do local', 'mapa-do-local.pdf']] : policies;
  const available = documents.filter(([, fileName]) => fileName);
  if (!available.length) return '';

  const missingPolicies = policies.filter(([, fileName]) => !fileName);
  return `<ul class="athlete-document-list">
    ${available.map(([title, fileName]) => {
      const format = fileName.split('.').at(-1).toUpperCase();
      return `<li>${documentPreviewLink(title, fileName, `<span class="document-file-icon" aria-hidden="true"></span>
        <span class="document-tile-copy"><strong>${esc(title)}</strong><small>${esc(format)}</small></span>`)}</li>`;
    }).join('')}
  </ul>
  ${missingPolicies.length ? `<ul class="athlete-document-unavailable">
    ${missingPolicies.map(([title]) => `<li>${esc(title)}: conteúdo ainda não disponível.</li>`).join('')}
  </ul>` : ''}`;
}

function athleteDocumentSection(showAdditional) {
  const content = athleteDocumentList(showAdditional);
  return content ? `<section class="athlete-documents" aria-labelledby="athlete-documents-title">
    <h4 id="athlete-documents-title">Documentos do torneio</h4>
    ${content}
  </section>` : '';
}

function registrationDocumentCard() {
  const content = athleteDocumentList(true);
  return content ? `<section class="panel registration-documents-card" aria-labelledby="registration-documents-title">
    <h3 id="registration-documents-title">Documentos do torneio</h3>
    ${content}
  </section>` : '';
}

function tournamentDocuments(creating) {
  return `<section class="panel tournament-documents" aria-labelledby="tournament-documents-title">
    <h3 id="tournament-documents-title">Documentos do torneio</h3>
    ${creating ? '<p class="muted no-margin">Crie o torneio para adicionar documentos.</p>' : `
      <h4>Documentos da inscrição</h4>
      <p class="small muted">Atletas consultam estes arquivos antes do aceite. Aceites anteriores mantêm as versões registradas.</p>
      <div class="tournament-document-list">
        ${policyRow('rules', 'Regulamento', state === 'policyempty' ? '' : state === 'policysaved' ? 'regulamento-monomachia-revisado.pdf' : 'regulamento-monomachia.pdf')}
        ${policyRow('cancellation', 'Política de cancelamento', ['edit','policyempty'].includes(state) ? '' : 'politica-de-cancelamento.pdf')}
      </div>
      <div class="additional-documents" data-additional-documents>
        <div class="tournament-document-row">
          <div>
            <h4>Documentos adicionais</h4>
            <p class="small muted no-margin" data-additional-empty ${state === 'policyadditional' ? 'hidden' : ''}>Nenhum documento adicionado.</p>
          </div>
          ${documentToggle('additional', 'Adicionar documento', 'Documentos adicionais')}
        </div>
        <ul class="additional-document-list" data-additional-list ${state === 'policyadditional' ? '' : 'hidden'}>
          ${state === 'policyadditional' ? `<li><strong>Mapa do local</strong>${documentPreviewLink('mapa-do-local.pdf')}</li>` : ''}
        </ul>
        <form id="additional-form" class="tournament-document-form" data-document-form hidden>
          <label class="field">Título do documento<input name="title" required></label>
          ${documentFileField('additional', 'Documento adicional')}
          ${documentFormActions('Adicionar arquivo')}
        </form>
        <p class="tournament-document-feedback small" role="status"></p>
      </div>
    `}
  </section>`;
}

function documentToggle(id, label, title, expanded = false) {
  return `<button type="button" class="button secondary" data-document-toggle aria-label="${label} · ${title}"
    aria-controls="${id}-form" aria-expanded="${expanded}">${label}</button>`;
}

function documentFileField(id, title, disabled = false) {
  return `<label class="field" for="${id}-upload">Escolher arquivo</label>
    <input id="${id}-upload" type="file" accept="application/pdf,image/jpeg,image/png"
      aria-label="Escolher arquivo · ${title}" aria-describedby="${id}-format" ${disabled ? 'disabled' : ''} required>
    <p class="small muted" id="${id}-format">PDF, JPEG ou PNG · até 10 MiB</p>`;
}

function documentFormActions(label, uploading = false) {
  return `<div class="actions">
    <button class="button" type="submit" data-submit-label="${label}" ${uploading ? 'aria-busy="true"' : ''} disabled>${uploading ? 'Enviando…' : label}</button>
    <button class="button secondary" type="button" data-document-close ${uploading ? 'disabled' : ''}>Cancelar</button>
  </div>`;
}

function policyRow(purpose, title, currentFile) {
  const uploading = purpose === 'rules' && state === 'policyuploading';
  const failed = purpose === 'rules' && state === 'policyerror';
  const saved = purpose === 'rules' && state === 'policysaved';
  const expanded = uploading || failed;
  return `<div class="tournament-policy">
    <div class="tournament-document-row">
      <div>
        <h5>${title}</h5>
        <div data-policy-current>${currentFile ? documentPreviewLink(currentFile) : '<p class="small muted no-margin">Nenhum arquivo publicado.</p>'}</div>
      </div>
      ${documentToggle(purpose, currentFile ? 'Substituir' : 'Enviar arquivo', title, expanded)}
    </div>
    <form id="${purpose}-form" class="tournament-document-form" data-document-form ${expanded ? '' : 'hidden'}>
      ${documentFileField(purpose, title, uploading)}
      ${documentFormActions(currentFile ? 'Publicar nova versão' : 'Publicar arquivo', uploading)}
    </form>
    ${failed ? '<p class="tournament-document-feedback small error" role="alert">Não foi possível publicar a nova versão. O arquivo atual continua disponível.</p>' : ''}
    <p class="tournament-document-feedback small${uploading ? ' pending' : saved ? ' success' : ''}" role="status">${uploading ? 'Enviando regulamento-monomachia-revisado.pdf…' : saved ? 'Nova versão publicada.' : ''}</p>
  </div>`;
}

const dialogs={
 replacement:['Nova evidência recebida · simulação','O novo arquivo requer análise. O participante verá somente esta versão; a equipe manterá o histórico. Este diálogo não confirma nem cancela a participação.'],
 proof:['Documento de demonstração','Este espaço representa a visualização privada do arquivo autorizado. Nenhum documento real foi carregado. O participante só acessa o comprovante mais recente; staff também acessa versões anteriores.'],
 internal:['Evento interno · cenário de membro','O usuário membro pode consultar e se inscrever em eventos internos, respeitando a elegibilidade. Este cartão não aparece no cenário de visitante.'],
 recovery:['Recuperação de acesso','Prévia do retorno: se a conta puder receber a recuperação, consulte o e-mail e siga as instruções. Nenhuma mensagem foi enviada pelo wireframe. Use o seletor de estado para visualizar a definição de nova senha.'],
 saved:['Alterações recebidas · simulação','Na aplicação, o backend validará os campos e preservará os aceites anteriores. Este wireframe não grava alterações.'],
 rejected:['Nova evidência solicitada · simulação','A equipe informa o motivo da recusa, notifica o participante e permite outro envio. Recusar o comprovante não cancela a participação nem ocupa vaga.'],
 approved:['Decisão de pagamento · simulação','O backend revalida elegibilidade, documentação e capacidade ao aprovar. Havendo vaga, confirma; sem vaga, registra a espera e dispara a notificação. Não existe overbooking.'],
 'waitlist-confirm':['Confirmar participante selecionado','O pagamento já está aprovado. A confirmação depende de elegibilidade e vaga disponível no momento da decisão. O protótipo não altera registros.'],
 'event-save':['Salvar informações · simulação','Notificações por alterações foram adiadas em #75. As especificações atuais ainda as descrevem. Versões anteriores de aceites permanecem preservadas.'],
 'close-registration':['Encerrar novas inscrições','A equipe pode encerrar novas inscrições sem cancelar participantes existentes ou alterar a capacidade. Esta ação será confirmada explicitamente na aplicação.'],
 'unpaid-cancel':['Participação cancelada · simulação','Sem pagamento recebido, não há reembolso devido. A inscrição permanece cancelada e uma nova inscrição pode ser criada se o evento aceitar inscrições.'],
 retire:['Retirar registro do inventário','Retirada do registro é permitida. A escolha técnica entre arquivamento e exclusão será definida na implementação, sem acrescentar empréstimos ou histórico de manutenção.']
};
const picker=document.getElementById('screen-picker'),statePicker=document.getElementById('state-picker');
const screenGroups = [
 {label:'Início e conta', ids:['WF-17','WF-03']},
 {label:'Explorar torneios', ids:['WF-01','WF-02']},
 {label:'Inscrição e acompanhamento', ids:['WF-04','WF-05','WF-06','WF-07','WF-08','WF-13','WF-24']},
 {label:'Equipe · torneios e pagamentos', ids:['WF-18','WF-19','WF-20','WF-12','WF-26','WF-25','WF-09','WF-10','WF-11','WF-21','WF-22']},
 {label:'Outros conceitos futuros', ids:['WF-14','WF-15','WF-16']}
];
for(const section of screenGroups){const group=document.createElement('optgroup');group.label=section.label;section.ids.forEach(id=>{const screen=screens.find(s=>s.id===id);const option=document.createElement('option');option.value=screen.id;option.textContent=screen.title;group.append(option)});picker.append(group)}
function render(){picker.value=current.id;statePicker.innerHTML=Object.entries(current.states).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');statePicker.value=state;document.getElementById('screen-meta').textContent=`${current.id} · ${screenGroups.find(group=>group.ids.includes(current.id)).label} · ${current.role}`;document.getElementById('prototype').innerHTML=`${header()}${current.id==='WF-17'&&['current','currentadmin'].includes(state)?'<div class="future-note">AÇÕES ATUAIS · NOVO LAYOUT PROPOSTO</div>':`<div class="future-note">${['WF-03','WF-04','WF-05','WF-06','WF-09','WF-10','WF-13'].includes(current.id)?'JORNADA PARCIALMENTE IMPLEMENTADA · APRESENTAÇÃO E ESTADOS ILUSTRATIVOS':'PROPOSTA / CONCEITO · NÃO IMPLEMENTADO COMO EXIBIDO'}</div>`}${current.render()}<footer class="app-footer"><nav class="app-footer-links" aria-label="Termos e privacidade">${documentPreviewLink('Termos de Uso')}${documentPreviewLink('Política de Privacidade')}</nav></footer>`;document.getElementById('spec-notes').innerHTML=`<div><h2>LEITURA DA TELA</h2><p>${current.title}</p><p>${current.role} · ${current.states[state]}</p><p>${current.rules.map(r=>`<span class="rule-tag">${r}</span>`).join('')}</p></div><div><h2>CONTRATOS DE ORIGEM</h2>${current.refs.map(r=>`<a href="../../${r}">${r} ↗</a>`).join('')}</div><div><h2>O QUE PRESERVAR</h2><ul>${current.notes.map(n=>`<li>${n}</li>`).join('')}</ul></div><div><h2>PROPOSTA VISUAL</h2><p>Layout, navegação e microcopy são propostas. Cenários e valores fictícios não alteram regras do produto.</p><p>Use os seletores acima para comparar estados e a largura de celular.</p></div>`;
  applyNavigationLanguage();
  refreshHeaderPreferences();
}
function navigate(id,variant,scroll=true,role){journeyRole=role;current=screens.find(s=>s.id===id)||screens[0];state=variant in current.states?variant:Object.keys(current.states)[0];history.replaceState(null,'',`#${current.id}/${state}`);render();if(scroll)window.scrollTo({top:0,behavior:'instant'});}
picker.addEventListener('change',()=>navigate(picker.value));statePicker.addEventListener('change',()=>navigate(current.id,statePicker.value,false));
document.getElementById('desktop').onclick=()=>{document.body.classList.remove('mobile');document.getElementById('desktop').setAttribute('aria-pressed','true');document.getElementById('mobile').setAttribute('aria-pressed','false')};document.getElementById('mobile').onclick=()=>{document.body.classList.add('mobile');document.getElementById('desktop').setAttribute('aria-pressed','false');document.getElementById('mobile').setAttribute('aria-pressed','true')};
document.getElementById('annotations').onclick=e=>{document.body.classList.toggle('no-notes');e.currentTarget.setAttribute('aria-pressed',String(!document.body.classList.contains('no-notes')))};
document.addEventListener('click',e=>{const b=e.target.closest('[data-go],[data-dialog],a[href^="#WF-"]');if(!b)return;e.preventDefault();if(b.dataset.event)currentEvent=b.dataset.event;if(b.dataset.dialog){const data=dialogs[b.dataset.dialog];if(data){document.getElementById('dialog-content').innerHTML=`<h2 id="dialog-title">${data[0]}</h2><p>${data[1]}</p>`;document.getElementById('dialog').showModal()}return;}const [id,linkedState]=(b.dataset.go||b.getAttribute('href').slice(1)).split('/');if (id) {
  navigate(id, b.dataset.state || linkedState, true, headerRole());
  const focusTarget = id === 'WF-20' && ['offeredit','offerprice','offerdeactivate'].includes(state)
    ? document.getElementById('offering-review')
    : document.getElementById('prototype');
  focusTarget.focus();
}});
function setPreferenceMenu(trigger, open) {
  const menu = document.getElementById(trigger.getAttribute('aria-controls'));
  trigger.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
  if (open) menu.querySelector('[aria-pressed="true"]')?.focus();
}

const openPreferenceTrigger = () => document.querySelector('[data-preference-trigger][aria-expanded="true"]');

document.addEventListener('click', event => {
  const openTrigger = openPreferenceTrigger();
  const trigger = event.target.closest('[data-preference-trigger]');
  const option = event.target.closest('.preference-option');
  if (trigger) {
    if (openTrigger && openTrigger !== trigger) setPreferenceMenu(openTrigger, false);
    document.querySelector('.app-menu-toggle')?.setAttribute('aria-expanded', 'false');
    setPreferenceMenu(trigger, openTrigger !== trigger);
    return;
  }

  if (option && openTrigger) {
    if (option.dataset.themeChoice) {
      wireframePreferences.setTheme(option.dataset.themeChoice);
      for (const link of document.querySelectorAll('.new-tab-link')) {
        const params = new URLSearchParams(link.search);
        params.set('theme', wireframePreferences.theme);
        link.search = params.toString();
      }
    } else {
      wireframePreferences.setLanguage(option.dataset.languageChoice);
      applyNavigationLanguage();
    }
    refreshHeaderPreferences();
    setPreferenceMenu(openTrigger, false);
    openTrigger.focus();
    return;
  }

  if (openTrigger) setPreferenceMenu(openTrigger, false);
  const toggle = event.target.closest('.app-menu-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') === 'false'));
});

document.addEventListener('focusin', event => {
  const trigger = openPreferenceTrigger();
  if (!trigger) return;
  const panel = document.getElementById(trigger.getAttribute('aria-controls'));
  if (!trigger.contains(event.target) && !panel.contains(event.target)) setPreferenceMenu(trigger, false);
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || document.getElementById('dialog').open) return;
  const trigger = openPreferenceTrigger();
  if (trigger) {
    setPreferenceMenu(trigger, false);
    trigger.focus();
    return;
  }
  const toggle = document.querySelector('.app-menu-toggle[aria-expanded="true"]');
  if (toggle?.getClientRects().length) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
});
document.getElementById('close-dialog').onclick=()=>document.getElementById('dialog').close();
document.addEventListener('change', e => { if (e.target.name === 'registration-option') { selectedRegistrationOption = e.target.value; const summary = document.getElementById('registration-option-summary'); if (summary) summary.textContent = registrationOptions[selectedRegistrationOption].name + ' · ' + registrationOptions[selectedRegistrationOption].price; } });
document.addEventListener('click', event => {
  const toggle = event.target.closest('[data-document-toggle]');
  const close = event.target.closest('[data-document-close]');
  if (!toggle && !close) return;

  const form = close ? close.form : document.getElementById(toggle.getAttribute('aria-controls'));
  const opener = toggle || form.parentElement.querySelector('[data-document-toggle]');
  if (form.querySelector('[type="file"]').disabled) return;
  if (form.hidden) {
    form.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    form.querySelector('input').focus();
  } else {
    form.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    opener.focus();
  }
});

document.addEventListener('input', updateDocumentSubmit);
document.addEventListener('change', updateDocumentSubmit);
function updateDocumentSubmit(event) {
  const form = event.target.closest('[data-document-form]');
  if (!form) return;

  const input = form.querySelector('[type="file"]');
  const title = form.elements.title;
  form.querySelector('[type="submit"]').disabled = input.disabled || !input.files.length || (title && !title.value.trim());
}

document.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target.closest('[data-document-form]');
  if (!form) return;

  const input = form.querySelector('[type="file"]');
  const title = form.elements.title;
  const fileName = input.files[0]?.name;
  const documentTitle = title?.value.trim();
  if (!fileName || input.disabled || (title && !documentTitle)) return;

  const row = form.parentElement;
  const toggle = row.querySelector('[data-document-toggle]');
  const submit = form.querySelector('[type="submit"]');
  const close = form.querySelector('[data-document-close]');
  const feedback = row.querySelector('[role="status"]');
  const hadFocus = form.contains(document.activeElement);
  row.querySelector('[role="alert"]')?.remove();
  input.disabled = true;
  if (title) title.disabled = true;
  submit.disabled = true;
  close.disabled = true;
  submit.setAttribute('aria-busy', 'true');
  submit.textContent = 'Enviando…';
  feedback.classList.remove('success');
  feedback.classList.add('pending');
  feedback.textContent = `Enviando ${fileName}…`;
  setTimeout(() => {
    if (title) {
      const list = row.querySelector('[data-additional-list]');
      list.insertAdjacentHTML('beforeend', `<li><strong>${esc(documentTitle)}</strong>${documentPreviewLink(fileName)}</li>`);
      list.hidden = false;
      row.querySelector('[data-additional-empty]').hidden = true;
    } else {
      row.querySelector('[data-policy-current]').innerHTML = documentPreviewLink(fileName);
      toggle.textContent = 'Substituir';
      toggle.setAttribute('aria-label', 'Substituir · ' + row.querySelector('h5').textContent);
      submit.dataset.submitLabel = 'Publicar nova versão';
    }
    form.reset();
    input.disabled = false;
    if (title) title.disabled = false;
    close.disabled = false;
    submit.removeAttribute('aria-busy');
    submit.textContent = submit.dataset.submitLabel;
    form.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (hadFocus && document.activeElement === document.body) toggle.focus();
    feedback.classList.replace('pending', 'success');
    feedback.textContent = title ? 'Documento adicionado.' : 'Nova versão publicada.';
  }, 750);
});
const initial=location.hash.slice(1).split('/');navigate(initial[0]||'WF-17',initial[1],false);
