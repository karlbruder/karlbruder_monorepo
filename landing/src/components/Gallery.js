import Carousel from 'react-bootstrap/Carousel';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const galleryPhotos = [
  '1.jpg',
  '2.jpg',
  '3.jpg',
  '4.jpg',
  '5.jpg',
  '6.jpg',
  '7.jpg',
  '8.jpg',
  '9.jpg',
  '10.jpg',
  '11.jpg',
  '12.jpg',
  '13.jpg',
  '14.jpg',
  '15.jpg',
  '16.jpg',
  '17.jpg',
  '18.jpg',
];

const PhotosGrid = ({ photos }) => {
  return (
    <>
      {photos.map(photo => (
        <Col key={photo} lg={4} sm={6} className='d-inline-block'>
          <img
            src={process.env.PUBLIC_URL + `/gallery/${photo}`}
            style={{width: '100%'}}
            alt={`Karl Bruder Hematology gallery photo ${photo.replace('.jpg', '')}`}
          />
        </Col>
      ))}
    </>
  )
};

const getPaginatedPhotos = (photos, n = 6) => {
  const pages = [];
  const photosCopy = [...photos];
  while (photosCopy.length) {
    pages.push(photosCopy.splice(0, n));
  }
  return pages;
};

const Gallery = () => {
  return (
    <div id='gallery'>
      <Container fluid  className='text-center bg-dark'>
        <Row>
          <Carousel>
            {getPaginatedPhotos(galleryPhotos).map((page, index) => (
              <Carousel.Item key={index}>
                <PhotosGrid photos={page}/>
              </Carousel.Item>
            ))}
          </Carousel>
        </Row>
      </Container>
    </div>
  );
};

export default Gallery;
