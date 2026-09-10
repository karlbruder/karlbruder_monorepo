import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the Monomachia championship page', () => {
  window.history.pushState({}, '', '/monomachia');
  render(<App />);

  expect(
    screen.getByRole('heading', { name: /monomachia/i })
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/em breve, janeiro de 2027/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /ver o anúncio/i })).not.toBeInTheDocument();
  expect(screen.getAllByText(/são carlos, sp/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('link', { name: /sigi forge/i })).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /spes historical fencing gear/i })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /english/i }));
  expect(screen.getByText(/historical fencing championship/i)).toBeInTheDocument();
  expect(screen.getByText(/term has echoed through history/i)).toBeInTheDocument();
});
