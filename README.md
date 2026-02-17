# Student Progress Tracker 📚

A modern, responsive web application for tracking academic progress with Firebase integration.

## Features

- 🔐 **Authentication**: Email/Password & Google Sign-in via Firebase Auth
- 📊 **Dashboard**: Real-time stats with animated cards and progress bars
- 📖 **Subject Management**: Add, edit, delete subjects with CRUD operations
- ✅ **Topic Tracking**: Checkboxes, scores, completion dates for each topic
- 📈 **Analytics**: Bar, Pie, Line, and Horizontal Bar charts via Chart.js
- 📱 **Responsive**: Fully responsive across mobile, tablet, and desktop
- 🎨 **Modern UI**: Clean blue & white theme with smooth animations

## Tech Stack

| Layer          | Technology          |
|----------------|---------------------|
| Frontend       | HTML, CSS, JavaScript |
| Backend        | Node.js + Express   |
| Database       | Firebase Firestore  |
| Authentication | Firebase Auth       |
| Charts         | Chart.js            |

## Project Structure

```
Student_tracker/
├── server.js                 # Node.js Express server
├── package.json              # Dependencies
├── README.md                 # This file
└── public/
    ├── index.html            # Landing page
    ├── login.html            # Login page
    ├── register.html         # Registration page
    ├── forgot-password.html  # Password reset page
    ├── dashboard.html        # Main dashboard
    ├── subjects.html         # Subject management
    ├── topics.html           # Topic tracking
    ├── analytics.html        # Analytics & charts
    ├── css/
    │   └── style.css         # Complete stylesheet
    └── js/
        ├── firebase-config.js # Firebase initialization
        ├── auth.js            # Authentication logic
        ├── firestore.js       # Firestore CRUD operations
        └── ui.js              # UI utilities (toast, modal, etc.)
```

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** and follow the steps
3. In Dashboard, click the **Web icon** (</>) to add a web app
4. Copy the Firebase config object

### 2. Configure Firebase

Open `public/js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 3. Enable Firebase Services

In Firebase Console:
- **Authentication** → Sign-in method → Enable **Email/Password** and **Google**
- **Firestore Database** → Create database → Start in **test mode**

### 4. Set Firestore Security Rules

Go to Firestore → Rules and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Install & Run

```bash
npm install
npm start
```

Visit **http://localhost:3000** in your browser.

## Pages Overview

| Page             | URL                     | Description                          |
|------------------|-------------------------|--------------------------------------|
| Landing          | `/`                     | Hero section, features, footer       |
| Login            | `/login`                | Email/password & Google login        |
| Register         | `/register`             | New account creation                 |
| Forgot Password  | `/forgot-password`      | Password reset via email             |
| Dashboard        | `/dashboard`            | Stats cards, progress bar, overview  |
| Subjects         | `/subjects`             | Add/edit/delete subjects             |
| Topics           | `/topics/:subjectId`    | Topic list with checkboxes & scores  |
| Analytics        | `/analytics`            | Charts and performance visualization |

## Firestore Data Structure

```
users/
  {userId}/
    name: string
    email: string
    createdAt: timestamp
    subjects/
      {subjectId}/
        name: string
        description: string
        createdAt: timestamp
        updatedAt: timestamp
        topics/
          {topicId}/
            name: string
            completed: boolean
            score: number | null
            completedAt: timestamp | null
            createdAt: timestamp
```

## License

This project is for educational purposes (BCA Final Year Project).
