import Carousel from 'react-bootstrap/Carousel';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { useTranslation } from './LanguageContext';
import './Banner.css';

const photos = [
  '0.jpg',
  '1.jpg',
  '2.jpg',
  '3.jpg',
];

const Banner = () => {
  const { t } = useTranslation();
  const copy = t.monomachia;

  return (
    <Container fluid className='text-center bg-black'>
      <Carousel>
        <Carousel.Item>
          <Link
            to="/monomachia"
            className="banner-monomachia"
            aria-label={`${copy.eventName} ${copy.organizer}. ${copy.dateLong}, ${copy.location}`}
          >
            <div className="banner-monomachia-copy">
              <div className="banner-monomachia-wordmark">
                <img
                  src={process.env.PUBLIC_URL + '/monomachia/logo.svg'}
                  alt=""
                />
                <span>
                  <strong>{copy.eventName}</strong>
                  <small>{copy.organizer}</small>
                </span>
              </div>

              <p className="banner-monomachia-lead">{copy.eventType}</p>

              <div
                className="banner-monomachia-date"
                aria-label={`${copy.moreInfo}, ${copy.dateLong}`}
              >
                <span>{copy.moreInfo}</span>
                <strong>{copy.date}</strong>
              </div>

              <div className="banner-monomachia-location">
                <span aria-hidden="true">✦</span>
                {copy.location}
              </div>
            </div>

            <div className="banner-monomachia-poster-wrap" aria-hidden="true">
              <div className="banner-monomachia-poster-shadow" />
              <figure className="banner-monomachia-poster">
                <img
                  src={process.env.PUBLIC_URL + '/monomachia/monomarcas.jpg'}
                  alt=""
                />
                <figcaption>Monomachia · MMXXVII</figcaption>
              </figure>
            </div>
          </Link>
        </Carousel.Item>
        {photos.map(photo => (
          <Carousel.Item key={photo}>
            <img
              src={process.env.PUBLIC_URL + `/banner/${photo}`}
              width='85%'
              className='d-inline-block'
              alt={`Karl Bruder Hematology banner ${photo.replace('.jpg', '')}`}
            />
          </Carousel.Item>
        ))}
      </Carousel>
    </Container>
  );
};

export default Banner;
