export type Frame = { event: string; data: string }
export class SseParser {
  private buffer = ''
  private event = ''
  private data: string[] = []
  constructor(private readonly receive: (frame: Frame) => void) {}
  push(chunk: string) {
    this.buffer += chunk
    if (this.buffer.length > 65536) throw new Error('Malformed stream')
    let end: number
    while ((end = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, end).replace(/\r$/, '')
      this.buffer = this.buffer.slice(end + 1)
      if (line === '') {
        if (this.data.length) this.receive({ event: this.event || 'message', data: this.data.join('\n') })
        this.event = ''; this.data = []
      } else if (!line.startsWith(':')) {
        const colon = line.indexOf(':')
        const field = colon < 0 ? line : line.slice(0, colon)
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '')
        if (field === 'event') this.event = value
        if (field === 'data') this.data.push(value)
      }
    }
  }
}
