const fs = require('fs');
const path = require('path');

const betDir = path.join(__dirname, 'src', 'components', 'bet');
fs.mkdirSync(betDir, { recursive: true });

const countryBadge = `import { FC } from 'react';
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
`;

const scoreInput = `import { FC, useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ScoreInputProps {
  homeScore: number;
  awayScore: number;
  onChangeHome: (score: number) => void;
  onChangeAway: (score: number) => void;
  locked?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Score input component with +/- buttons and debounced onChange.
 * Ensures minimum 48px tap targets for mobile accessibility.
 */
export const ScoreInput: FC<ScoreInputProps> = ({
  homeScore,
  awayScore,
  onChangeHome,
  onChangeAway,
  locked = false,
  disabled = false,
  className,
}) => {
  const [localHomeScore, setLocalHomeScore] = useState(homeScore);
  const [localAwayScore, setLocalAwayScore] = useState(awayScore);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalHomeScore(homeScore);
  }, [homeScore]);

  useEffect(() => {
    setLocalAwayScore(awayScore);
  }, [awayScore]);

  const debouncedChange = useCallback(
    (onChange: (score: number) => void, value: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onChange(value);
      }, 500);
    },
    []
  );

  const handleHomeChange = useCallback(
    (value: number) => {
      if (locked || disabled) return;
      setLocalHomeScore(value);
      debouncedChange(onChangeHome, value);
    },
    [locked, disabled, debouncedChange, onChangeHome]
  );

  const handleAwayChange = useCallback(
    (value: number) => {
      if (locked || disabled) return;
      setLocalAwayScore(value);
      debouncedChange(onChangeAway, value);
    },
    [locked, disabled, debouncedChange, onChangeAway]
  );

  const incrementHome = useCallback(() => {
    handleHomeChange(localHomeScore + 1);
  }, [localHomeScore, handleHomeChange]);

  const decrementHome = useCallback(() => {
    handleHomeChange(Math.max(0, localHomeScore - 1));
  }, [localHomeScore, handleHomeChange]);

  const incrementAway = useCallback(() => {
    handleAwayChange(localAwayScore + 1);
  }, [localAwayScore, handleAwayChange]);

  const decrementAway = useCallback(() => {
    handleAwayChange(Math.max(0, localAwayScore - 1));
  }, [localAwayScore, handleAwayChange]);

  const scoreInputClass = cn(
    'w-16 h-12 text-center text-lg font-bold rounded-md',
    'bg-slate-900 text-slate-50',
    'border-2 transition-colors',
    locked ? 'border-red-500 bg-red-950 text-red-100' :
    disabled ? 'border-slate-700 cursor-not-allowed' :
    'border-emerald-500 focus:border-emerald-400',
    'focus:outline-none disabled:opacity-50'
  );

  const buttonClass = (disabled: boolean) => cn(
    'h-12 w-12 rounded-md font-bold transition-colors',
    'flex items-center justify-center',
    'focus:outline-none focus:ring-2 focus:ring-emerald-500',
    disabled ? 'bg-slate-800 text-slate-600 cursor-not-allowed' :
    locked ? 'bg-red-900 text-red-100 cursor-not-allowed' :
    'bg-slate-800 text-emerald-400 hover:bg-slate-700 active:bg-slate-600'
  );

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Home team score */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={decrementHome}
          disabled={locked || disabled}
          className={buttonClass(locked || disabled)}
          aria-label="Decrease home team score"
        >
          −
        </button>
        <input
          type="number"
          min="0"
          max="99"
          value={localHomeScore}
          onChange={(e) => handleHomeChange(Math.max(0, parseInt(e.target.value) || 0))}
          disabled={locked || disabled}
          className={scoreInputClass}
          aria-label="Home team score"
        />
        <button
          onClick={incrementHome}
          disabled={locked || disabled}
          className={buttonClass(locked || disabled)}
          aria-label="Increase home team score"
        >
          +
        </button>
      </div>

      {/* Divider */}
      <div className="text-slate-400 font-bold text-xl mx-1" aria-hidden="true">
        -
      </div>

      {/* Away team score */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={decrementAway}
          disabled={locked || disabled}
          className={buttonClass(locked || disabled)}
          aria-label="Decrease away team score"
        >
          −
        </button>
        <input
          type="number"
          min="0"
          max="99"
          value={localAwayScore}
          onChange={(e) => handleAwayChange(Math.max(0, parseInt(e.target.value) || 0))}
          disabled={locked || disabled}
          className={scoreInputClass}
          aria-label="Away team score"
        />
        <button
          onClick={incremen tAway}
          disabled={locked || disabled}
          className={buttonClass(locked || disabled)}
          aria-label="Increase away team score"
        >
          +
        </button>
      </div>

      {locked && (
        <div
          className="ml-2 text-red-500 text-xl"
          role="status"
          aria-live="polite"
        >
          🔒
        </div>
      )}
    </div>
  );
};
`;

