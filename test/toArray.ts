import * as messages from '@cucumber/messages'
import { Readable } from 'stream'

export default function toArray(input: Readable): Promise<messages.Envelope[]> {
  return new Promise((resolve, reject) => {
    const result: messages.Envelope[] = []
    input.on('data', (wrapper: messages.Envelope) => result.push(wrapper))
    input.on('end', () => resolve(result))
    input.on('error', (err: Error) => reject(err))
  })
}
