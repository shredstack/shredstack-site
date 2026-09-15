// Hand-drawn dino / nugget / ketchup-cup icons, ported verbatim from the
// original cheer card mockup. Do not swap these for an icon library.

interface IconProps {
  size?: number;
}

export function DinoIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
      <g fill="#E9A13C">
        <ellipse cx="42" cy="50" rx="21" ry="16" />
        <path d="M22,54 C12,56 6,50 2,44 C-1,39 5,34 9,38 C14,44 18,48 26,47 Z" />
        <path d="M52,40 C54,30 60,22 68,20 L74,36 C68,40 62,44 58,50 Z" />
        <ellipse cx="72" cy="26" rx="14" ry="11" />
        <path d="M84,24 C90,22 94,26 91,29 C88,32 84,30 83,28 Z" />
        <rect x="34" y="60" width="10" height="15" rx="5" />
        <rect x="50" y="59" width="10" height="16" rx="5" />
        <path d="M56,44 C60,42 64,45 62,48 C60,51 56,49 55,47 Z" />
      </g>
    </svg>
  );
}

export function DinoRunningIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
      <g fill="#E9A13C">
        <ellipse cx="48" cy="52" rx="25" ry="15" />
        <path d="M22,52 C12,52 8,44 4,38 C1,33 7,28 11,32 C16,38 20,44 28,45 Z" />
        <path d="M60,46 C58,34 62,22 70,15 C74,11 82,13 81,19 C80,26 74,32 72,44 Z" />
        <ellipse cx="78" cy="16" rx="10.5" ry="8.5" />
        <path d="M88,15 C93,13 96,16 94,19 C92,22 88,21 87,19 Z" />
        <rect x="32" y="60" width="10" height="14" rx="5" />
        <rect x="52" y="60" width="10" height="14" rx="5" />
      </g>
    </svg>
  );
}

export function NuggetIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
      <g fill="#E9A13C">
        <path d="M16,48 C10,38 16,24 29,21 C37,19 41,27 50,22 C61,16 74,20 80,31
           C86,42 82,52 74,60 C66,68 54,74 42,70 C30,66 22,58 16,48 Z" />
      </g>
    </svg>
  );
}

export function KetchupIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
      <g>
        <path d="M24,40 L76,40 L68,82 C67,86 62,88 50,88 C38,88 33,86 32,82 Z" fill="#CE3A2C" />
        <path d="M20,32 L80,32 L80,42 L20,42 Z" fill="#CE3A2C" />
        <path d="M28,34 C34,24 42,30 48,22 C54,14 63,20 70,15 L72,34 Z" fill="#FCFAF5" />
        <path d="M32,52 L68,52 L66,62 L34,62 Z" fill="#FCFAF5" opacity=".55" />
      </g>
    </svg>
  );
}

export const ICONS = {
  dino: DinoIcon,
  'dino-running': DinoRunningIcon,
  nugget: NuggetIcon,
  ketchup: KetchupIcon,
} as const;
