import {webcrypto} from "crypto";

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const {
    publicKey,
    privateKey,
  } = await webcrypto.subtle.generateKey({
    name: 'RSA-OAEP',
    modulusLength : 2048,
    publicExponent : new Uint8Array([1, 0, 1]),
    hash : 'SHA-256',
  }, true, ['encrypt', 'decrypt']);
  return { publicKey:publicKey, privateKey:privateKey};
} 

// Export a crypto public key to a base64 string format
export async function exportPubKey(publicKey: webcrypto.CryptoKey): Promise<string> {
  // if (!(publicKey instanceof webcrypto.CryptoKey)){
  //   throw new Error(publicKey + " is not a valid public key");
  // }
  return arrayBufferToBase64(await webcrypto.subtle.exportKey("spki", publicKey));
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey(key: webcrypto.CryptoKey | null): Promise<string | null> {
  let privateKeyRaw: string = "";
  if ( key === null){
    throw new Error(key + " is not a valid public key");
  }
  else{
    privateKeyRaw = arrayBufferToBase64(await webcrypto.subtle.exportKey("pkcs8", key)); // Change the format parameter to "jwk"
  } 
  return privateKeyRaw;
}

// Import a base64 string public key to its native format
export async function importPubKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const publicKey = await webcrypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(strKey),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
  return publicKey;
}


// Import a base64 string private key to its native format
export async function importPrvKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const privateKey = await webcrypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(strKey),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
  return privateKey;
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(b64Data: string,strPublicKey: string): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const data = base64ToArrayBuffer(b64Data);
  const encryptedData = await webcrypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    data
  );
  return arrayBufferToBase64(encryptedData);
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt(data: string,privateKey: webcrypto.CryptoKey): Promise<string> {
  const encryptedData = base64ToArrayBuffer(data);
  const decryptedData = await webcrypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedData
  );
  return arrayBufferToBase64(decryptedData);
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  const key = await webcrypto.subtle.generateKey(
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const keyData = await webcrypto.subtle.exportKey("raw", key);
  const base64Key = arrayBufferToBase64(keyData);
  return base64Key;
}

// Import a base64 string format to its crypto native format
export async function importSymKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const keyData = base64ToArrayBuffer(strKey);
  const key = await webcrypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-CBC",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
}

// Encrypt a message using a symmetric key
export async function symEncrypt(key: webcrypto.CryptoKey,data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataUint8Array = encoder.encode(data);
  const iv = webcrypto.getRandomValues(new Uint8Array(16));
  const encryptedData = await webcrypto.subtle.encrypt(
    {
      name: "AES-CBC", // Change the algorithm to AES-CBC
      iv: iv, // Use the initialization vector
    },
    key,
    dataUint8Array
  );
  const combinedArray = new Uint8Array(iv.length + encryptedData.byteLength);
  combinedArray.set(iv);
  combinedArray.set(new Uint8Array(encryptedData), iv.length);
  return arrayBufferToBase64(combinedArray.buffer);
}

// Decrypt a message using a symmetric key
export async function symDecrypt(strKey: string,encryptedData: string): Promise<string> {
  const privateKey = await importSymKey(strKey);
  const combinedArrayBuffer = base64ToArrayBuffer(encryptedData);
  const iv = combinedArrayBuffer.slice(0, 16);
  const encryptedArrayBuffer = combinedArrayBuffer.slice(16);
  const decryptedArrayBuffer = await webcrypto.subtle.decrypt(
    {
      name: "AES-CBC", // Change the algorithm to AES-CBC
      iv: iv, // Generate a random initialization vector
    },
    privateKey,
    encryptedArrayBuffer
  );
  const decoder = new TextDecoder();
  const decryptedData = decoder.decode(decryptedArrayBuffer);
  return decryptedData;
}
