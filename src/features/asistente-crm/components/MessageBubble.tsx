import ReactMarkdown from 'react-markdown'
import { Sparkles, User, AlertCircle } from 'lucide-react'
import type { AsistenteMessage } from '../types'

interface Props {
  message: AsistenteMessage
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const isError = message.error === true

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
            isError ? 'bg-red-100' : 'bg-blue-100'
          }`}
          aria-hidden="true"
        >
          {isError ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-600" />
          )}
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : isError
            ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-sm'
            : 'bg-slate-100 text-slate-900 rounded-bl-sm'
        }`}
      >
        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>

      {isUser && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center"
          aria-hidden="true"
        >
          <User className="w-4 h-4 text-slate-700" />
        </div>
      )}
    </div>
  )
}
