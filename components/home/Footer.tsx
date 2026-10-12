'use client';

import Link from 'next/link';
import Image from 'next/image';
import { colors } from './homeTheme';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Simulation Catalog', href: '/public-catalog' },
      { label: 'Disciplines',        href: '/disciplines' },
      { label: 'LMS / LTI',          href: '/lti-info' },
      { label: 'Featured Simulation', href: '/public-catalog?scope=demo' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About BEDO',  href: '/about' },
      { label: 'Resources',   href: '/resources' },
      { label: 'Contact us',  href: '/resources' },
    ],
  },
  {
    title: 'Get Started',
    links: [
      { label: 'Explore Simulations', href: '/public-catalog' },
      { label: 'Try Demo',            href: '/public-catalog?scope=demo' },
      { label: 'Book Demo',           href: '/register' },
    ],
  },
  {
    title:'Find Us',
    links: [
      { label: 'Location', href: 'https://www.google.com/maps/place/BEDO+Company/@29.944313,30.878188,15z/data=!4m6!3m5!1s0x1458ff46aa1fc6df:0xd42851f2b39a89d9!8m2!3d29.9443125!4d30.8781875!16s%2Fg%2F11cmbmtv83?hl=en&entry=ttu&g_ep=EgoyMDI2MDgzMC4wIKXMDSoASAFQAw%3D%3D' },
      // { label: 'BEDO YouTube', href: 'https://www.youtube.com/@BEDO' },
      // { label: 'BEDO LinkedIn', href: 'https://www.linkedin.com/company/bedo/' },
    ],
  }
];

export default function Footer() {
  return (
    <footer style={{ background: colors.bgAlt, borderTop: `1px solid ${colors.border}` }}>
      <div
        style={{
          // maxWidth: 1160,
          margin: '0px 60px 0px',
          padding: '56px 24px 32px',
          display: 'grid',
          gridTemplateColumns: 'minmax(250px, 1.3fr) repeat(4, minmax(140px, 1fr))',
          gap: 200,
        }}
        className="home-footer-grid"
      >
        <div>
          <Image src="/bedo-logo.png" alt="BEDO" width={110} height={39} style={{ display: 'block', marginBottom: 12 }} />
          <p style={{ color: colors.body, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            BEDO Interactive 3D Simulation — browser-based simulations for engineering
            and computer science labs.
          </p>
        </div>

        {COLUMNS.map((col) => (
 (col.title!== 'Find Us')? (        
          <div key={col.title}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: colors.heading, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {col.title}
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} style={{ color: colors.body, fontSize: 13.5, textDecoration: 'none' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>):
          (
            <div key={col.title}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: colors.heading, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {col.title}
            </h3>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3454.187168091775!2d30.87599827617413!3d29.94431248190509!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1458ff46aa1fc6df%3A0xd42851f2b39a89d9!2sBEDO%20Company!5e0!3m2!1sen!2seg!4v1700000000000!5m2!1sen!2seg"
              width="100%"
              height="50%"
              style={{ border: 0, borderRadius: 8 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            </div>
          )
        ))}
      </div>

      <div
        style={{
          borderTop: `1px solid ${colors.border}`,

          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          // maxWidth: 1160,
          margin: '0px 60px 0px',
        }}
      >
        <span style={{ color: colors.body, fontSize: 12.5 }}>
          © {new Date().getFullYear()} BEDO Interactive 3D Simulation (SimuLearn).
        </span>
        <span style={{ color: colors.body, fontSize: 12.5 }}>
          Engineering &amp; Computer Science · WebGL · LMS/LTI Ready
        </span>
      </div>
    </footer>
  );
}
