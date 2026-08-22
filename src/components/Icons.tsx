interface IconProps { size?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function IconToday({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
    </svg>
  );
}

export function IconWeek({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 15v4M9.7 9v10M14.3 12v7M19 5v14" />
    </svg>
  );
}

export function IconInsights({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 16.5l4.5-5.5 3.5 3L20 5" />
      <path d="M16.4 5H20v3.6" />
    </svg>
  );
}

export function IconManage({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function IconMic({ size = 24 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.9}>
      <rect x="9" y="2.6" width="6" height="11" rx="3" />
      <path d="M5.5 11.2a6.5 6.5 0 0013 0" />
      <path d="M12 17.7V21" />
    </svg>
  );
}

export function IconCheck({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.6}>
      <path d="M5 12.5l4.2 4.2L19 6.6" />
    </svg>
  );
}

export function IconX({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.4}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconPlus({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
