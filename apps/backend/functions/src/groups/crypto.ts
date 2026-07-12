import { createHash, randomInt } from 'node:crypto';

const INVITE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const INVITE_LENGTH = 24;
const INVITE_CHUNK_LENGTH = 4;

export function generateInviteCode(): string {
  let code = '';
  for (let index = 0; index < INVITE_LENGTH; index += 1) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return code.match(new RegExp(`.{1,${INVITE_CHUNK_LENGTH}}`, 'g'))?.join('-') ?? code;
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
