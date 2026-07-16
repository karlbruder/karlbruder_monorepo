import Carousel from 'react-bootstrap/Carousel';
import Container from 'react-bootstrap/Container';

const photos = [
  '0.jpg',
  '1.jpg',
  '2.jpg',
  '3.jpg',
];

const Banner = () => {
  return (
    <Container fluid  className='text-center bg-black'>
      <Carousel>
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

export default Banner
