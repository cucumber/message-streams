import type { Readable } from 'node:stream'
import type { Envelope } from '@cucumber/messages'

export default function toArray(input: Readable): Promise<Envelope[]> {
  return new Promise((resolve, reject) => {
    const result: Envelope[] = []
    input.on('data', (wrapper: Envelope) => result.push(wrapper))
    input.on('end', () => resolve(result))
    input.on('error', (err: Error) => reject(err))
  })
}
