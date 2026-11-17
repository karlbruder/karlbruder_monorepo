import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

const originalApplicationUrl = process.env.REACT_APP_APPLICATION_URL;

beforeEach(() => {
  localStorage.setItem('lang', 'pt');
});

afterEach(() => {
  if (originalApplicationUrl === undefined) {
    delete process.env.REACT_APP_APPLICATION_URL;
  } else {
    process.env.REACT_APP_APPLICATION_URL = originalApplicationUrl;
  }
});

test('shows the championship page and links registration to the app, with no form on this site', () => {
  delete process.env.REACT_APP_APPLICATION_URL;
  window.history.pushState({}, '', '/monomachia');
  render(<App />);

  expect(
    screen.getByRole('heading', { name: /monomachia/i })
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/em breve, 16 e 17 de janeiro de 2027/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /ver o anúncio/i })).not.toBeInTheDocument();
  expect(screen.getAllByText(/são carlos, sp/i).length).toBeGreaterThan(0);
  for (const sponsor of [/manzini swordmaker/i, /canto do aço/i, /flèche brasil/i,
    /sparring gloves/i, /sigi forge/i, /spes historical fencing gear/i]) {
    expect(screen.getByRole('link', { name: sponsor })).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: /golpe de estado/i }))
    .toHaveAttribute('href', 'https://www.instagram.com/_golpedeestado_');
  expect(screen.queryByRole('link', { name: /faits d'armes/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Inscreva-se no Monomachia' }))
    .toHaveAttribute('href', 'https://app.karlbruder.com/tournaments/registration?lang=pt');
  expect(screen.getByText(/Social: R\$ 50 · Plena: R\$ 100 · Plus: R\$ 200/)).toBeInTheDocument();
  expect(screen.queryByRole('form')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /english/i }));
  expect(screen.getByText(/historical fencing championship/i)).toBeInTheDocument();
  expect(screen.getByText(/Social: R\$ 50 · Full: R\$ 100 · Plus: R\$ 200/)).toBeInTheDocument();
  expect(screen.getByText(/term has echoed through history/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Register for Monomachia' }))
    .toHaveAttribute('href', 'https://app.karlbruder.com/tournaments/registration?lang=en');

  fireEvent.click(screen.getByRole('button', { name: /português/i }));
  expect(screen.getByRole('link', { name: 'Inscreva-se no Monomachia' }))
    .toHaveAttribute('href', 'https://app.karlbruder.com/tournaments/registration?lang=pt');
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
});

test('shows both Faits D\'Armes and Golpe de Estado as homepage partners', () => {
  window.history.pushState({}, '', '/');
  render(<App />);

  expect(screen.getByRole('link', { name: /faits d'armes/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /golpe de estado/i }))
    .toHaveAttribute('href', 'https://www.instagram.com/_golpedeestado_');
});

test('forwards registration to a locally configured application URL', () => {
  process.env.REACT_APP_APPLICATION_URL = 'http://localhost:5173/';
  window.history.pushState({}, '', '/monomachia');
  render(<App />);

  expect(screen.getByRole('link', { name: 'Inscreva-se no Monomachia' }))
    .toHaveAttribute('href', 'http://localhost:5173/tournaments/registration?lang=pt');
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
});
