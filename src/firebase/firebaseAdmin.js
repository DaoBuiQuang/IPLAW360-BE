// src/firebase/firebaseAdmin.js
import admin from "firebase-admin";
import serviceAccount from "../config/serviceAccountKey.js"; ;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
