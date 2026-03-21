import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeMap = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Hexagon N logo - placeholder for now */}
      <div 
        className={`
          flex items-center justify-center 
          border-2 border-green-500 
          bg-gradient-to-br from-green-400 to-green-600
          ${size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'}
          rounded-lg
        `}
      >
        <span className={`
          font-bold text-white
          ${size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'}
        `}>
          N
        </span>
      </div>
      
      {/* NEST text */}
      <span className={`
        font-bold text-green-500
        ${size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'}
      `}>
        NEST
      </span>
    </div>
  )
}
