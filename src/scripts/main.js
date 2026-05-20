import * as bootstrap from "bootstrap";

const form = document.getElementById("key-generation-form");
const publicKeyTextarea = document.getElementById("public-key-textarea");
const privateKeyTextarea = document.getElementById("private-key-textarea");
const revocationCertificateTextarea = document.getElementById("revocation-certificate-textarea");
const showKeysDiv = document.getElementById("show-keys-div");
const ONE_YEAR = 60 * 60 * 24 * 365;

if (!(typeof window !== 'undefined' && window.crypto && window.crypto.subtle)) {
    document.getElementById("fieldset-form").disabled = true;

    bootstrap.Toast.getOrCreateInstance(
        document.getElementById("webCryptoAPI-FailToast"),
        {
            delay: 7000,
            autohide: true
        }
    ).show();

    document.getElementById("webCryptoAPI-FailAlert").style.display = "block";
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    const keyType = formData.get("key-type-radio");
    const fullName = formData.get("full-name");
    const email = formData.get("email");
    const passphrase = formData.get("passphrase");
    const expirationDate = formData.get("expiration-date");

    let deltaSeconds;
    if (expirationDate === "custom") {
        const dateObject = new Date(formData.get("custom-date"));
        deltaSeconds = (dateObject.getTime() / 1000) - Math.floor(Date.now() / 1000);
    } else if (expirationDate === "1") {
        deltaSeconds = ONE_YEAR;
    } else if (expirationDate === "2") {
        deltaSeconds = ONE_YEAR * 2;
    } else if (expirationDate === "3") {
        deltaSeconds = ONE_YEAR * 3;
    } else {
        alert("expirationDate not defined!");
        return;
    }

    switch (keyType) {
        case "curve":
            generateCurveKeys(fullName, email, passphrase, deltaSeconds);
            break;
        case "rsa2048":
            generateRSAKeys(2048, fullName, email, passphrase, deltaSeconds);
            break;
        case "rsa4096":
            generateRSAKeys(4096, fullName, email, passphrase, deltaSeconds);
            break;
        default:
            alert("keyType not defined!");
            return;
    }

    bootstrap.Toast.getOrCreateInstance(
        document.getElementById("successToast"),
        {
            delay: 7000,
            autohide: true
        }
    ).show();
});

document.getElementById("download-button-public-key").addEventListener("click", (event) => {
    downloadTextAsFile(publicKeyTextarea.value, "public_key.asc");
});
document.getElementById("download-button-private-key").addEventListener("click", (event) => {
    downloadTextAsFile(privateKeyTextarea.value, "private_key.asc");
});
document.getElementById("download-button-revocation-certificate").addEventListener("click", (event) => {
    downloadTextAsFile(revocationCertificateTextarea.value, "revocation_certificate.asc");
});

async function generateCurveKeys(name, email, passphrase, keyExpirationTime) {
    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
        type: 'ecc',
        curve: 'curve25519',
        userIDs: [{ name: name, email: email }],
        passphrase: passphrase,
        keyExpirationTime: keyExpirationTime
    });

    await saveKeysToIndexedDB(name, email, publicKey, privateKey, revocationCertificate);

    showKeys(name, email, publicKey, privateKey, revocationCertificate);
}

async function generateRSAKeys(rsaBits, name, email, passphrase, keyExpirationTime) {
    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: rsaBits,
        userIDs: [{ name: name, email: email }],
        passphrase: passphrase,
        keyExpirationTime: keyExpirationTime
    });

    await saveKeysToIndexedDB(name, email, publicKey, privateKey, revocationCertificate);

    showKeys(name, email, publicKey, privateKey, revocationCertificate);
}

function showKeys(name, email, publicKey, privateKey, revocationCertificate) {
    publicKeyTextarea.textContent = publicKey;
    privateKeyTextarea.textContent = privateKey;
    revocationCertificateTextarea.textContent = revocationCertificate;

    showKeysDiv.style.display = "block";
    showKeysDiv.scrollIntoView();
}

function saveKeysToIndexedDB(name, email, publicKey, privateKey, revocationCertificate) {
    return new Promise((resolve, reject) => {
        // Open (or create) the database
        const request = indexedDB.open("PGPKeyStore", 1);

        // This runs the very first time the database is created on the client machine
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Create an object store using the email as the unique keyPath identifier
            if (!db.objectStoreNames.contains("keys")) {
                db.createObjectStore("keys", { keyPath: "email" });
            }
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            
            // Open a read/write transaction on our keys store
            const transaction = db.transaction("keys", "readwrite");
            const store = transaction.objectStore("keys");

            // Prepare the data payload object
            const keyData = {
                name: name,
                email: email,
                publicKey: publicKey,
                privateKey: privateKey,
                revocationCertificate: revocationCertificate,
                createdAt: new Date().toISOString()
            };

            // .put() will insert a new record or overwrite an existing one with the same email
            const putRequest = store.put(keyData);

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
            
            // Clean up connection when transaction completes
            transaction.oncomplete = () => db.close();
        };

        request.onerror = () => reject(request.error);
    });
}

