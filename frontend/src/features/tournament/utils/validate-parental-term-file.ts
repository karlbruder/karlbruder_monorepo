import type { AppCopyKey } from '@/utils/app-copy';

function detectContentType(leadingBytes: Uint8Array): string | null {
  if (
    leadingBytes.length >= 4 &&
    leadingBytes[0] === 0x25 &&
    leadingBytes[1] === 0x50 &&
    leadingBytes[2] === 0x44 &&
    leadingBytes[3] === 0x46
  ) {
    return 'application/pdf';
  }
  if (
    leadingBytes.length >= 3 &&
    leadingBytes[0] === 0xff &&
    leadingBytes[1] === 0xd8 &&
    leadingBytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    leadingBytes.length >= 8 &&
    leadingBytes[0] === 0x89 &&
    leadingBytes[1] === 0x50 &&
    leadingBytes[2] === 0x4e &&
    leadingBytes[3] === 0x47 &&
    leadingBytes[4] === 0x0d &&
    leadingBytes[5] === 0x0a &&
    leadingBytes[6] === 0x1a &&
    leadingBytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}

export const MAX_PARENTAL_TERM_UPLOAD_BYTES = 10 * 1024 * 1024;

async function readLeadingBytes(file: File, length: number): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    const all = new Uint8Array(await file.arrayBuffer());
    return all.subarray(0, Math.min(length, all.length));
  }
  const chunk = file.slice(0, length);
  if (typeof chunk.arrayBuffer === "function") {
    return new Uint8Array(await chunk.arrayBuffer());
  }
  return new Uint8Array(await new Response(chunk).arrayBuffer());
}

export async function validateParentalTermFile(file: File): Promise<AppCopyKey | null> {
  if (file.size < 1) {
    return 'Envie o termo de responsabilidade assinado em PDF ou imagem (JPEG ou PNG).';
  }
  if (file.size > MAX_PARENTAL_TERM_UPLOAD_BYTES) {
    return 'O termo de responsabilidade deve ter no máximo 10 MB.';
  }
  const leadingBytes = await readLeadingBytes(file, 16);
  if (!detectContentType(leadingBytes)) {
    return 'O termo de responsabilidade deve ser PDF, JPEG ou PNG.';
  }
  return null;
}
