const fs = require('fs');
const path = require('path');

const betDir = path.join(__dirname, 'src', 'components', 'bet');
fs.mkdirSync(betDir, { recursive: true });
console.log(`Created directory: ${betDir}`);

const components = {
  'CountryBadge.tsx': `import { FC } from 'react';
import { cn } from '@/lib/utils';

export interface CountryTeam {
  name: string;
  fifa_code: string;
  flag_svg_url: string;
}

export interface CountryBadgeProps {
  team: CountryTeam;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Displays a country badge with inline SVG flag, team name, and FIFA code.
 * Uses SVG only (no raster images) for crisp display at any scale.
 */
export const CountryBadge: FC<CountryBadgeProps> = ({
  team,
  size = 'md',
  className,
}) => {
  const sizeStyles = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const containerSizeStyles = {
    sm: 'gap-1.5',
    md: 'gap-2',
    lg: 'gap-2.5',
  };

  return (
    <div
      className={cn(
        'flex items-center rounded-md bg-slate-900 px-2.5 py-1.5',
        containerSizeStyles[size],
        className
      )}
      role="img"
      aria-label={\`\${team.name} (\${team.fifa_code})\`}
    >
      {/* Inline SVG flag */}
      <svg
        className={cn('flex-shrink-0', sizeStyles[size])}
        viewBox="0 0 900 600"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {team.flag_svg_url ? (
          <image
            href={team.flag_svg_url}
            x="0"
            y="0"
            width="900"
            height="600"
          />
        ) : (
          /* Fallback: simple placeholder */
          <rect width="900" height="600" fill="#94A3B8" />
        )}
      </svg>

      {/* Team info */}
      <div className="flex flex-col">
        <span className="font-semibold leading-none text-slate-50">
          {team.name}
        </span>
        <span className="text-slate-400 leading-none">
          {team.fifa_code}
        </span>
      </div>
    </div>
  );
};
`,
};

Object.entries(components).forEach(([filename, content]) => {
  const filePath = path.join(betDir, filename);
  fs.writeFileSync(filePath, content);
  console.log(`Created: ${filePath}`);
});
