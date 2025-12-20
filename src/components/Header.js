import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import { AiOutlineMenu } from "react-icons/ai";

const navLink = {
  color: 'white',
  fontWeight: 'bold',
};

const Header = () => {
  // TODO resolve the active session highlight on navbar
  return (
    <Navbar className='bg-dark' sticky='top' expand='md'>
      <Container fluid className='px-5'>
        <Navbar.Brand href='#'>
          <img
            src={process.env.PUBLIC_URL + '/logos/logo_white_with_name.png'}
            height='60vh'
            className='d-inline-block align-top'
            alt='Karlbruder logo'
          />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="menu">
          <AiOutlineMenu className='text-white' style={{fontSize: '30'}} />
        </Navbar.Toggle>
        <Navbar.Collapse id="menu" className='justify-content-end'>
          <Nav>
            <Nav.Link href='#about' style={navLink}>Sobre</Nav.Link>
            <Nav.Link href='#weapons' style={navLink}>Modalidades</Nav.Link>
            <Nav.Link href='#gallery' style={navLink}>Galeria</Nav.Link>
            <Nav.Link href='#partner' style={navLink}>Parceiros</Nav.Link>
            <Nav.Link href='#contact' style={navLink}>Contato</Nav.Link>
          </Nav>
          <Navbar.Brand href='#partner' className='justify-content-end'>
            <img 
              src="https://faitsdarmes.com/img/cms/partner-kit/white_blackbg.png" 
              alt="This club is an official partner of Faits d'Armes store"
              height='80vh'
              className='d-inline-block align-top'
            />
          </Navbar.Brand>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;