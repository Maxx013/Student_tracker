// Firebase Configuration
// Replace with your own Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyAtlcmHXMUyqHN5HhQDdm9TBWulSHRmKAE",
    authDomain: "studentprogresstracker-33d56.firebaseapp.com",
    projectId: "studentprogresstracker-33d56",
    storageBucket: "studentprogresstracker-33d56.firebasestorage.app",
    messagingSenderId: "644624515332",
    appId: "1:644624515332:web:339b0fef640cf629599051",
    measurementId: "G-WSPS110V4H"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence().catch((err) => {
    console.log('Firestore persistence error:', err.code);
});