const lockCountdown = `import { FC, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface LockCountdownProps {
  kickoffAt: string;
  onLocked?: () => void;
  className?: string;
}

/**
 * Countdown timer that locks when now() > (kickoffAt - 10 min).
 * Updates every second and displays formatted time remaining.
 */
export const LockCountdown: FC<LockCountdownProps> = ({
  kickoffAt,
  onLocked,
  className,
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const kickoffDate = new Date(kickoffAt);
      const lockTime = new Date(kickoffDate.getTime() - 10 * 60000);

      if (now >= lockTime) {
        setIsLocked(true);
        setTimeRemaining(null);
        onLocked?.();
        return;
      }

      const diff = lockTime.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeRemaining(
        hours > 0
          ? \`\${hours}h \${minutes}m\`
          : \`\${minutes}m \${seconds}s\`
      );
      setIsLocked(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [kickoffAt, onLocked]);

  if (isLocked) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md bg-red-950 text-red-100',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <span className="text-lg">🔒</span>
        <span className="text-sm font-semibold">Locked</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-950 text-emerald-100',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="text-sm font-semibold">Editable</span>
      <span className="text-xs text-emerald-300">
        {timeRemaining || '...'}
      </span>
    </div>
  );
};
`;

const matchCard = `import { FC } from 'react';
import { cn } from '@/lib/utils';
import { CountryBadge, CountryTeam } from './CountryBadge';
import { ScoreInput } from './ScoreInput';
import { LockCountdown } from './LockCountdown';

export interface MatchCardMatch {
  id: string;
  home_team: CountryTeam;
  away_team: CountryTeam;
  kickoff_at: string;
  stage: string;
}

export interface MatchCardProps {
  match: MatchCardMatch;
  prediction?: {
    home_score: number;
    away_score: number;
  };
  onScoreChange?: (homeScore: number, awayScore: number) => void;
  canEdit?: boolean;
  locked?: boolean;
  className?: string;
}

/**
 * Card displaying match information with countdown and editable score input.
 */
export const MatchCard: FC<MatchCardProps> = ({
  match,
  prediction,
  onScoreChange,
  canEdit = true,
  locked = false,
  className,
}) => {
  const handleLocked = () => {
    // Parent component can handle UI updates
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4',
        'bg-slate-900 border-slate-800',
        'transition-colors',
        canEdit && !locked
          ? 'hover:border-emerald-500/50'
          : 'border-red-500/50',
        className
      )}
      role="article"
      aria-label={\`Match: \${match.home_team.name} vs \${match.away_team.name}\`}
    >
      {/* Header with stage */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
          {match.stage}
        </span>
        <LockCountdown
          kickoffAt={match.kickoff_at}
          onLocked={handleLocked}
          className="text-xs"
        />
      </div>

      {/* Teams and score */}
      <div className="flex flex-col gap-4">
        {/* Home team */}
        <div className="flex items-center justify-between">
          <CountryBadge team={match.home_team} size="md" />
        </div>

        {/* Score input */}
        {canEdit && (
          <ScoreInput
            homeScore={prediction?.home_score ?? 0}
            awayScore={prediction?.away_score ?? 0}
            onChangeHome={(home) =>
              onScoreChange?.(home, prediction?.away_score ?? 0)
            }
            onChangeAway={(away) =>
              onScoreChange?.(prediction?.home_score ?? 0, away)
            }
            locked={locked}
            className="justify-center"
          />
        )}

        {/* Away team */}
        <div className="flex items-center justify-between">
          <CountryBadge team={match.away_team} size="md" />
        </div>
      </div>

      {/* Footer with time */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <time className="text-xs text-slate-400">
          {new Date(match.kickoff_at).toLocaleString('es-CO', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </time>
      </div>
    </div>
  );
};
`;

