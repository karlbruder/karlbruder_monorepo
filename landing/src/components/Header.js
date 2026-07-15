import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import { AiOutlineMenu } from "react-icons/ai";
import { useTranslation } from './LanguageContext';

const navLink = {
  color: 'white',
  fontWeight: 'bold',
};

const Header = () => {
  // TODO resolve the active session highlight on navbar
  const { lang, changeLang, t } = useTranslation();
  return (
    <Navbar className='bg-dark' sticky='top' expand='md'>
      <Container fluid className='px-5'>
        <Navbar.Brand href='#'>
          <img
            src={process.env.PUBLIC_URL + '/logos/logo_white_with_name.png'}
            height='60vh'
            className='d-inline-block align-top'
            alt='Karlbrüder logo'
          />
        </Navbar.Brand>
        <div className='d-flex align-items-center ms-md-3 gap-2'>
              <button
                onClick={() => changeLang('pt')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  opacity: lang === 'pt' ? 1 : 0.5,
                }}
                aria-label="Português"
              >
                <img
                  src={process.env.PUBLIC_URL + '/flags/br_flag.png'}
                  alt='Português'
                  style={{ width: '28px', height: '28px', borderRadius: '4px' }}
                />
              </button>
              <button
                onClick={() => changeLang('en')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  opacity: lang === 'en' ? 1 : 0.5,
                }}
                aria-label="English"
              >
                <img
                  src={process.env.PUBLIC_URL + '/flags/uk_flag.png'}
                  alt='English'
                  style={{ width: '28px', height: '28px', borderRadius: '4px' }}
                />
              </button>
            </div>
        <Navbar.Toggle aria-controls="menu">
          <AiOutlineMenu className='text-white' style={{fontSize: '30'}} />
        </Navbar.Toggle>
        <Navbar.Collapse id="menu" className='justify-content-end'>
          <Nav>
            <Nav.Link href='#about' style={navLink}>{t.nav.about}</Nav.Link>
            <Nav.Link href='#weapons' style={navLink}>{t.nav.weapons}</Nav.Link>
            <Nav.Link href='#training' style={navLink}>{t.nav.training}</Nav.Link>
            <Nav.Link href='#gallery' style={navLink}>{t.nav.gallery}</Nav.Link>
            <Nav.Link href='#partner' style={navLink}>{t.nav.partner}</Nav.Link>
            <Nav.Link href='#contact' style={navLink}>{t.nav.contact}</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;