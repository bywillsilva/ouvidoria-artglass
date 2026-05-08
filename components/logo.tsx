'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
  variant?: 'default' | 'white'
}

export function Logo({ className, showText = true, variant = 'default' }: LogoProps) {
  const textColor = variant === 'white' ? 'text-white' : 'text-secondary'
  const accentColor = variant === 'white' ? 'fill-white' : 'fill-primary'
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 40 40"
        className={cn('h-10 w-10', accentColor)}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="2" width="36" height="36" rx="4" className="fill-primary" />
        <path
          d="M10 30 L20 10 L30 30 M14 24 H26"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <rect x="17" y="20" width="6" height="8" rx="1" fill="white" fillOpacity="0.9" />
      </svg>
      {showText && (
        <div className="flex flex-col">
          <span className={cn('text-xl font-bold leading-tight tracking-tight', textColor)}>
            ArtGlass
          </span>
          <span className={cn('text-[10px] font-medium uppercase tracking-widest', variant === 'white' ? 'text-white/80' : 'text-muted-foreground')}>
            Esquadrias
          </span>
        </div>
      )}
    </div>
  )
}
