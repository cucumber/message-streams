import { Transform, type TransformCallback } from 'node:stream'
import { type Envelope, parseEnvelope } from '@cucumber/messages'

/**
 * Transforms an NDJSON stream to a stream of message objects
 */
export default class NdjsonToMessageStream extends Transform {
  private buffer = ''

  /**
   * Create a new stream
   *
   * @param parseLine a function that parses a line. This function may ignore a line by returning null.
   */
  constructor(private readonly parseLine: (line: string) => Envelope | null = parseEnvelope) {
    super({ writableObjectMode: false, readableObjectMode: true })
  }

  public _transform(chunk: string, _encoding: string, callback: TransformCallback): void {
    this.buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk
    const lines = this.buffer.split('\n')

    if (!lines.length) {
      callback()
      return
    }

    this.buffer = lines.pop() as string
    for (const line of lines) {
      if (line.trim().length > 0) {
        try {
          const envelope = this.parseLine(line)
          if (envelope !== null) {
            this.push(envelope)
          }
        } catch (cause) {
          callback(new Error(`Not JSON: '${line}'`, { cause }))
          return
        }
      }
    }
    callback()
  }

  public _flush(callback: TransformCallback): void {
    if (this.buffer) {
      try {
        const object = JSON.parse(this.buffer)
        this.push(object)
      } catch {
        callback(new Error(`Not JSONs: ${this.buffer}`))
        return
      }
    }
    callback()
  }
}
