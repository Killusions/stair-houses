import cryptoRandomString from 'crypto-random-string';

export const base64Encode = (msg: string) => {
  return Buffer.from(msg)
    .toString('base64')
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=/g, '~');
};

export const base64Decode = (msg: string) => {
  return Buffer.from(
    msg.replace(/_/g, '/').replace(/-/g, '+').replace(/~/g, '='),
    'base64'
  ).toString('utf-8');
};

export const makeId = (length: number) => {
  return cryptoRandomString({ length, type: 'alphanumeric' });
};
