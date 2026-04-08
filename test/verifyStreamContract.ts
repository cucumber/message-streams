import assert from 'node:assert'
import type { Transform } from 'node:stream'
import { AttachmentContentEncoding, type Envelope, SourceMediaType } from '@cucumber/messages'

import toArray from './toArray'

export default function verifyStreamContract(
  makeFromMessageStream: () => Transform,
  makeToMessageStream: () => Transform
) {
  describe('contract', () => {
    it('can be serialised over a stream', async () => {
      const fromMessageStream = makeFromMessageStream()
      const toMessageStream = makeToMessageStream()

      fromMessageStream.pipe(toMessageStream)

      const outgoingMessages: Envelope[] = [
        {
          source: {
            data: 'Feature: Hello',
            uri: 'hello.feature',
            mediaType: SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
          },
        },
        {
          attachment: {
            body: 'hello',
            contentEncoding: AttachmentContentEncoding.IDENTITY,
            mediaType: 'text/plain',
          },
        },
      ]

      for (const outgoingMessage of outgoingMessages) {
        fromMessageStream.write(outgoingMessage)
      }
      fromMessageStream.end()

      const incomingMessages = await toArray(toMessageStream)

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(incomingMessages)),
        JSON.parse(JSON.stringify(outgoingMessages))
      )
    })
  })
}