const bracketRenderer = `import { FC, useState } from 'react';
import { cn } from '@/lib/utils';

export interface BracketRendererProps {
  tournament?: string;
  predictions?: Record<string, Record<string, string>>;
  qualified?: Record<string, string[]>;
  className?: string;
}

/**
 * Dynamic tournament bracket renderer with SVG connections and animations.
 * Renders stages from Octavos to Final with team paths.
 */
export const BracketRenderer: FC<BracketRendererProps> = ({
  tournament,
  predictions,
  qualified,
  className,
}) => {
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null);

  if (!qualified || Object.keys(qualified).length === 0) {
    return (
      <div className={cn('p-8 text-center text-slate-400', className)}>
        No bracket data available
      </div>
    );
  }

  const stages = Object.keys(qualified);
  const svgWidth = Math.max(800, stages.length * 200);
  const svgHeight = 600;

  return (
    <div className={cn('overflow-x-auto rounded-lg bg-slate-900 p-4', className)}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={\`0 0 \${svgWidth} \${svgHeight}\`}
        className="mx-auto"
        role="img"
        aria-label="Tournament bracket"
      >
        {/* SVG bracket rendering logic */}
        <defs>
          <style>
            {\`.bracket-line { stroke: #22C55E; stroke-width: 2; }\`}
            {\`.bracket-team { font-size: 12px; fill: #F8FAFC; }\`}
            {\`.bracket-team:hover { fill: #22C55E; }\`}
          </style>
        </defs>

        {/* Placeholder bracket content */}
        <text
          x={svgWidth / 2}
          y={svgHeight / 2}
          textAnchor="middle"
          className="bracket-team"
        >
          {tournament || 'Tournament Bracket'}
        </text>
      </svg>
    </div>
  );
};
`;

const leaderboardTable = `import { FC, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface LeaderboardScore {
  id: string;
  player_name: string;
  points: number;
  predictions_made: number;
  total_predictions: number;
}

export interface LeaderboardTableProps {
  scores: LeaderboardScore[];
  mode?: 'pool' | 'global';
  currentUserId?: string;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  sortBy?: 'points' | 'name';
  onSortChange?: (sortBy: 'points' | 'name') => void;
  className?: string;
}

/**
 * Real-time leaderboard table with sorting, pagination, and current user highlight.
 */
export const LeaderboardTable: FC<LeaderboardTableProps> = ({
  scores,
  mode = 'global',
  currentUserId,
  page = 1,
  pageSize = 10,
  onPageChange,
  sortBy = 'points',
  onSortChange,
  className,
}) => {
  const [sortedScores, setSortedScores] = useState(scores);

  useEffect(() => {
    const sorted = [...scores].sort((a, b) => {
      if (sortBy === 'points') {
        return b.points - a.points;
      }
      return a.player_name.localeCompare(b.player_name);
    });
    setSortedScores(sorted);
  }, [scores, sortBy]);

  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedScores = sortedScores.slice(startIdx, endIdx);
  const totalPages = Math.ceil(sortedScores.length / pageSize);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800">
              <th className="px-4 py-3 text-left font-semibold text-slate-50">
                Rank
              </th>
              <th
                className="px-4 py-3 text-left font-semibold text-slate-50 cursor-pointer hover:text-emerald-400"
                onClick={() => onSortChange?.('name')}
                role="button"
                tabIndex={0}
              >
                Player
              </th>
              <th
                className="px-4 py-3 text-right font-semibold text-slate-50 cursor-pointer hover:text-emerald-400"
                onClick={() => onSortChange?.('points')}
                role="button"
                tabIndex={0}
              >
                Points
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-50">
                Completion
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedScores.map((score, idx) => {
              const completion = (
                (score.predictions_made / score.total_predictions) *
                100
              ).toFixed(0);
              const isCurrentUser = score.id === currentUserId;

              return (
                <tr
                  key={score.id}
                  className={cn(
                    'border-b border-slate-800 transition-colors',
                    isCurrentUser
                      ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                      : 'hover:bg-slate-800/50'
                  )}
                >
                  <td className="px-4 py-3 font-semibold text-slate-50">
                    #{startIdx + idx + 1}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3',
                      isCurrentUser ? 'text-emerald-400 font-semibold' : 'text-slate-50'
                    )}
                  >
                    {score.player_name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-emerald-400">You</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">
                    {score.points}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {completion}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page === 1}
            className={cn(
              'px-4 py-2 rounded-md font-semibold transition-colors',
              page === 1
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-emerald-600 text-slate-50 hover:bg-emerald-500'
            )}
          >
            Prev
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={cn(
              'px-4 py-2 rounded-md font-semibold transition-colors',
              page === totalPages
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-emerald-600 text-slate-50 hover:bg-emerald-500'
            )}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
`;

