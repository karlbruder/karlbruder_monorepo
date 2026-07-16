import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import MapsLink from './MapsLink';
import { useTranslation } from './LanguageContext';

const Training = () => {
        const { t } = useTranslation();
    return (
        <div id='training' className='bg-dark text-white pt-5 pb-5'>
            <Container fluid className='gap-5'>
                <Row className="justify-content-md-center pb-3">
                    <Col xs={12} md={4}>
                        <img src={process.env.PUBLIC_URL + `/ads/aula_sanca.jpg`}
                        style={{ objectFit: 'contain', width: '100%', display: 'block' }}
                        className="img-fluid"
                        alt="Imagem com informações das aulas em São Carlos."/>
                    </Col>
                    <Col xs={12} md={4} className='mt-4 mt-md-0'>
                        <h4>{t.training.saoCarlosRegular.title}</h4>

                        <b>{t.training.saoCarlosRegular.modality}</b>  <br/>
                        <b>{t.training.saoCarlosRegular.days}</b>      <br/>
                        <b>{t.training.saoCarlosRegular.time}</b>      <br/>
                        <b>{t.training.saoCarlosRegular.price}</b>     <br/>
                        <MapsLink href={"https://maps.app.goo.gl/S27W8DLRVZovKMg6A"} label={t.training.saoCarlosRegular.location}/> <br/>

                        <span>
                            {t.training.saoCarlosRegular.text} <br/>
                            {t.training.saoCarlosRegular.text2}
                        </span> <br/>

                        <hr/>

                        <h4>{t.training.saoCarlosBeginner.title}</h4>

                        <b>{t.training.saoCarlosBeginner.modality}</b> <br/>
                        <b>{t.training.saoCarlosBeginner.days}</b>                <br/>
                        <b>{t.training.saoCarlosBeginner.time}</b>        <br/>
                        <b>{t.training.saoCarlosBeginner.price}</b>     <br/>
                        <MapsLink href={"https://maps.app.goo.gl/kPUdDcUhz8uiug246"} label={t.training.saoCarlosBeginner.location}/> <br/>

                        <span>
                            {t.training.saoCarlosBeginner.text} <br/>
                            {t.training.saoCarlosBeginner.text2}
                        </span> <br/>

                        <hr/>

                        <h4>{t.training.saoCarlosOlympic.title}</h4>

                        <b>{t.training.saoCarlosOlympic.modality}</b> <br/>
                        <b>{t.training.saoCarlosOlympic.days}</b>             <br/>
                        <b>{t.training.saoCarlosOlympic.time}</b>          <br/>
                        <b>{t.training.saoCarlosOlympic.price}</b>       <br/>
                        <MapsLink href={"https://maps.app.goo.gl/S27W8DLRVZovKMg6A"} label={t.training.saoCarlosOlympic.location}/> <br/>

                        <span>
                            {t.training.saoCarlosOlympic.text} <br/>
                            {t.training.saoCarlosOlympic.text2}
                        </span> <br/>
                    </Col>
                </Row>
                <hr/>
                <Row className="flex-row-reverse justify-content-md-center pt-3">
                    <Col xs={12} md={4}>
                        <img src={process.env.PUBLIC_URL + `/ads/aula_itapira.jpg`}
                        style={{ objectFit: 'contain', width: '100%', display: 'block' }}
                        className="img-fluid"
                        alt="Imagem com informações das aulas em São Carlos."/>
                    </Col>
                    <Col xs={12} md={4} className='mt-4 mt-md-0'>
                        <h4>{t.training.itapiraLongsword.title}</h4>
                        <b>{t.training.itapiraLongsword.modality}</b> <br/>
                        <b>{t.training.itapiraLongsword.days}</b>                <br/>
                        <b>{t.training.itapiraLongsword.time}</b>           <br/>
                        <b>{t.training.itapiraLongsword.price}</b>           <br/>
                        <MapsLink href="https://maps.app.goo.gl/kdNhRqJdvh9TBZRP7" label={t.training.itapiraLongsword.location}/> <br/>

                        {t.training.itapiraLongsword.text} <br/>

                        <hr/>

                        <h4>{t.training.itapiraNewClass.title}</h4>
                        <b>{t.training.itapiraNewClass.modality}</b> <br/>
                        <b>{t.training.itapiraNewClass.days}</b> <br/>
                        <b>{t.training.itapiraNewClass.time}</b> <br/>
                        <b>{t.training.itapiraNewClass.price}</b> <br/>
                        <MapsLink href="https://maps.app.goo.gl/kdNhRqJdvh9TBZRP7" label={t.training.itapiraNewClass.location}/> <br/>

                        {t.training.itapiraNewClass.text}
                    </Col>

                </Row>
            </Container>
        </div>
    );
  };

export default Training;
