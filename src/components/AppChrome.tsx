import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

/**
 * The landing app's chrome, reused on every accounts screen.
 *
 * Same 64px sticky header, same wordmark, same hairline footer — so moving
 * from tirbeo.com to accounts.tirbeo.com is a colour-scheme-preserving
 * transition, not a different product. What it does not carry is navigation:
 * this app has one job per screen, and a filled CTA in the header would compete
 * with the one on the screen beneath it. The wordmark is the way back out.
 */

const SITE = 'https://tirbeo.com';

const FOOTER_LINKS = [
  { href: `${SITE}/privacy`, label: 'Privacy' },
  { href: `${SITE}/terms`, label: 'Terms' },
  { href: `${SITE}/accessibility`, label: 'Accessibility' },
  { href: `${SITE}/contact`, label: 'Contact' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="site-header-inner">
        <a href={SITE} className="site-brand" aria-label="Tirbeo home">
          Tirbeo
        </a>

        <nav className="site-nav" aria-label="Page">
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>&copy; {new Date().getFullYear()} Tirbeo</p>
        <nav aria-label="Footer" className="site-footer-links">
          {FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
