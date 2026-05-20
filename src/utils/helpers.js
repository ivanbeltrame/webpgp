export function saveKeysToIndexedDB(name, email, publicKey, privateKey, revocationCertificate) {
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

export function getKeysFromIndexedDB(email) {
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

export function getSavedEmailsList() {
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

export function deleteKeysFromIndexedDB(email) {
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

export function downloadTextAsFile(text, filename) {
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