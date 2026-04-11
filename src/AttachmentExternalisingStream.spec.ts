import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { type Attachment, AttachmentContentEncoding, type Envelope } from '@cucumber/messages'
import toArray from '../test/toArray'
import type { AttachmentExternalisingStreamOptions } from './AttachmentExternalisingStream'
import { AttachmentExternalisingStream } from './AttachmentExternalisingStream'

async function collectMessages(
  envelopes: Envelope[],
  options: AttachmentExternalisingStreamOptions
): Promise<Envelope[]> {
  const stream = new AttachmentExternalisingStream(options)
  for (const envelope of envelopes) {
    stream.write(envelope)
  }
  stream.end()
  return toArray(stream)
}

function getAttachment(envelope: Envelope): Attachment {
  assert.ok(envelope.attachment, 'expected envelope to have an attachment')
  return envelope.attachment
}

describe('AttachmentExternalisingStream', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cucumber-html-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('passes through all messages when behaviour is false', async () => {
    const envelopes: Envelope[] = [
      { testRunStarted: { timestamp: { seconds: 0, nanos: 0 } } },
      {
        attachment: {
          body: Buffer.from('hello').toString('base64'),
          contentEncoding: AttachmentContentEncoding.BASE64,
          mediaType: 'image/png',
        },
      },
    ]
    const result = await collectMessages(envelopes, { behaviour: false, directory: tmpDir })
    assert.deepStrictEqual(result, envelopes)
    assert.deepStrictEqual(fs.readdirSync(tmpDir), [])
  })

  it('passes through non-attachment messages unchanged', async () => {
    const envelope: Envelope = {
      testRunStarted: { timestamp: { seconds: 0, nanos: 0 } },
    }
    const result = await collectMessages([envelope], { behaviour: true, directory: tmpDir })
    assert.deepStrictEqual(result, [envelope])
  })

  it('externalises a BASE64 attachment', async () => {
    const body = Buffer.from('hello').toString('base64')
    const envelope: Envelope = {
      attachment: {
        body,
        contentEncoding: AttachmentContentEncoding.BASE64,
        mediaType: 'image/png',
      },
    }
    const result = await collectMessages([envelope], { behaviour: true, directory: tmpDir })
    const attachment = getAttachment(result[0])
    assert.strictEqual(attachment.body, '')
    assert.strictEqual(attachment.contentEncoding, AttachmentContentEncoding.IDENTITY)
    assert.ok(attachment.url)
    assert.match(attachment.url, /^\.\/attachment-.*\.png$/)
    const written = fs.readFileSync(path.join(tmpDir, attachment.url.slice(2)))
    assert.deepStrictEqual(written, Buffer.from('hello'))
  })

  it('externalises an IDENTITY attachment', async () => {
    const envelope: Envelope = {
      attachment: {
        body: '{"some":"json"}',
        contentEncoding: AttachmentContentEncoding.IDENTITY,
        mediaType: 'application/json',
      },
    }
    const result = await collectMessages([envelope], { behaviour: true, directory: tmpDir })
    const attachment = getAttachment(result[0])
    assert.strictEqual(attachment.body, '')
    assert.ok(attachment.url)
    assert.match(attachment.url, /^\.\/attachment-.*\.json$/)
    const written = fs.readFileSync(path.join(tmpDir, attachment.url.slice(2)), 'utf-8')
    assert.strictEqual(written, '{"some":"json"}')
  })

  it('does not externalise text/x.cucumber.log+plain', async () => {
    const envelope: Envelope = {
      attachment: {
        body: 'some log output',
        contentEncoding: AttachmentContentEncoding.IDENTITY,
        mediaType: 'text/x.cucumber.log+plain',
      },
    }
    const result = await collectMessages([envelope], { behaviour: true, directory: tmpDir })
    const attachment = getAttachment(result[0])
    assert.strictEqual(attachment.body, 'some log output')
    assert.strictEqual(attachment.url, undefined)
  })

  it('does not externalise text/uri-list', async () => {
    const envelope: Envelope = {
      attachment: {
        body: 'https://example.com',
        contentEncoding: AttachmentContentEncoding.IDENTITY,
        mediaType: 'text/uri-list',
      },
    }
    const result = await collectMessages([envelope], { behaviour: true, directory: tmpDir })
    const attachment = getAttachment(result[0])
    assert.strictEqual(attachment.body, 'https://example.com')
    assert.strictEqual(attachment.url, undefined)
  })

  it('externalises only attachments matching the given patterns', async () => {
    const envelopes: Envelope[] = [
      {
        attachment: {
          body: Buffer.from('image data').toString('base64'),
          contentEncoding: AttachmentContentEncoding.BASE64,
          mediaType: 'image/png',
        },
      },
      {
        attachment: {
          body: Buffer.from('video data').toString('base64'),
          contentEncoding: AttachmentContentEncoding.BASE64,
          mediaType: 'video/mp4',
        },
      },
      {
        attachment: {
          body: 'some text',
          contentEncoding: AttachmentContentEncoding.IDENTITY,
          mediaType: 'text/plain',
        },
      },
    ]
    const result = await collectMessages(envelopes, {
      behaviour: ['image/*', 'video/*'],
      directory: tmpDir,
    })
    const image = getAttachment(result[0])
    assert.strictEqual(image.body, '')
    assert.ok(image.url)
    const video = getAttachment(result[1])
    assert.strictEqual(video.body, '')
    assert.ok(video.url)
    const text = getAttachment(result[2])
    assert.strictEqual(text.body, 'some text')
    assert.strictEqual(text.url, undefined)
  })

  it('supports exact media type in patterns', async () => {
    const envelopes: Envelope[] = [
      {
        attachment: {
          body: Buffer.from('png data').toString('base64'),
          contentEncoding: AttachmentContentEncoding.BASE64,
          mediaType: 'image/png',
        },
      },
      {
        attachment: {
          body: Buffer.from('jpeg data').toString('base64'),
          contentEncoding: AttachmentContentEncoding.BASE64,
          mediaType: 'image/jpeg',
        },
      },
    ]
    const result = await collectMessages(envelopes, {
      behaviour: ['image/png'],
      directory: tmpDir,
    })
    const png = getAttachment(result[0])
    assert.strictEqual(png.body, '')
    assert.ok(png.url)
    const jpeg = getAttachment(result[1])
    assert.strictEqual(jpeg.body, Buffer.from('jpeg data').toString('base64'))
    assert.strictEqual(jpeg.url, undefined)
  })

  it('does not externalise always-inlined types even when matching patterns', async () => {
    const envelope: Envelope = {
      attachment: {
        body: 'some log output',
        contentEncoding: AttachmentContentEncoding.IDENTITY,
        mediaType: 'text/x.cucumber.log+plain',
      },
    }
    const result = await collectMessages([envelope], {
      behaviour: ['text/*'],
      directory: tmpDir,
    })
    const attachment = getAttachment(result[0])
    assert.strictEqual(attachment.body, 'some log output')
    assert.strictEqual(attachment.url, undefined)
  })
})
