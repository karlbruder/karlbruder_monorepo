import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import MapsLink from './MapsLink';

const Training = () => {
    return (
        <div id='training' className='bg-dark text-white pt-5 pb-5'>
            <Container fluid className='gap-5'>
                <Row className="justify-content-md-center pb-3">
                    <Col xs={12} md={4}>
                        <img src={process.env.PUBLIC_URL + `/ads/aula_sanca.jpg`}
                        style={{ objectFit: 'cover', display: 'block' }}
                        className="img-fluid h-100"
                        alt="Imagem com informações das aulas em São Carlos."/>
                    </Col>
                    <Col xs={12} md={4} className='mt-4 mt-md-0'>
                        <h4>São Carlos/SP — HEMA Regular</h4>
                        <b>Modalidade: HEMA / Espada Longa</b> <br/>
                        <b>📅 Dias: Segunda e Quarta-Feira</b>    <br/>
                        <b>⏰ Horário: 19h às 21h</b>             <br/>
                        <b>💸 Valor mensal: R$200,00</b>          <br/>
                        <MapsLink href={"https://maps.app.goo.gl/S27W8DLRVZovKMg6A"} label={"Local: Academia Performance – Segundo Andar, Sala de Armas Karlbrüder"}/> <br/>

                        <span>
                            Na segunda-feira, o treino é voltado aos fundamentos técnicos, com trabalho de base, deslocamento, cortes, defesas e construção marcial. <br/>
                            Na quinta-feira, o foco avança para técnicas mais desenvolvidas, aplicação prática e sparring.
                        </span> <br/>

                        <hr/>

                        <h4>São Carlos/SP — HEMA Iniciante aos Sábados</h4>

                        <b>Modalidade: HEMA iniciante</b> <br/>
                        <b>📅 Dia: Sábado</b>                <br/>
                        <b>⏰ Horário: 10h às 12h</b>        <br/>
                        <b>💸 Valor mensal: R$150,00</b>     <br/>
                        <MapsLink href={"https://maps.app.goo.gl/kPUdDcUhz8uiug246"} label={"Local: Chácara Recanto Vovô Fernando, nas Chácaras Leila, próximo ao bairro Tutoya do Vale"}/> <br/>

                        <span>
                            Turma voltada para iniciantes, com introdução aos fundamentos da esgrima histórica, progressão técnica e contato inicial com a arte da espada. <br/>
                            No mesmo horário, há espaço para sparring livre de HEMA avançado, destinado a praticantes com equipamento completo.
                        </span> <br/>

                        <hr/>

                        <h4>São Carlos/SP — Esgrima Olímpica: Fundamentos</h4>

                        <b>Modalidade: Esgrima Olímpica</b> <br/>
                        <b>📅 Dia: Terça-feira</b>             <br/>
                        <b>⏰ Horário: 19h às 21h</b>          <br/>
                        <b>💸 Valor mensal: R$200,00</b>       <br/>
                        <MapsLink href={"https://maps.app.goo.gl/S27W8DLRVZovKMg6A"} label={"Local: Academia Performance – Segundo Andar, Sala de Armas Karlbrüder"}/> <br/>

                        <span>
                            Turma voltada aos fundamentos da esgrima olímpica, com trabalho de base, deslocamento, distância, tempo, ataque, defesa e construção técnica. <br/>
                            As inscrições estão abertas. As aulas começam em julho, assim que for fechado o mínimo de alunos necessário para o uso do espaço na academia.
                        </span> <br/>
                    </Col>
                </Row>
                <hr/>
                <Row className="flex-row-reverse justify-content-md-center pt-3">
                    <Col xs={12} md={4}>
                        <img src={process.env.PUBLIC_URL + `/ads/aula_itapira.jpg`}
                        style={{ objectFit: 'cover', display: 'block' }}
                        className="img-fluid h-100"
                        alt="Imagem com informações das aulas em São Carlos."/>
                    </Col>
                    <Col xs={12} md={4} className='mt-4 mt-md-0'>
                        <h4>Itapira/SP — Espada Longa</h4>
                        <b>Modalidade: HEMA / Espada Longa</b> <br/>
                        <b>📅 Dia: sexta-feira</b>                <br/>
                        <b>⏰ Horário: 19h30 às 21h</b>           <br/>
                        <b>💸 Valor mensal: R$60,00</b>           <br/>
                        <MapsLink href="https://maps.app.goo.gl/kdNhRqJdvh9TBZRP7" label={"Local: R. Antônia Pupa, 93 - Vila Esperanca, Itapira - SP"}/> <br/>

                        Turma de espada longa voltada para iniciantes e praticantes em desenvolvimento. Não é necessário ter experiência prévia. <br/>

                        <hr/>

                        <h4>Itapira/SP — Nova Turma de Espada Longa</h4>
                        <b>Modalidade: HEMA / Espada Longa</b> <br/>
                        <b>📅 Dia: sexta-feira</b> <br/>
                        <b>⏰ Horário: 18h30 às 19h30 - Início: 24 de julho</b> <br/>
                        <b>💸 Valor mensal: R$60,00</b>           <br/>
                        <MapsLink href="https://maps.app.goo.gl/kdNhRqJdvh9TBZRP7" label={"Local: R. Antônia Pupa, 93 - Vila Esperanca, Itapira - SP"}/> <br/>

                        Nova turma em Itapira, com vagas limitadas. Não é necessário ter experiência prévia.
                    </Col>

                </Row>
            </Container>
        </div>
    );
  };

export default Training;
