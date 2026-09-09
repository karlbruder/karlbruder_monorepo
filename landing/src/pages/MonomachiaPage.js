import { useEffect } from 'react';
import { useTranslation } from '../components/LanguageContext';
import './MonomachiaPage.css';

const partners = [
  {
    name: 'Sparring Gloves',
    href: 'https://sparringglove.com/',
    logo: '/logos/logo_sparring_gloves.png',
  },
  {
    name: 'Manzini Swordmaker',
    href: 'https://linktr.ee/manziniswordmaker',
    logo: '/logos/logo_mazini.png',
  },
  {
    name: 'Canto do Aço',
    href: 'https://www.instagram.com/cantodoaco/',
    logo: '/logos/logo_canto_do_aco.png',
  },
  {
    name: 'Flèche Brasil',
    href: 'https://linktr.ee/flechebrasil',
    logo: '/logos/logo_fleche.jpg',
  },
  {
    name: "Faits D'Armes",
    href: 'https://www.faitsdarmes.com/en/',
    logo: '/logos/logo_faits_darmes_escuro.png',
    wide: true,
  },
];

const MonomachiaPage = () => {
  const { lang, changeLang, t } = useTranslation();
  const copy = t.monomachia;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = copy.pageTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [copy.pageTitle]);

  return (
    <div className="monomachia-page" lang={lang === 'pt' ? 'pt-BR' : 'en'}>
      <a className="monomachia-skip-link" href="#conteudo">
        {copy.skipContent}
      </a>

      <header className="monomachia-header">
        <a className="monomachia-wordmark" href="/" aria-label={copy.backHomeLabel}>
          <img src="/monomachia/logo.svg" alt="" />
          <span>
            <strong>Monomachia</strong>
            <small>Karlbrüder</small>
          </span>
        </a>

        <nav aria-label={copy.navLabel}>
          <a href="#evento">{copy.championshipNav}</a>
          <a href="#patrocinadores">{copy.sponsorsNav}</a>
          <div className="monomachia-languages" aria-label="Language / Idioma">
            <button
              type="button"
              className={lang === 'pt' ? 'is-active' : ''}
              onClick={() => changeLang('pt')}
              aria-label="Português"
              aria-pressed={lang === 'pt'}
            >
              <img src="/flags/br_flag.png" alt="" />
              <span>PT</span>
            </button>
            <button
              type="button"
              className={lang === 'en' ? 'is-active' : ''}
              onClick={() => changeLang('en')}
              aria-label="English"
              aria-pressed={lang === 'en'}
            >
              <img src="/flags/uk_flag.png" alt="" />
              <span>EN</span>
            </button>
          </div>
          <a className="monomachia-nav-home" href="/">{copy.homeNav}</a>
        </nav>
      </header>

      <main id="conteudo">
        <section className="monomachia-hero" id="evento">
          <div className="monomachia-hero-copy">
            <img
              className="monomachia-hero-logo"
              src="/monomachia/logo.svg"
              alt="Monomachia Karlbrüder"
            />
            <h1>{copy.eventName}</h1>
            <p className="monomachia-hero-brand">{copy.organizer}</p>
            <p className="monomachia-lead">{copy.eventType}</p>

            <div className="monomachia-date" aria-label={`${copy.moreInfo}, ${copy.dateLong}`}>
              <span>{copy.moreInfo}</span>
              <strong>{copy.date}</strong>
            </div>

            <div className="monomachia-location">
              <span aria-hidden="true">✦</span>
              {copy.location}
            </div>

            <div className="monomachia-actions">
              <a className="monomachia-button" href="#anuncio">{copy.announcement}</a>
              <a
                className="monomachia-text-link"
                href="https://www.instagram.com/karlbruder.hema/?hl=pt-br"
                target="_blank"
                rel="noreferrer"
              >
                {copy.instagram} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <section
            className="monomachia-hero-partners"
            id="patrocinadores"
            aria-labelledby="partners-title"
          >
            <div className="monomachia-hero-partners-heading">
              <span>{copy.sponsorsKicker}</span>
              <h2 id="partners-title">{copy.sponsors}</h2>
            </div>

            <div className="monomachia-partner-grid">
              {partners.map((partner) => (
                <a
                  className={`monomachia-partner-card${partner.wide ? ' monomachia-partner-card--wide' : ''}`}
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={partner.name}
                  aria-label={`${partner.name} (${copy.newTab})`}
                >
                  <img src={partner.logo} alt={`${partner.name} logo`} />
                  <span>{partner.name}</span>
                </a>
              ))}
            </div>
          </section>

          <div className="monomachia-poster-wrap" id="anuncio">
            <div className="monomachia-poster-shadow" aria-hidden="true" />
            <figure className="monomachia-poster">
              <img
                src="/monomachia/monomarcas.jpg"
                alt={copy.posterAlt}
              />
              <figcaption>Monomachia · MMXXVII</figcaption>
            </figure>
          </div>
        </section>

        <section className="monomachia-info" aria-labelledby="info-title">
          <div className="monomachia-info-heading">
            <p className="monomachia-section-label">{copy.prepare}</p>
            <h2 id="info-title">{copy.headline}</h2>
          </div>

          <div className="monomachia-info-content">
            <div className="monomachia-origin-copy">
              <p>
                <strong>Monomachia</strong> {copy.originStart} (<em>monos</em> = {copy.alone},
                {' '}<em>mache</em> = {copy.fight}) {copy.literalMeaning}{' '}
                <strong>{copy.definition}</strong>.
              </p>
              <p>
                {copy.history}
              </p>
            </div>

            <dl className="monomachia-facts">
              <div>
                <dt>{copy.when}</dt>
                <dd>{copy.dateLong}</dd>
              </div>
              <div>
                <dt>{copy.where}</dt>
                <dd>{copy.location}</dd>
              </div>
              <div>
                <dt>{copy.nextAnnouncements}</dt>
                <dd>{copy.nextAnnouncementsValue}</dd>
              </div>
            </dl>
          </div>
        </section>

      </main>

      <footer className="monomachia-footer">
        <div className="monomachia-footer-mark">
          <img src="/monomachia/logo.svg" alt="" />
          <div>
            <strong>Monomachia</strong>
            <span>{copy.footer}</span>
          </div>
        </div>
        <a href="/">Karlbrüder 2027</a>
      </footer>
    </div>
  );
};

export default MonomachiaPage;
