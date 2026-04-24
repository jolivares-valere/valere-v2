import { ExternalLink } from 'lucide-react'
import type { AsistenteSource } from '../types'

interface Props {
  sources: AsistenteSource[]
}

export function SourcesCitation({ sources }: Props) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-2 border-t border-slate-200 pt-2">
      <p className="text-xs font-medium text-slate-500 mb-1">Fuentes:</p>
      <ul className="space-y-1">
        {sources.map((source, i) => (
          <li key={`${source.path}-${i}`} className="text-xs">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
              >
                <span>{source.title}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-slate-600">{source.title}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
