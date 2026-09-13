import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useTranslation } from './LanguageContext';
import partners from '../data/partners';

const Partner = () => {
  const { t } = useTranslation();

  return (
    <div id="partner">
      <Container fluid className='bg-black text-white text-center pt-4 pb-4'>
        <Row className='justify-content-center'>
          <Col xs={6} md={3} className='text-center'>
            <h3>{t.partner.title}</h3>
            <hr />
          </Col>
        </Row>

        <Row className='justify-content-center gap-5'>
          {partners.map((partner) => (
            <Col sm={1} md={2} className='px-5' key={partner.name}>
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                title={partner.name}
              >
                <img
                  src={process.env.PUBLIC_URL + (partner.darkBackgroundLogo || partner.logo)}
                  alt={`${partner.name} Logo`}
                  width={partner.wide ? 200 : 150}
                  height="150"
                />
              </a>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
};

export default Partner;

