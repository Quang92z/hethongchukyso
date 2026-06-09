import forge from 'node-forge';

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const spkiToPEM = (keydata: ArrayBuffer) => {
  const keydataS = arrayBufferToBase64(keydata);
  const keydataB = keydataS.match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN PUBLIC KEY-----\n${keydataB}\n-----END PUBLIC KEY-----`;
};

const pkcs8ToPEM = (keydata: ArrayBuffer) => {
  const keydataS = arrayBufferToBase64(keydata);
  const keydataB = keydataS.match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN PRIVATE KEY-----\n${keydataB}\n-----END PRIVATE KEY-----`;
};

/**
 * Generate RSA Key Pair using Web Crypto API for high performance
 * then exports to standard PEM format compatible with node-forge.
 */
export const generateRSAKeys = async (length: 2048 | 4096 = 2048) => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: length,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  );

  const exportedPublicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const exportedPrivateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: spkiToPEM(exportedPublicKey),
    privateKey: pkcs8ToPEM(exportedPrivateKey)
  };
};

/**
 * Encrypt wrapper using PKCS#1 v1.5
 */
export const encryptPKCS1 = (text: string, publicKeyPem: string): string => {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem) as forge.pki.rsa.PublicKey;
    const encrypted = publicKey.encrypt(forge.util.encodeUtf8(text), 'RSAES-PKCS1-V1_5');
    return forge.util.encode64(encrypted);
  } catch (error: any) {
    throw new Error('Lỗi mã hóa: ' + error.message);
  }
};

/**
 * Decrypt wrapper using PKCS#1 v1.5
 */
export const decryptPKCS1 = (encryptedBase64: string, privateKeyPem: string): string => {
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey;
    const encryptedBytes = forge.util.decode64(encryptedBase64);
    const decrypted = privateKey.decrypt(encryptedBytes, 'RSAES-PKCS1-V1_5');
    return forge.util.decodeUtf8(decrypted);
  } catch (error: any) {
    throw new Error('Lỗi giải mã: ' + error.message);
  }
};

/**
 * Sign wrapper using RSASSA-PKCS1-V1_5 with SHA-256
 */
export const signPKCS1 = (text: string, privateKeyPem: string): string => {
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey;
    const md = forge.md.sha256.create();
    md.update(text, 'utf8');
    const signature = privateKey.sign(md);
    return forge.util.encode64(signature);
  } catch (error: any) {
    throw new Error('Lỗi tạo chữ ký: ' + error.message);
  }
};

/**
 * Verify signature wrapper
 */
export const verifyPKCS1 = (text: string, signatureBase64: string, publicKeyPem: string): boolean => {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem) as forge.pki.rsa.PublicKey;
    const signatureBytes = forge.util.decode64(signatureBase64);
    const md = forge.md.sha256.create();
    md.update(text, 'utf8');
    return publicKey.verify(md.digest().bytes(), signatureBytes);
  } catch (error) {
    // Return false on format error instead of throwing to be robust
    return false;
  }
};