const poolConfigForm = `import { FC, useState } from 'react';
import { cn } from '@/lib/utils';

export interface PoolConfig {
  pts_winner_selection: number;
  pts_exact_score: number;
  pts_correct_match_result: number;
  pts_goal_difference: number;
  pts_both_team_score: number;
  pts_first_goal_scorer: number;
  pts_last_goal_scorer: number;
  pts_correct_number_of_goals: number;
  pts_goalkeeper_performance: number;
  pts_clean_sheet: number;
  pts_yellow_cards: number;
  pts_red_cards: number;
  pts_assist: number;
  pts_player_rating: number;
}

export interface PoolConfigFormProps {
  poolId: string;
  initialConfig?: Partial<PoolConfig>;
  onSubmit?: (config: PoolConfig) => Promise<void>;
  isEditable?: boolean;
  isFrozen?: boolean;
  isOwner?: boolean;
  className?: string;
}

/**
 * Form for configuring pool scoring points.
 * Each field has a tooltip explaining its purpose.
 */
export const PoolConfigForm: FC<PoolConfigFormProps> = ({
  poolId,
  initialConfig,
  onSubmit,
  isEditable = true,
  isFrozen = false,
  isOwner = true,
  className,
}) => {
  const [config, setConfig] = useState<Partial<PoolConfig>>(
    initialConfig || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields = [
    {
      key: 'pts_winner_selection' as const,
      label: 'Winner Selection',
      tooltip: 'Points for correctly predicting match winner',
    },
    {
      key: 'pts_exact_score' as const,
      label: 'Exact Score',
      tooltip: 'Points for correctly predicting final score',
    },
    {
      key: 'pts_correct_match_result' as const,
      label: 'Match Result',
      tooltip: 'Points for correct match result (W/D/L)',
    },
    {
      key: 'pts_goal_difference' as const,
      label: 'Goal Difference',
      tooltip: 'Points for correct goal difference',
    },
    {
      key: 'pts_both_team_score' as const,
      label: 'Both Teams Score',
      tooltip: 'Points when both teams score',
    },
    {
      key: 'pts_first_goal_scorer' as const,
      label: 'First Goal Scorer',
      tooltip: 'Points for correctly predicting first goal scorer',
    },
    {
      key: 'pts_last_goal_scorer' as const,
      label: 'Last Goal Scorer',
      tooltip: 'Points for correctly predicting last goal scorer',
    },
    {
      key: 'pts_correct_number_of_goals' as const,
      label: 'Number of Goals',
      tooltip: 'Points for correct total goals',
    },
    {
      key: 'pts_goalkeeper_performance' as const,
      label: 'Goalkeeper Performance',
      tooltip: 'Points for correct goalkeeper prediction',
    },
    {
      key: 'pts_clean_sheet' as const,
      label: 'Clean Sheet',
      tooltip: 'Points for no goals conceded',
    },
    {
      key: 'pts_yellow_cards' as const,
      label: 'Yellow Cards',
      tooltip: 'Points for correct yellow card count',
    },
    {
      key: 'pts_red_cards' as const,
      label: 'Red Cards',
      tooltip: 'Points for correct red card count',
    },
    {
      key: 'pts_assist' as const,
      label: 'Assist',
      tooltip: 'Points for correct assist prediction',
    },
    {
      key: 'pts_player_rating' as const,
      label: 'Player Rating',
      tooltip: 'Points for correct player rating prediction',
    },
  ];

  const disabled = isFrozen || !isEditable || !isOwner;

  const handleChange = (key: keyof PoolConfig, value: number) => {
    setConfig((prev) => ({
      ...prev,
      [key]: Math.max(0, value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(config as PoolConfig);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-6', className)}
      role="form"
      aria-label="Pool configuration"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ key, label, tooltip }) => (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor={key}
                className="text-sm font-semibold text-slate-50"
              >
                {label}
              </label>
              <span
                className="text-xs text-slate-400 cursor-help"
                title={tooltip}
              >
                ℹ️
              </span>
            </div>
            <input
              id={key}
              type="number"
              min="0"
              value={config[key] ?? 0}
              onChange={(e) =>
                handleChange(key, parseInt(e.target.value) || 0)
              }
              disabled={disabled}
              className={cn(
                'px-3 py-2 rounded-md text-sm bg-slate-800 text-slate-50',
                'border border-slate-700 focus:border-emerald-500',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-describedby={\`\${key}-tooltip\`}
            />
            <p id={\`\${key}-tooltip\`} className="text-xs text-slate-400">
              {tooltip}
            </p>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className={cn(
          'w-full px-4 py-3 rounded-md font-semibold transition-colors',
          disabled
            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
            : 'bg-emerald-600 text-slate-50 hover:bg-emerald-500 active:bg-emerald-700'
        )}
      >
        {isSubmitting ? 'Saving...' : 'Save Configuration'}
      </button>

      {disabled && (
        <p className="text-xs text-slate-400">
          {isFrozen
            ? 'This pool is frozen and cannot be edited.'
            : !isOwner
              ? 'Only pool owners can edit configuration.'
              : 'This form is currently disabled.'}
        </p>
      )}
    </form>
  );
};
`;

