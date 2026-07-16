import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useTranslation } from './LanguageContext';

const About = () => {
  const { t } = useTranslation();
  return (
    <div id='about'>
      <Container fluid className='bg-dark text-white pt-2'>
        <Row className='justify-content-center'>
          <Col sm={6} className='text-center'>
            <>
              <h3>{t.about.title}</h3>
              <hr/>
              <p>
                {t.about.text}
              </p>
            </>
          </Col>
        </Row>
      </Container>
    </div>

  );
};

export default About;