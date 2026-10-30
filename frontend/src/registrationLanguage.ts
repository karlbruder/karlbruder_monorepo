import { useEffect, useState } from "react";

export type RegistrationLanguage = "pt" | "en";

// Draft interface copy. Official event terms and regulation remain server supplied.
const english = {
  "Entrando...": "Signing in...",
  "Entrar com Google": "Sign in with Google",
  "Não foi possível recuperar sua sessão.": "We could not restore your session.",
  "Não foi possível entrar com Google. Tente novamente.": "We could not sign you in with Google. Please try again.",
  "Não foi possível sair. Tente novamente.": "We could not sign you out. Please try again.",
  "Sair": "Sign out",
  "Início": "Home",
  "Inscrição pessoal": "Personal registration",
  "Conheça as informações do torneio antes de se inscrever.": "Review the tournament details before registering.",
  "Carregando informações do torneio...": "Loading tournament details...",
  "Este torneio não está disponível.": "This tournament is not available.",
  "O acesso aos dados do torneio foi recusado. Entre novamente.": "Access to tournament details was denied. Please sign in again.",
  "Não foi possível carregar os dados do torneio. Tente novamente.": "We could not load tournament details. Please try again.",
  "Tentar novamente": "Try again",
  "Sua inscrição": "Your registration",
  "Carregando sua sessão...": "Restoring your session...",
  "Entre com sua conta para se inscrever neste torneio.": "Sign in to register for this tournament.",
  "Você está conectado como": "You are signed in as",
  "Novas inscrições estão encerradas pela organização.": "New registrations have been closed by the organizers.",
  "A inscrição aguarda a configuração do período e dos termos do torneio.": "Registration is waiting for tournament dates and terms to be configured.",
  "Torneio": "Tournament",
  "Data": "Date",
  "Modalidade": "Discipline",
  "Local": "Location",
  "Valor": "Fee",
  "Inscrições": "Registration window",
  "Espada longa (longsword)": "Longsword",
  "A confirmar": "To be confirmed",
  "Novas inscrições encerradas pela organização.": "New registrations closed by the organizers.",
  "Período de inscrição a confirmar.": "Registration window to be confirmed.",
  "De": "From",
  "a": "to",
  "inclusive (GMT-3).": "inclusive (GMT-3).",
  "O envio da inscrição não confirma uma vaga. A equipe analisará o pagamento e a disponibilidade depois.": "Submitting a registration does not confirm a place. Staff will review payment and availability later.",
  "Campo obrigatório.": "Required field.",
  "Entre com uma conta que tenha e-mail.": "Sign in with an account that has an email address.",
  "Escolha o tipo de documento.": "Choose a document type.",
  "Informe o tempo de prática ou o ano de início.": "Enter your practice duration or start year.",
  "Informe um ano válido.": "Enter a valid year.",
  "Informe zero ou um número inteiro positivo.": "Enter zero or a positive whole number.",
  "Escolha uma opção válida.": "Choose a valid option.",
  "Esta declaração é obrigatória.": "This declaration is required.",
  "Escolha autorizar ou não autorizar.": "Choose whether to authorize image use.",
  "Sua sessão expirou. Saia e entre novamente antes de enviar.": "Your session expired. Sign out and sign in again before submitting.",
  "As inscrições estão encerradas. Nenhum dado foi enviado.": "Registration is closed. No data was submitted.",
  "Os termos do torneio ainda não estão configurados.": "Tournament terms have not been configured yet.",
  "O e-mail da inscrição precisa corresponder ao da sua conta.": "The registration email must match your account email.",
  "Não foi possível aceitar a inscrição. Confira os dados e o período de inscrição.": "We could not accept the registration. Check your details and the registration window.",
  "Já existe uma inscrição ativa para esta conta, e-mail ou documento neste torneio.": "An active registration already exists for this account, email, or document in this tournament.",
  "Não foi possível criar a inscrição por conflito. Tente novamente mais tarde.": "We could not create the registration because of a conflict. Please try again later.",
  "O servidor recusou um ou mais campos ou declarações. Revise o formulário.": "The server rejected one or more fields or declarations. Review the form.",
  "Não foi possível enviar a inscrição agora. Tente novamente mais tarde.": "We could not submit the registration now. Please try again later.",
  "conteúdo ainda não configurado.": "content has not been configured yet.",
  "Consultar": "View",
  "Inscrição recebida": "Registration received",
  "Guarde seu número de inscrição": "Keep your registration number",
  "Participante": "Participant",
  "E-mail": "Email",
  "Situação": "Status",
  "Aguardando pagamento": "Awaiting payment",
  "Próximo passo: acompanhe as instruções de pagamento do torneio. Sua vaga ainda não está confirmada nem reservada.": "Next step: follow the tournament payment instructions. Your place is not yet confirmed or reserved.",
  "Formulário de inscrição": "Registration form",
  "Conteúdo em preparação": "Draft content",
  "Os textos finais das declarações e da privacidade ainda precisam de aprovação. Este formulário não está pronto para inscrições reais.": "The final declaration and privacy wording still needs approval. This form is not ready for real registrations.",
  "Revise os campos indicados antes de enviar.": "Review the highlighted fields before submitting.",
  "Dados pessoais": "Personal details",
  "Nome completo": "Full name",
  "Nome social (opcional)": "Preferred name (optional)",
  "E-mail da conta": "Account email",
  "Telefone": "Phone number",
  "Documento": "Identity document",
  "Selecione": "Select",
  "Passaporte": "Passport",
  "Número do documento": "Document number",
  "Data de nascimento": "Date of birth",
  "País": "Country",
  "Cidade": "City",
  "Estado / província (opcional)": "State / province (optional)",
  "O e-mail da inscrição deve corresponder ao da sua conta.": "The registration email must match your account email.",
  "Sua experiência": "Your experience",
  "Tempo de prática em HEMA": "HEMA practice duration",
  "Ex.: 2 anos": "E.g. 2 years",
  "Ano de início em HEMA": "Year you started HEMA",
  "Informe o tempo de prática, o ano de início ou ambos.": "Enter your practice duration, start year, or both.",
  "Torneios anteriores": "Previous tournaments",
  "0 se nunca participou": "0 if you have never competed",
  "Escola / equipe (opcional)": "School / team (optional)",
  "Instrutor responsável (opcional)": "Responsible instructor (optional)",
  "Referência HEMA Ratings (opcional)": "HEMA Ratings reference (optional)",
  "Lateralidade (opcional)": "Handedness (optional)",
  "Não informada": "Not specified",
  "Destra": "Right-handed",
  "Canhota": "Left-handed",
  "Ambidestra": "Ambidextrous",
  "Categoria / caso especial (opcional)": "Category / special case (optional)",
  "A equipe confirma a elegibilidade conforme o regulamento.": "Staff confirm eligibility under the tournament rules.",
  "Segurança e participação": "Safety and participation",
  "Contato de emergência": "Emergency contact",
  "Telefone de emergência": "Emergency contact phone",
  "Regulamento": "Tournament rules",
  "Política de cancelamento": "Cancellation policy",
  "Equipamento obrigatório": "Required equipment",
  "Os termos e o regulamento são registrados pelas versões configuradas para este torneio.": "The accepted terms and rules are recorded using the versions configured for this tournament.",
  "Li e aceito o regulamento do torneio.": "I have read and accept the tournament rules.",
  "Li as informações sobre o tratamento dos dados e a visibilidade de participação e resultados.": "I have read the information about data processing and visibility of participation and results.",
  "Declaro que as informações fornecidas são verdadeiras.": "I declare that the information I provided is true.",
  "Estou ciente dos riscos da esgrima histórica.": "I acknowledge the risks of historical fencing.",
  "Declaro possuir o equipamento obrigatório.": "I declare that I have the required equipment.",
  "Declaro estar fisicamente apto para participar.": "I declare that I am physically fit to participate.",
  "Li as regras de cancelamento, reembolso e desclassificação.": "I have read the cancellation, refund, and disqualification rules.",
  "Uso de imagem": "Image use",
  "Autorizo o uso da minha imagem.": "I authorize use of my image.",
  "Não autorizo o uso da minha imagem.": "I do not authorize use of my image.",
  "Enviando inscrição...": "Submitting registration...",
  "Enviar minha inscrição": "Submit my registration",
  "Ao enviar, você ainda não terá uma vaga confirmada ou reservada.": "Submitting does not confirm or reserve a place.",
} as const;

export type RegistrationCopyKey = keyof typeof english;
export function registrationCopy(language: RegistrationLanguage, key: RegistrationCopyKey): string {
  return language === "en" ? english[key] : key;
}

const storageKey = "registrationLanguage";
function validLanguage(value: string | null): value is RegistrationLanguage {
  return value === "pt" || value === "en";
}

export function useRegistrationLanguage() {
  const [language, setLanguage] = useState<RegistrationLanguage>(() => {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (validLanguage(query)) return query;
    const saved = window.localStorage.getItem(storageKey);
    return validLanguage(saved) ? saved : "pt";
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
  }, [language]);

  const changeLanguage = (next: RegistrationLanguage) => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", url);
    window.localStorage.setItem(storageKey, next);
    setLanguage(next);
  };

  return { language, changeLanguage };
}
