'use client'

import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CountryBadgeProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  fifa_code: string
  flag_svg_url: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const sizeVariants = {
  xs: {
    container: 'gap-1',
    flag: 'w-4 h-4',
    name: 'text-[0.6875rem]',
    code: 'hidden',
  },
  sm: {
    container: 'gap-1.5',
    flag: 'w-5 h-5',
    name: 'text-xs',
    code: 'text-[0.625rem]',
  },
  md: {
    container: 'gap-2',
    flag: 'w-6 h-6',
    name: 'text-sm',
    code: 'text-xs',
  },
  lg: {
    container: 'gap-2.5',
    flag: 'w-8 h-8',
    name: 'text-base',
    code: 'text-sm',
  },
}

export function CountryBadge({
  name,
  fifa_code,
  flag_svg_url,
  size = 'md',
  className,
  ...props
}: CountryBadgeProps) {
  const variants = sizeVariants[size]

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md bg-card border border-border shadow-sm px-2 py-1 md:px-3 md:py-1.5',
        variants.container,
        className
      )}
      {...props}
    >
      {flag_svg_url ? (
        <img
          src={flag_svg_url}
          alt={`${name} flag`}
          className={cn('flex-shrink-0 rounded-sm', variants.flag)}
          aria-hidden="true"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn('flex-shrink-0 rounded-sm border border-border bg-muted', variants.flag)}
        />
      )}

      <div className="flex min-w-0 flex-col gap-0.5">
        <div
          className={cn('truncate font-medium text-foreground', variants.name)}
          title={name}
        >
          {name}
        </div>
        <div
          className={cn('text-muted-foreground', variants.code)}
          aria-label={`FIFA code: ${fifa_code}`}
        >
          {fifa_code}
        </div>
      </div>
    </div>
  )
}
