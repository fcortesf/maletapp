import { it, expect } from 'vitest'
import { SseParser, type Frame } from './parser'
it('parses chunks, CRLF, comments, additive fields and multiline data', () => {
  const frames: Frame[] = [], parser = new SseParser(frame => frames.push(frame))
  for (const character of ': heartbeat\r\nevent: ready\r\ndata: {"version":1,\r\ndata: "expiresAt":"future"}\r\nignored: value\r\n\r\n') parser.push(character)
  expect(frames).toEqual([{ event: 'ready', data: '{"version":1,\n"expiresAt":"future"}' }])
  parser.push('event: items.changed\ndata: {}\n\n')
  expect(frames[1].event).toBe('items.changed')
})
