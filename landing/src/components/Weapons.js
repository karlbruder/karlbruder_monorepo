import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useTranslation } from './LanguageContext';

const Weapons = () => {
    const { t } = useTranslation();
    return (
        <div id='weapons'>
            <Container fluid className='bg-black text-white text-center pt-3'>
                <Row className='justify-content-center'>
                    <Col xs={6} md={3} className='text-center'>
                        <h3>{t.weapons.title}</h3>
                        <hr/>
                    </Col>
                </Row>
                <Row>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>{t.weapons.germanLongsword.title}</h4>
                        <div className='py-2'>
                            <i class="icon-liech-v2" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            {t.weapons.germanLongsword.text}
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>{t.weapons.italianLongsword.title}</h4>
                        <div className='py-2'>
                            <i class="icon-fiori-v10" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            {t.weapons.italianLongsword.text}
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>{t.weapons.englishSabre.title}</h4>
                        <div className='py-2'>
                            <i class="icon-sabre-v2" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            {t.weapons.englishSabre.text}
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>{t.weapons.iberianMontante.title}</h4>
                        <div className='py-2'>
                            <i class="icon-montante-v3" style={{fontSize: '128px'}}></i>
                        </div>
                        <p>
                            {t.weapons.iberianMontante.text}
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>{t.weapons.olympicFencing.title}</h4>
                        <div className='py-2'>
                            <img src={process.env.PUBLIC_URL + `/weapons/olimpica.png`} alt='Imagem Vetorizada de uma Espada com Broquel' style={{width: '128px', height: '128px'}}/>
                        </div>
                        <p>
                            {t.weapons.olympicFencing.text}
                        </p>
                    </Col>
                    <Col sm={12} md={6} className='px-5'>
                        <h4>{t.weapons.swordAndBuckler.title}</h4>
                        <div className='py-2'>
                            <img src={process.env.PUBLIC_URL + `/weapons/espada_e_broquel.png`} alt='Imagem Vetorizada de uma Espada com Broquel' style={{width: '128px', height: '128px'}}/>
                        </div>
                        <p>
                            {t.weapons.swordAndBuckler.text}
                        </p>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Weapons;