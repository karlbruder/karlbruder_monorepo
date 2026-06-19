import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const HomeButton = () => {
  return (
    <a href="#">
      <img src={process.env.PUBLIC_URL + '/icons/home.jpg'} height="38px" hspace="5" />
    </a>
  )
}

const WhatsappButton = () => {
  return (
    <a href="https://wa.me/5516997632102" target="_blank">
      <img src={process.env.PUBLIC_URL + '/icons/whatsapp.png'} height="38px" hspace="5" />
    </a>
  )
}

const InstagramButton = () => {
  return (
    <a href="https://www.instagram.com/karlbruder.hema/?hl=pt-br" target="_blank">
      <img src={process.env.PUBLIC_URL + '/icons/instagram.png'} height="38px" hspace="5" />
    </a>
  )
}

const YoutubeButton = () => {
  return (
    <a href="https://www.youtube.com/channel/UCEzgHTyAzDwL1-KTYvd9m4w" target="_blank">
      <img src={process.env.PUBLIC_URL + '/icons/youtube.png'} height="38px" hspace="5" />
    </a>
  )
}

const Contact = () => {
  // TODO READ VALUES FROM CONFIG
  return (
    <div id='contact'>
      <Container fluid className='d-flex justify-content-center bg-black text-white pt-4 pb-3 border-top'>
        <Row>
          <Col
            className='d-flex '
            xs={12} sm={6}>

              <Container fluid>
                <Row className='d-flex flex-column'>
                  <Col> <h5>Localizações</h5> </Col>
                  <Col>
                    <a href="https://maps.app.goo.gl/S27W8DLRVZovKMg6A"
                    style={{textDecoration: "none", color: 'white', fontWeight: "bold"}} rel='noreferrer' target="_blank">📍 São Carlos</a> <br/>
                    <a href="https://maps.app.goo.gl/kdNhRqJdvh9TBZRP7"
                    style={{textDecoration: "none", color: 'white', fontWeight: "bold"}} rel='noreferrer' target="_blank">📍 Itapira</a>
                  </Col>
                </Row>
              </Container>
          </Col>

          <Col
            className='d-flex justify-content-center align-items-center pb-3 mt-3 mt-sm-0'
            xs={12} sm={6}>
            <Container fluid>
              <Row className='d-flex flex-column'>
                <Col> <h5>Contato</h5> </Col>
                <Col className='d-flex flex-row'>
                  <HomeButton /><WhatsappButton /><InstagramButton /><YoutubeButton />
                </Col>
              </Row>
            </Container>
            
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Contact;