function getKeysFromIndexedDB(email) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("PGPKeyStore", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction("keys", "readonly");
            const store = transaction.objectStore("keys");
            
            const getRequest = store.get(email);

            getRequest.onsuccess = () => {
                // Returns the object containing { email, publicKey, privateKey, createdAt }
                resolve(getRequest.result); 
            };
            
            getRequest.onerror = () => reject(getRequest.error);
            transaction.oncomplete = () => db.close();
        };

        request.onerror = () => reject(request.error);
    });
}

function getSavedEmailsList() {
    return new Promise((resolve, reject) => {
        // Open the existing database
        const request = indexedDB.open("PGPKeyStore", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            
            // Check if the store exists yet to prevent runtime errors on empty databases
            if (!db.objectStoreNames.contains("keys")) {
                resolve([]);
                db.close();
                return;
            }

            const transaction = db.transaction("keys", "readonly");
            const store = transaction.objectStore("keys");

            // Fetch only the primary keys (emails) from the store
            const getAllKeysRequest = store.getAllKeys();

            getAllKeysRequest.onsuccess = () => {
                // Resolves to an array of strings: ["user1@domain.com", "user2@domain.com"]
                resolve(getAllKeysRequest.result); 
            };

            getAllKeysRequest.onerror = () => reject(getAllKeysRequest.error);
            transaction.oncomplete = () => db.close();
        };

        request.onerror = () => reject(request.error);
    });
}

function deleteKeysFromIndexedDB(email) {
    return new Promise((resolve, reject) => {
        // Open the existing database connection
        const request = indexedDB.open("PGPKeyStore", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            
            // Safe-guard check: verify store exists before attempting transaction
            if (!db.objectStoreNames.contains("keys")) {
                resolve();
                db.close();
                return;
            }

            // Open a transaction with readwrite permissions to modify data
            const transaction = db.transaction("keys", "readwrite");
            const store = transaction.objectStore("keys");

            // Execute the delete operation against the primary key (email)
            const deleteRequest = store.delete(email);

            deleteRequest.onsuccess = () => {
                // Resolves successfully even if the email didn't exist in the database
                resolve(); 
            };

            deleteRequest.onerror = () => reject(deleteRequest.error);
            transaction.oncomplete = () => db.close();
        };

        request.onerror = () => reject(request.error);
    });
}

function downloadTextAsFile(text, filename) {
  // 1. Create a Blob with the text content and set the MIME type
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });

  // 2. Create a temporary URL pointing to the Blob
  const url = URL.createObjectURL(blob);

  // 3. Create a hidden anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename; // Sets the default file name for the download

  // 4. Append to DOM (required for Firefox compatibility), trigger click, and cleanup
  document.body.appendChild(link);
  link.click();
  
  // 5. Clean up the DOM and revoke the URL to free up memory
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// async function populateKeyDropdown() {
//     const dropdown = document.getElementById("key-selector");
    
//     try {
//         // 1. Fetch the array of emails from IndexedDB
//         const emails = await getSavedEmailsList();
        
//         // 2. Loop through the array and append options to the dropdown
//         emails.forEach(email => {
//             const option = document.createElement("option");
//             option.value = email;
//             option.textContent = email;
//             dropdown.appendChild(option);
//         });
        
//     } catch (error) {
//         console.error("Could not load email list from IndexedDB:", error);
//     }
// }

// // Call this function when your application or dashboard loads
// document.addEventListener("DOMContentLoaded", populateKeyDropdown);



// async function handleDeleteAction(userEmail) {
//     if (!userEmail) return;
    
//     // Add a basic UI confirmation modal/prompt step
//     const confirmDelete = confirm(`Are you sure you want to permanently wipe keys for ${userEmail}?`);
    
//     if (confirmDelete) {
//         try {
//             await deleteKeysFromIndexedDB(userEmail);
//             console.log(`Identity records for ${userEmail} successfully purged.`);
            
//             // Refresh your UI view layout or dropdown selectors here
//             // e.g., window.location.reload(); or updateDropdown();
            
//         } catch (error) {
//             console.error("Database deletion operation failed:", error);
//         }
//     }
// }