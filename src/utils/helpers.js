import { set, entries } from 'idb-keyval';
import { readKey } from "openpgp";

export function saveKeys(fingerprint, publicKey, privateKey = "", revocationCertificate = "") {
    const keys = {
        publicKey,
        privateKey,
        revocationCertificate
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

export async function getUserID(armoredKey) {
    const publicKey = await readKey({ armoredKey });

    // Access the userIDs array from the primary key
    const userIDs = publicKey.getUserIDs();

    if (userIDs && userIDs.length > 0) {
        // Return the primary or first user ID
        return userIDs[0];
    } else {
        throw new Error("No user identities found in this public key.");
    }
}