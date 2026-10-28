import type { SVGProps } from "react";

/**
 * Единая библиотека линейных иконок (stroke 1.6, скруглённые окончания).
 * Один стиль на весь интерфейс — публичную часть и кабинет.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.6l2.35 5.06 5.53.66-4.08 3.79 1.09 5.47L12 15.9l-4.89 2.68 1.09-5.47L4.12 9.32l5.53-.66L12 3.6Z" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v5M12 16v5M4.5 12h5M14.5 12h5M6.7 6.7l3 3M14.3 14.3l3 3M17.3 6.7l-3 3M9.7 14.3l-3 3" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 14.4A8.4 8.4 0 1 1 9.6 4a6.7 6.7 0 0 0 10.4 10.4Z" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5" />
    </svg>
  );
}

export function OrbitIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="9.2" ry="4.4" transform="rotate(-24 12 12)" />
      <circle cx="19.2" cy="7.6" r="1.5" />
    </svg>
  );
}

export function PlanetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="11.4" r="6.1" />
      <path d="M4.4 16.6c4 2.2 9.2 2.6 13.4.6M8.8 5.9c1.6 4.4 1.9 8.2.9 12.4" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.2 8.8-2 4.4-4.4 2 2-4.4 4.4-2Z" />
    </svg>
  );
}

export function CrystalIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2.8 19 9l-7 12.2L5 9l7-6.2Z" />
      <path d="M5 9h14M12 2.8 9.2 9l2.8 12.2L14.8 9 12 2.8Z" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.6" y="5.2" width="16.8" height="15" rx="2.6" />
      <path d="M3.6 10h16.8M8.4 3.4v3.4M15.6 3.4v3.4" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.4V12l3.2 2" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s6.4-6 6.4-11a6.4 6.4 0 1 0-12.8 0c0 5 6.4 11 6.4 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.4" r="3.9" />
      <path d="M4.8 20.2c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6" />
    </svg>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20.4 12.2c0 3.8-3.8 6.9-8.4 6.9-1 0-2-.1-2.9-.4l-4 1.4 1.2-3.4c-1.4-1.2-2.3-2.8-2.3-4.5 0-3.8 3.8-6.9 8.4-6.9s8 3.1 8 6.9Z" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.6" />
      <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.4 3.6h7.8l4.4 4.4v12.4H6.4V3.6Z" />
      <path d="M14.2 3.6V8h4.4M9.4 12.4h5.2M9.4 16h5.2" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.8 12h14.4M13.6 6.4 19.2 12l-5.6 5.6" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19.2 12H4.8M10.4 6.4 4.8 12l5.6 5.6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12.6 4.4 4.4L19 6.6" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5.4v13.2M5.4 12h13.2" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6.4 9.6 5.6 5.2 5.6-5.2" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.2a7.8 7.8 0 0 0 0-4.4l1.8-1.3-2-3.4-2.1.9a7.7 7.7 0 0 0-3.8-2.2L13 1.9h-4l-.3 1.9a7.7 7.7 0 0 0-3.8 2.2l-2.1-.9-2 3.4 1.8 1.3a7.8 7.8 0 0 0 0 4.4l-1.8 1.3 2 3.4 2.1-.9a7.7 7.7 0 0 0 3.8 2.2l.3 1.9h4l.3-1.9a7.7 7.7 0 0 0 3.8-2.2l2.1.9 2-3.4-1.8-1.3Z" />
    </svg>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.8 13.4 6.2 5h11.6l2.4 8.4v5.2a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8v-5.2Z" />
      <path d="M3.8 13.4h4.4l1 2h5.6l1-2h4.4" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 19.6V13M9.3 19.6V6.4M14.7 19.6v-4.2M20 19.6V8.6M2.8 21.4h18.4" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.6" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6.4h16M7 12h10M10 17.6h4" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15.4 8.2V5.6a1.8 1.8 0 0 0-1.8-1.8H6.2a1.8 1.8 0 0 0-1.8 1.8v12.8a1.8 1.8 0 0 0 1.8 1.8h7.4a1.8 1.8 0 0 0 1.8-1.8v-2.6" />
      <path d="M9.6 12h10.8M17 8.4l3.4 3.6-3.4 3.6" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2.2" />
      <path d="M15.6 5.8V4.8a1.4 1.4 0 0 0-1.4-1.4H4.8a1.4 1.4 0 0 0-1.4 1.4v9.4a1.4 1.4 0 0 0 1.4 1.4h1" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.2 5 6.4v4.8c0 4.4 3.2 7.8 7 8.8 3.8-1 7-4.4 7-8.8V6.4l-7-3.2Z" />
      <path d="m9 12 2.2 2.2 4-4.4" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.4" />
      <path d="m3.8 7 8.2 5.8L20.2 7" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20.6 3.8 3.6 10.4l6.4 2.6 2.4 6.4 8.2-15.6Z" />
      <path d="m10 13 5.4-5.2" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.2 4.2v4.4h-4.4" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.8 12S6 6.2 12 6.2 21.2 12 21.2 12 18 17.8 12 17.8 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  );
}
