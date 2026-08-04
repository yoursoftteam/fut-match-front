import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface GoogleIconProps {
  size?: number
}

export function GoogleIcon({ size = 20 }: GoogleIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.8-.07-1.56-.2-2.3H12v4.35h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.28-2.1 3.56-5.2 3.56-8.67Z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3A7.2 7.2 0 0 1 12 19.3a7.15 7.15 0 0 1-6.72-4.95h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.28 14.35A7.2 7.2 0 0 1 4.9 12c0-.81.14-1.6.39-2.35v-3.1h-4A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.45l4-3.1Z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.33.6 4.57 1.77l3.42-3.42A11.9 11.9 0 0 0 12 0 12 12 0 0 0 1.29 6.55l4 3.1A7.15 7.15 0 0 1 12 4.77Z"
      />
    </Svg>
  )
}
