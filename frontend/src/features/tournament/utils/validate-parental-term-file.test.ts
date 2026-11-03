import { describe, expect, it } from 'vitest'
import {
  MAX_PARENTAL_TERM_UPLOAD_BYTES,
  validateParentalTermFile,
} from '@/features/tournament/utils/validate-parental-term-file'

function fileFromBytes(bytes: Uint8Array, name: string): File {
  const file = new File([bytes], name, { type: 'application/octet-stream' })
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: () => Promise.resolve(bytes.slice().buffer),
  })
  return file
}

describe('validateParentalTermFile rejects disallowed uploads before presign', () => {
  it('accepts a small PDF by magic bytes', async () => {
    const pdf = fileFromBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'term.pdf')
    expect(await validateParentalTermFile(pdf)).toBeNull()
  })

  it('rejects HTML renamed to PDF', async () => {
    const html = fileFromBytes(new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]), 'term.pdf')
    expect(await validateParentalTermFile(html)).toBe('O termo de responsabilidade deve ser PDF, JPEG ou PNG.')
  })

  it('rejects files over 10 MB', async () => {
    const huge = fileFromBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46]), 'term.pdf')
    Object.defineProperty(huge, 'size', { value: MAX_PARENTAL_TERM_UPLOAD_BYTES + 1 })
    expect(await validateParentalTermFile(huge)).toBe('O termo de responsabilidade deve ter no máximo 10 MB.')
  })
})
