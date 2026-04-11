import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Transform, type TransformCallback } from 'node:stream'

import {
  type Attachment,
  AttachmentContentEncoding,
  type Envelope,
  IdGenerator,
} from '@cucumber/messages'
import mime from 'mime'

const alwaysInlinedTypes = ['text/x.cucumber.log+plain', 'text/uri-list']

const encodingsMap: Record<string, BufferEncoding> = {
  IDENTITY: 'utf-8',
  BASE64: 'base64',
}

export interface AttachmentExternalisingStreamOptions {
  /**
   * Controls which attachments are externalised:
   * - `false` (or omitted): pass through all messages unchanged
   * - `true`: externalise every attachment
   * - `ReadonlyArray<string>`: externalise only attachments whose `mediaType`
   *   matches one of the given patterns (e.g. `['image/*', 'video/*']`),
   *   where the subtype may be `*` to match any subtype
   * @remarks
   * Attachments with certain media types (e.g. `text/x.cucumber.log+plain`)
   * are always kept inline regardless of this option.
   */
  behaviour?: boolean | ReadonlyArray<string>
  /**
   * Directory to write externalised attachment files into
   */
  directory: string
  /**
   * Function used to generate unique IDs for attachment filenames. Defaults
   * to a UUID generator
   */
  newId?: IdGenerator.NewId
}

/**
 * A transform stream that externalises attachment bodies from a stream of
 * {@link Envelope}s by writing them to files in a given directory and
 * replacing each body with a relative URL pointing to the written file.
 */
export class AttachmentExternalisingStream extends Transform {
  private readonly writeOperations: Promise<void>[] = []
  private readonly options: Required<AttachmentExternalisingStreamOptions>

  constructor(options: AttachmentExternalisingStreamOptions) {
    super({ objectMode: true })
    this.options = {
      behaviour: false,
      ...options,
      newId: options.newId ?? IdGenerator.uuid(),
    }
  }

  public _transform(envelope: Envelope, _encoding: string, callback: TransformCallback): void {
    if (envelope.attachment && this.shouldExternalise(envelope.attachment)) {
      const { attachment, writeOperation } = rewriteAttachment(
        envelope.attachment,
        this.options.directory,
        this.options.newId
      )
      this.push({ ...envelope, attachment })
      if (writeOperation) {
        this.writeOperations.push(writeOperation)
      }
    } else {
      this.push(envelope)
    }
    callback()
  }

  private shouldExternalise(attachment: Attachment): boolean {
    const { behaviour } = this.options
    if (Array.isArray(behaviour)) {
      return (
        !alwaysInlinedTypes.includes(attachment.mediaType) &&
        behaviour.some((pattern) => matchMediaType(attachment.mediaType, pattern))
      )
    }
    return behaviour === true
  }

  public _flush(callback: TransformCallback): void {
    Promise.all(this.writeOperations).then(
      () => callback(),
      (err) => callback(err)
    )
  }
}

function matchMediaType(mediaType: string, pattern: string): boolean {
  const [patternType, patternSubtype] = pattern.split('/')
  const [type, subtype] = mediaType.split('/')
  return patternType === type && (patternSubtype === '*' || patternSubtype === subtype)
}

function rewriteAttachment(
  original: Attachment,
  directory: string,
  newId: () => string
): { attachment: Attachment; writeOperation?: Promise<void> } {
  if (alwaysInlinedTypes.includes(original.mediaType)) {
    return { attachment: original }
  }
  let filename = `attachment-${newId()}`
  const extension = mime.getExtension(original.mediaType)
  if (extension) {
    filename += `.${extension}`
  }
  const writeOperation = writeFile(
    path.join(directory, filename),
    Buffer.from(original.body, encodingsMap[original.contentEncoding])
  )
  const attachment: Attachment = {
    ...original,
    contentEncoding: AttachmentContentEncoding.IDENTITY,
    body: '',
    url: `./${filename}`,
  }
  return { attachment, writeOperation }
}
