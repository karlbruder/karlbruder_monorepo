import { useEffect } from "react";
import { ApplicationFooter } from "@/components/application-footer";
import { ApplicationHeader } from "@/components/application-header";
import { legalRoutes } from "@/config/legal-routes";

const documentTitles = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
};

export function LegalDocumentRoute({ documentType }: { documentType: keyof typeof documentTitles }) {
  const title = documentTitles[documentType];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="application-page" lang="pt-BR">
      <ApplicationHeader language="pt" />
      <main className="application-body legal-document">
        <article aria-labelledby="legal-document-title">
          <h1 id="legal-document-title">{title}</h1>
          <p className="muted">Versão preliminar · Vigência em <time dateTime="2026-11-08">8 de novembro de 2026</time></p>
          {documentType === "terms" ? <TermsOfUse /> : <PrivacyPolicy />}
        </article>
      </main>
      <ApplicationFooter language="pt" />
    </div>
  );
}

function TermsOfUse() {
  return (
    <>
      <h2>1. Sobre o aplicativo</h2>
      <p>O App Karlbrüder é operado pela Guilda Karlbrüder. Pelo aplicativo, você pode consultar torneios, fazer sua própria inscrição, enviar comprovantes de pagamento e acompanhar a situação da inscrição. Quando disponíveis, os resultados e as classificações também podem ser consultados no aplicativo.</p>
      <h2>2. Conta e uso do aplicativo</h2>
      <p>Use sua própria conta e mantenha seus dados atualizados. Proteja suas credenciais e avise a equipe se suspeitar de acesso indevido. Ao se inscrever, forneça informações verdadeiras e envie somente documentos pertinentes à sua inscrição.</p>
      <p>É proibido usar a conta de outra pessoa, adulterar comprovantes, tentar acessar dados sem autorização ou interferir no funcionamento do aplicativo. A equipe pode restringir o acesso em caso de fraude, risco à segurança ou violação destes termos, observados os direitos aplicáveis.</p>
      <h2>3. Inscrições, pagamentos e torneios</h2>
      <p>Cada torneio informa suas condições de inscrição, elegibilidade, participação, cancelamento e reembolso. Quando houver taxa, o pagamento é feito por Pix conforme as instruções do evento. O comprovante enviado pelo aplicativo passa por análise da equipe. A vaga só é assegurada quando a inscrição estiver confirmada. Se o pagamento for aprovado e o torneio estiver lotado, a inscrição pode ficar na lista de espera paga.</p>
      <p>Outros usuários autorizados podem consultar a lista limitada de participantes, de acordo com o acesso permitido para o torneio. Quando publicados, os resultados de torneios abertos podem ser consultados sem login. Os resultados de torneios internos têm acesso restrito.</p>
      <h2>4. Encerramento da conta</h2>
      <p>Para solicitar o encerramento da conta, escreva para <a href="mailto:suporte@karlbruder.com">suporte@karlbruder.com</a>. Se houver inscrição ativa, a equipe pedirá que você confirme expressamente a desistência antes de encerrar a conta. Após a confirmação, a equipe dará andamento ao encerramento e ao reembolso que for devido conforme as condições do torneio e a legislação aplicável.</p>
      <p>Ao encerrar a conta, a equipe exclui a conta de acesso e a desvincula do histórico esportivo. Resultados e classificações podem ser mantidos conforme a <a href={legalRoutes.privacy}>Política de Privacidade</a>. As inscrições anteriores não são vinculadas a uma nova conta.</p>
      <h2>5. Versões e contato</h2>
      <p>A versão vigente destes termos ficará disponível no aplicativo. A equipe comunicará alterações relevantes e solicitará novo aceite quando necessário. O aplicativo guarda a versão das condições aceitas em cada inscrição.</p>
      <p>Para dúvidas sobre o aplicativo, inscrições ou pagamentos, escreva para <a href="mailto:suporte@karlbruder.com">suporte@karlbruder.com</a>.</p>
    </>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <h2>1. Responsável e alcance</h2>
      <p>A Guilda Karlbrüder é a controladora dos dados pessoais tratados conforme esta política. O canal de privacidade é <a href="mailto:suporte@karlbruder.com">suporte@karlbruder.com</a>.</p>
      <p>Esta política cobre os dados tratados pelo aplicativo, inclusive os registros de torneio que ele recebe, armazena ou publica. O aviso do organizador, disponibilizado na inscrição, explica o uso de dados pelo evento, incluindo filmagem, transmissão, replays e publicações em canais externos.</p>
      <h2>2. Dados que usamos</h2>
      <ul>
        <li><strong>Conta e acesso.</strong> Usamos o identificador da conta, o e-mail e os dados de sessão para autenticar você, manter sua sessão e proteger o acesso. Se você escolher entrar com o Google, recebemos dados da sua conta Google, como o identificador de autenticação, o e-mail e o nome de perfil. Usamos o identificador e o e-mail para reconhecer sua conta e o nome de perfil para exibição no aplicativo.</li>
        <li><strong>Inscrição e segurança.</strong> Usamos nome, data de nascimento, CPF ou passaporte, dados de contato, localização, informações esportivas, contato de emergência e, quando aplicável, autorização parental e informações de segurança. Esses dados servem para identificar a inscrição, verificar requisitos, comunicar decisões e apoiar a segurança no evento.</li>
        <li><strong>Pagamento.</strong> Usamos comprovantes Pix enviados, decisões de análise e registros de pagamento e reembolso para conferir transações, acompanhar a inscrição e resolver divergências.</li>
        <li><strong>Aceites.</strong> Registramos a versão e o conteúdo apresentados, as escolhas feitas, a data e a hora, o identificador da conta e o endereço IP de origem. Esses registros documentam as condições apresentadas e as escolhas feitas na inscrição.</li>
        <li><strong>Histórico esportivo.</strong> Quando a funcionalidade estiver disponível, usamos o nome de competição escolhido pelo atleta, os eventos disputados, as pontuações e as colocações para publicar resultados e manter classificações.</li>
      </ul>
      <h2>3. Acesso, publicação e fornecedores</h2>
      <p>A equipe autorizada acessa dados de inscrição, documentos e comprovantes conforme a finalidade do atendimento e da organização do torneio. A lista de participantes pode mostrar nome de exibição, escola ou equipe, cidade e país e situação da confirmação a usuários autorizados. Resultados publicados de torneios abertos podem ser consultados sem login. Documentos de identidade, contatos privados, comprovantes, autorizações parentais e notas internas de segurança ficam fora dessas publicações.</p>
      <p>Usamos fornecedores de autenticação e armazenamento de dados, hospedagem e armazenamento de arquivos, envio de mensagens e proteção do acesso ao aplicativo. Esses fornecedores tratam os dados necessários à prestação dos respectivos serviços. O Google participa da autenticação quando você escolhe entrar com o Google. Você pode solicitar a identificação das entidades com as quais compartilhamos seus dados e a finalidade do compartilhamento pelo canal de privacidade.</p>
      <h2>4. Retenção e encerramento da conta</h2>
      <p>Ao encerrar a conta, excluímos a conta de acesso e a desvinculamos do histórico esportivo. Dados privados de inscrição, como CPF e dados de contato, são excluídos quando deixam de ser necessários, ressalvadas as hipóteses aplicáveis de retenção.</p>
      <p>Podemos manter, com acesso restrito, registros de pagamento e comprovantes necessários para obrigações aplicáveis, conciliação, reembolsos ou disputas. Registros de aceite, autorizações parentais e informações de segurança têm finalidades e critérios próprios de retenção.</p>
      <p>O histórico esportivo pode permanecer após o encerramento da conta, inclusive na classificação, quando houver fundamento para sua manutenção. O Conselho da Guilda Karlbrüder analisa pedidos de correção ou ocultação do nome publicado, inclusive pedidos relativos a atletas menores de idade. As inscrições anteriores não são vinculadas a uma nova conta.</p>
      <h2>5. Seus direitos e como exercê-los</h2>
      <p>Escreva para <a href="mailto:suporte@karlbruder.com">suporte@karlbruder.com</a> para solicitar acesso, correção, informações sobre compartilhamento ou, conforme o caso, exclusão, anonimização, bloqueio, oposição ao tratamento ou revogação de consentimento. A equipe pode pedir informações proporcionais para confirmar sua identidade. Se precisarmos manter algum registro, explicaremos a finalidade e o fundamento aplicável ao pedido.</p>
      <p>Pedidos sobre imagens ou gravações de um torneio seguem o canal indicado no aviso do organizador. Para eventos da Guilda Karlbrüder, o contato também é <a href="mailto:suporte@karlbruder.com">suporte@karlbruder.com</a>.</p>
    </>
  );
}
