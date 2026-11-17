const partners = [
  {
    name: 'Manzini Swordmaker',
    href: 'https://linktr.ee/manziniswordmaker',
    logo: '/logos/logo_mazini.png',
    monomachia: true,
  },
  {
    name: 'Canto do Aço',
    href: 'https://www.instagram.com/cantodoaco/',
    logo: '/logos/logo_canto_do_aco.png',
    monomachia: true,
  },
  {
    name: 'Flèche Brasil',
    href: 'https://linktr.ee/flechebrasil',
    logo: '/logos/logo_fleche.jpg',
    monomachia: true,
  },
  {
    name: 'Sparring Gloves',
    href: 'https://sparringglove.com/',
    logo: '/logos/logo_sparring_gloves.png',
    monomachia: true,
  },
  {
    name: 'SIGI Forge',
    href: 'https://sigiforge.com/',
    logo: '/logos/logo_sigi_forge.png',
    monomachia: true,
  },
  {
    name: 'SPES Historical Fencing Gear',
    href: 'https://histfenc.eu/en/',
    logo: '/logos/logo_spes_histfenc.png',
    monomachia: true,
  },
  {
    name: "Faits D'Armes",
    href: 'https://www.faitsdarmes.com/en/',
    logo: '/logos/logo_faits_darmes_escuro.png',
    darkBackgroundLogo: '/logos/logo_faits_darmes.png',
    wide: true,
    monomachia: false,
  },
  {
    name: 'Golpe de Estado',
    href: 'https://www.instagram.com/_golpedeestado_',
    logo: '/logos/logo_golpe_de_estado.png',
    monomachia: true,
  },
];

export const monomachiaPartners = partners.filter((partner) => partner.monomachia);

export default partners;
