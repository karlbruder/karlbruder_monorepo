import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Weapons = () => {
    return (
        <div id='weapons'>
            <Container fluid className='bg-black text-white text-center pt-3'>
                <Row className='justify-content-center'>
                    <Col xs={6} md={3} className='text-center'>
                        <h3>Modalidades</h3>
                        <hr/>
                    </Col>
                </Row>
                <Row>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Espada Longa Alemã</h4>
                        <div className='py-2'>
                            <i class="icon-liech-v2" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            O mestre Johannes Liechtenauer marcou a sociedade do século XIV com sua forma de combate eficiente. Desferindo de forma tática, golpes velozes e contra-ataques calculados, capazes de finalizar duelos em instantes.
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Espada Longa Italiana</h4>
                        <div className='py-2'>
                            <i class="icon-fiori-v10" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            A arte da batalha exclusiva aos nobre. O mestre Fiori del Liberi ensinou aos cavaleiros do século XVI uma poderosa e completa forma de lutar a curta distância, destruindo seus oponentes em embates ferozes.
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Sabre Inglês</h4>
                        <div className='py-2'>
                            <i class="icon-sabre-v2" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            Destinado aos lordes e oficiais, a lâmina fria do sabre corta de forma elegante e letal. Durante o século XIX, o renomado espadachim e capitão Alfred Hutton ensinou aos seus regimentos de forma estruturada e altamente detalhada na arte do sabre.
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Montante Ibérico</h4>
                        <div className='py-2'>
                            <i class="icon-montante-v3" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            Arma dos guardiões reais, o poderoso brandir do montate enfrenta as multidões, firmando terreno e impondo order. O general Dom Diogo Gomes de Figueyredo deixou em sua memória, ensinamentos para domar este monstro frente a tempestade.
                        </p>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Weapons;