const paths = {
  light: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  dark: <path d="M20.9 13.34A9 9 0 0 1 10.66 3.1 9 9 0 1 0 20.9 13.34Z" />,
  system: <><rect x="3" y="4" width="18" height="13" /><path d="M8 21h8m-4-4v4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};

export function HeaderIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className={`header-icon header-icon-${name}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
