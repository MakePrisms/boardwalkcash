// Util script for decrypting Open Secret responses
// Run with `bun run <path>/decryption-util-script.ts`
import { decode } from '@stablelib/base64';
import { openSecretEncryption } from '~/tests/fixtures/open-secret/encryption';

const osData = {
  encrypted:
    'tHjXyTd7X4FY0XkhmN6mGrV3/+xvUSfY80UDYC1oFMXkSpcIE2RV3CcdkMGo2uRkSxoSW7w+YqvKhB/12Ra//Jr04t8Yu3+VQ/cJNVdKrBWCDDzfA5YymeYoOGcAMzYE+VpKBht7AiHxxzF9rsEe',
};

const key = decode('DqBW99qlLbP9EOFBISCyjrImxQkwPRUd7fG2xZWe2ow=');

const decrypted = openSecretEncryption.decryptMessage(key, osData.encrypted);

console.log(JSON.parse(decrypted));
