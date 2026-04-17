interface Props {
  className?: string
  variant?: 'line' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
}

export default function Skeleton({ className = '', variant = 'rect', width, height }: Props) {
  const base = 'animate-pulse bg-slate-200'
  const shape =
    variant === 'circle' ? 'rounded-full' :
    variant === 'line' ? 'rounded h-3' :
    'rounded-md'
  const style: React.CSSProperties = {}
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height
  return <div className={`${base} ${shape} ${className}`} style={style} aria-hidden />
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          variant="line"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-t border-slate-100">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="line" width={i === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <Skeleton variant="circle" width={40} height={40} className="mb-3" />
      <Skeleton className="mb-2 h-7 w-20" />
      <Skeleton variant="line" width="70%" />
    </div>
  )
}
