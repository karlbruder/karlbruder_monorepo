
import { Header, Banner, About, Weapons, Training, Gallery, Partner, Contact, Footer } from './components';
import { LanguageProvider } from './components/LanguageContext';

const App = () => {
  return (
    <>
    <LanguageProvider>
      <Header/>
      <Banner/>
      <About/>
      <Weapons/>
      <Training/>
      <Gallery/>
      <Partner/>
      <Contact/>
      <Footer/>
    </LanguageProvider>
    </>
  );
}

export default App;
