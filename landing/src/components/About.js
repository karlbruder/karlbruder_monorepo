import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';


const About = () => {
  return (
    <div id='about'>
      <Container fluid className='bg-dark text-white pt-2'>
        <Row className='justify-content-center'>
          <Col sm={6} className='text-center'>
            <>
              <h3>Sobre</h3>
              <hr/>
              <p>
                Fundado em 2016 por uma iniciativa de alunos da Universidade de São Paulo (USP) e da Universidade Federal de São Carlos (UFScar), o grupo Karlbruder é um dos pioneiros no Brasil na prática da esgrima histórica. Inspirado na Irmandade de São Marcos (Maxbruder), icônica guilda de esgrima alemã dos séculos XV e XVI, o grupo tem suas origens na prática da esgrima alemã e posteriormente expadiu a prática e estudo de outras armas e escolas de esgrima.
              </p>
            </>
          </Col>
        </Row>
      </Container>
    </div>

  );
};

export default About;