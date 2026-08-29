"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Sponsor = {
  name: string;
  image: string;
  href?: string;
};

const sponsors: Sponsor[] = [
  { name: "Sponsor 1", image: "/sponsors/sponsor-1.svg", href: "#" },
  { name: "Sponsor 2", image: "/sponsors/sponsor-2.svg", href: "#" },
  { name: "Sponsor 3", image: "/sponsors/sponsor-3.svg", href: "#" },
];

export default function SponsorCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (sponsors.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % sponsors.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, []);

  const sponsor = sponsors[activeIndex];

  const banner = (
    <div className="supporters-hub-sponsor-banner">
      <Image
        src={sponsor.image}
        alt={`Sponsor: ${sponsor.name}`}
        fill
        priority={activeIndex === 0}
        sizes="(max-width: 640px) 100vw, 544px"
        className="supporters-hub-sponsor-image"
      />
      <span className="supporters-hub-sponsor-label">Sponsor</span>
    </div>
  );

  return (
    <section className="supporters-hub-sponsor" aria-label="Sponsors">
      {sponsor.href && sponsor.href !== "#" ? (
        <a href={sponsor.href} target="_blank" rel="noreferrer" aria-label={`Open website van ${sponsor.name}`}>
          {banner}
        </a>
      ) : (
        banner
      )}

      {sponsors.length > 1 ? (
        <div className="supporters-hub-sponsor-dots" aria-label="Sponsor kiezen">
          {sponsors.map((item, index) => (
            <button
              key={item.name}
              type="button"
              className={index === activeIndex ? "is-active" : ""}
              aria-label={`Toon ${item.name}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
