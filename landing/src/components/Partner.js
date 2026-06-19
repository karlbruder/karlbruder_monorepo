import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Partner = () => {
  return (
    <div id="partner">
        <Container fluid className='bg-black text-white text-center pt-4 pb-4'>
                <Row className='justify-content-center'>
                    <Col xs={6} md={3} className='text-center'>
                        <h3>Parceiros</h3>
                        <hr/>
                    </Col>
                </Row>
                <Row className='justify-content-center gap-5'>
                    <Col sm={1} md={2} className='px-5'> 
                        <a href="https://www.faitsdarmes.com/en/" target="_blank"rel="noopener noreferrer follow"  title="Faits D'Armes" >

                            <img src={process.env.PUBLIC_URL + `/logos/logo_faits_darmes.png`} alt="Faits d'Armes Store Logo" width="200" height="100"/>
                        </a>
                    </Col>

                    <Col sm={1} md={2} className='px-5'> 
                        <a href="https://linktr.ee/manziniswordmaker" target="_blank"rel="noopener noreferrer follow"  title="Manzini Swordmaker" >

                            <img src={process.env.PUBLIC_URL + `/logos/logo_mazini.png`} alt="Manzini Swordmaker Logo" width="150" height="150"/>
                        </a>
                    </Col>

                    <Col sm={1} md={2} className='px-5'> 
                        <a href="https://www.instagram.com/cantodoaco/" target="_blank"rel="noopener noreferrer follow"  title="Canto do Aço" >

                            <img src={process.env.PUBLIC_URL + `/logos/logo_canto_do_aco.png`} alt="Canto do Aço Logo" width="150" height="150"/>
                        </a>
                    </Col>

                    <Col sm={1} md={2} className='px-5'> 
                        <a href="https://linktr.ee/flechebrasil" target="_blank" rel="noopener noreferrer follow"  title="Flèche" >

                            <img src={process.env.PUBLIC_URL + `/logos/logo_fleche.jpg`} alt="Fléche Store Logo" width="150" height="150"/>
                        </a>
                    </Col>
                </Row>
        </Container>
        
    </div>
  );
};

export default Partner;

