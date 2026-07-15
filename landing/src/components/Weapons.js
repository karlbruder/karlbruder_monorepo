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
                            O mestre Johannes Liechtenauer marcou a tradição da esgrima alemã com sua forma eficiente de combate. Desferindo de forma tática, golpes velozes e contra-ataques calculados, capazes de finalizar duelos em instantes.
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Espada Longa Italiana</h4>
                        <div className='py-2'>
                            <i class="icon-fiori-v10" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            A arte da batalha exclusiva aos nobres. O mestre Fiori dei Liberi ensinou aos cavaleiros do século XVI uma poderosa e completa forma de lutar a curta distância, destruindo seus oponentes em embates ferozes.
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Sabre Inglês</h4>
                        <div className='py-2'>
                            <i class="icon-sabre-v2" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            Durante o século XIX, o renomado espadachim e capitão Alfred Hutton ensinou de forma estruturada e altamente detalhada a arte do sabre aos seus regimentos. Destinada aos lordes e oficiais, a lâmina fria do sabre corta de forma elegante e letal.
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Montante Ibérico</h4>
                        <div className='py-2'>
                            <i class="icon-montante-v3" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            Arma dos guardiões reais, o poderoso brandir do montante enfrenta as multidões, firmando terreno e impondo ordem. O general Dom Diogo Gomes de Figueyredo deixou em sua memória, ensinamentos para domar este monstro frente à tempestade.
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Esgrima Olímpica</h4>
                        <div className='py-2'>
                            <img src={process.env.PUBLIC_URL + `/weapons/olimpica.png`} alt='Imagem Vetorizada de uma Espada com Broquel' style={{width: '128px', height: '128px'}}/>
                        </div>
                        <p>
                            Dos salões de duelo às arenas modernas, a esgrima olímpica preserva a nobreza da lâmina em forma esportiva. Florete, espada e sabre exigem velocidade, disciplina, leitura do adversário e domínio absoluto do tempo, onde um único toque pode decidir o combate.
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>Espada e Broquel</h4>
                        <div className='py-2'>
                            <img src={process.env.PUBLIC_URL + `/weapons/espada_e_broquel.png`} alt='Imagem Vetorizada de uma Espada com Broquel' style={{width: '128px', height: '128px'}}/>
                        </div>
                        <p>
                            Antiga arte dos manuscritos medievais, a espada e broquel une a lâmina de uma mão ao pequeno escudo do combatente. Entre coberturas, entradas e golpes precisos, o praticante aprende a avançar protegido, dominar a curta distância e transformar defesa em ataque.
                        </p>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Weapons;