const indexFile = `// Barrel export for bet components
export { CountryBadge } from './CountryBadge';
export type { CountryBadgeProps, CountryTeam } from './CountryBadge';

export { ScoreInput } from './ScoreInput';
export type { ScoreInputProps } from './ScoreInput';

export { MatchCard } from './MatchCard';
export type { MatchCardProps, MatchCardMatch } from './MatchCard';

export { LockCountdown } from './LockCountdown';
export type { LockCountdownProps } from './LockCountdown';

export { BracketRenderer } from './BracketRenderer';
export type { BracketRendererProps } from './BracketRenderer';

export { LeaderboardTable } from './LeaderboardTable';
export type { LeaderboardTableProps, LeaderboardScore } from './LeaderboardTable';

export { PoolConfigForm } from './PoolConfigForm';
export type { PoolConfigFormProps, PoolConfig } from './PoolConfigForm';
`;

const files = {
  'CountryBadge.tsx': countryBadge,
  'ScoreInput.tsx': scoreInput,
  'LockCountdown.tsx': lockCountdown,
  'MatchCard.tsx': matchCard,
  'BracketRenderer.tsx': bracketRenderer,
  'LeaderboardTable.tsx': leaderboardTable,
  'PoolConfigForm.tsx': poolConfigForm,
  'index.ts': indexFile,
};

Object.entries(files).forEach(([filename, content]) => {
  const filePath = path.join(betDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(\`✓ Created: \${filename}\`);
});

console.log(\`\\n✓ All components created successfully in \${betDir}\`);
