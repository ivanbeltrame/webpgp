import { set, entries } from 'idb-keyval';
import { readKey } from "openpgp";

export async function saveKeys(publicKey, privateKey = "", revocationCertificate = "") {
    const key = await readKey({ armoredKey: publicKey });
    const fingerprint = key.getFingerprint();
    const userIDs = key.getUserIDs();
    let userID;
    if (userIDs && userIDs.length > 0) {
        // Return the primary or first user ID
        userID = userIDs[0];
    } else {
        userID = "No userID";
    }

    const keys = {
        userID,
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

export async function armorToHex(armoredKey) {
    const key = await readKey({ armoredKey });
    
    // Serialize the key directly into its raw binary format (Uint8Array)
    const binaryKey = key.toPacketList().write();
    
    // Convert the Uint8Array into a single-line hex string
    const hexString = Array.from(binaryKey)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
        
    return hexString;
}

export async function hexToKey(hexString) {
    if (typeof hexString !== 'string' || hexString.length % 2 !== 0) {
        return null
    }

    // Convert the single-line hex string back into a Uint8Array
    const binaryKey = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        binaryKey[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }

    // Read the key from its raw binary format
    let key;
    try {
        key = await readKey({ binaryKey });
    } catch (e) {
        return null;
    }

    return key;
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