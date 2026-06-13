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

/**
 * Implement fast file signing using native Web Crypto API
 */
export const signFileWebCrypto = async (file: File, privateKeyPem: string): Promise<string> => {
  try {
    const pemContents = privateKeyPem.split('\n')
      .filter(line => !line.includes('-----'))
      .join('')
      .replace(/\s/g, '');
      
    if (!pemContents) {
      throw new Error("Khóa bí mật không hợp lệ hoặc rỗng.");
    }
    
    let binaryDerString;
    try {
      binaryDerString = window.atob(pemContents);
    } catch(e) {
      throw new Error("Định dạng Khóa bí mật không đúng (lỗi base64). Vui lòng kiểm tra copy đủ/đúng chưa.");
    }
    
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const arrayBuffer = await file.arrayBuffer();
    const signatureBuffer = await window.crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      arrayBuffer
    );

    return forge.util.encode64(forge.util.createBuffer(new Uint8Array(signatureBuffer)).getBytes());
  } catch (error: any) {
    throw new Error('Lỗi tạo chữ ký cho file: ' + error.message);
  }
};

/**
 * Implement fast file verification using native Web Crypto API
 */
export const verifyFileWebCrypto = async (file: File, signatureBase64: string, publicKeyPem: string): Promise<boolean> => {
  try {
    const pemContents = publicKeyPem.split('\n')
      .filter(line => !line.includes('-----'))
      .join('')
      .replace(/\s/g, '');
      
    if (!pemContents) {
      return false;
    }
    
    let binaryDerString;
    try {
      binaryDerString = window.atob(pemContents);
    } catch(e) {
      return false;
    }
    
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = forge.util.decode64(signatureBase64);
    const signatureArray = new Uint8Array(signatureBytes.length);
    for(let i=0; i<signatureBytes.length; i++) signatureArray[i] = signatureBytes.charCodeAt(i);

    const arrayBuffer = await file.arrayBuffer();
    return await window.crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signatureArray.buffer,
      arrayBuffer
    );
  } catch (error) {
    return false;
  }
};
