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
            <Carousel.Item>
              <img
                src={process.env.PUBLIC_URL + `/banner/${photo}`}
                width='85%'
                className='d-inline-block'
              />
            </Carousel.Item>
        ))}
      </Carousel>
    </Container>
  );
};

export default Banner