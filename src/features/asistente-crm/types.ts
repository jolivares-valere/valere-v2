export interface AsistenteSource {
  title: string
  path: string
  url: string | null
  similarity: number
  section: string
}

export interface AsistenteMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: AsistenteSource[]
  error?: boolean
}

export interface AsistenteResponse {
  answer: string
  sources: AsistenteSource[]
  provider?: string
  error?: string
}
