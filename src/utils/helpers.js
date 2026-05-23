import { set, entries } from 'idb-keyval';

export function saveKeys(fingerprint, name, email, publicKey, privateKey, revocationCertificate) {
    const keys = {
        name,
        email,
        publicKey,
        privateKey,
        revocationCertificate,
        createdAt: new Date().toISOString()
    }
    
    set(fingerprint, keys)
        .catch((err) => console.log('Writing to indexeddb failed! ', err));
}

export async function getAllKeys() {
    const result = await entries();
    return result;
}

export function downloadTextAsFile(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to DOM (required for Firefox compatibility), trigger click, and cleanup
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}