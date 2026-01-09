import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Partner = () => {
  return (
    <div id="partner">
        <Container fluid className='bg-black text-white text-center pt-4'>
                <Row className='justify-content-center'>
                    <Col xs={6} md={3} className='text-center'>
                        <h3>Parceiros</h3>
                        <hr/>
                    </Col>
                </Row>
                <Row>
                    <Col sm={12} md={6} className='px-5'> 
                        <a href="https://www.faitsdarmes.com/en/" target="_blank"rel="noopener noreferrer follow"  title="Faits D'Armes Store: Specialists in equipment for Historical European Martial Arts (HEMA)" >

                            <img src="https://faitsdarmes.com/img/cms/partner-kit/faitsdarmes-partner-300x300-black.png" alt="This club is an official partner of Faits d'Armes store" width="300" height="300"/>
                        </a>
                    </Col>
                    <Col className='text-center'>
                        <p>
                            Temos o prazer de anunciar o início da nossa parceria oficial com a Faits d’Armes.
                        </p>
                        <p>
                            Essa colaboração representa um passo importante para o nosso clube, unindo-nos a um fornecedor reconhecido pela qualidade de seus equipamentos e pelo compromisso com os praticantes.
                        </p>
                        <p>
                            Temos plena confiança de que essa parceria será um grande sucesso e trará benefícios concretos aos nossos membros, garantindo acesso a materiais confiáveis para treino e competição, além de condições especiais e descontos.
                        </p>
                        <p>
                            Agradecemos à Faits d’Armes pela confiança e apoio, e estamos entusiasmados para construir juntos uma parceria sólida e duradoura.
                        </p>
                    </Col>
                </Row>
        </Container>
        
    </div>
  );
};

export default Partner;

