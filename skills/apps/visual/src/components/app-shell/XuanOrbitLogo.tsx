interface XuanOrbitLogoProps {
  className?: string;
}

export function XuanOrbitLogo({ className }: XuanOrbitLogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        data-logo-part="outer-disc"
        cx="50"
        cy="50"
        r="42"
        stroke="currentColor"
        strokeWidth="4"
        opacity="0.96"
      />
      <circle
        cx="50"
        cy="50"
        r="31"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.34"
      />
      <path
        data-logo-part="horizontal-orbit"
        d="M16 50C30 33 70 33 84 50C70 67 30 67 16 50Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.78"
      />
      <path
        data-logo-part="vertical-orbit"
        d="M50 16C67 30 67 70 50 84C33 70 33 30 50 16Z"
        stroke="var(--c-gold)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.72"
      />
      <path
        data-logo-part="star-core"
        d="M50 31L55.5 44.5L69 50L55.5 55.5L50 69L44.5 55.5L31 50L44.5 44.5L50 31Z"
        fill="rgb(var(--jade) / 0.18)"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle data-logo-part="anchor-star-left" cx="28" cy="50" r="3" fill="var(--chart-good-soft)" />
      <circle data-logo-part="anchor-star-right" cx="72" cy="50" r="3" fill="var(--chart-good-soft)" />
      <circle cx="50" cy="50" r="3.5" fill="var(--chart-good-soft)" />
    </svg>
  );
}
