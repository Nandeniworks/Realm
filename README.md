<div align="center">

# 🌌 Realm

### *A cinematic digital watch party platform for shared movie nights.*

Watch together. Chat together. React together. Anywhere.

---

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Authentication-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Socket.io](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Server-black?style=for-the-badge&logo=express)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Styling-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

---

# Overview

Realm is a **real-time watch party platform** designed to make online movie nights feel natural, social, and immersive.

Instead of watching videos alone, users can create private rooms, invite friends, synchronize playback, chat in real time, and enjoy content together from anywhere.

Realm focuses on creating a polished experience that feels closer to a native desktop streaming application than a traditional web app.

---

#  Features

###  Synchronized Playback

- Play / Pause synchronization
- Seeking synchronization
- Shared playback state
- Host-controlled playback

---

###  Live Chat

- Real-time messaging
- Emoji reactions
- Participant presence
- Instant updates

---

###  Multiplayer Rooms

- Create private rooms
- Join via room code
- Invite links
- QR code invitations
- Host controls

---

###  Video Support

- YouTube playback
- Shared queue system
- Autoplay next video

---

###  Voice Lounge *(Work in Progress)*

- Voice chat
- Device setup
- WebRTC integration

---

### Modern UI

- Cinematic design
- Dark mode
- Responsive layout
- Smooth animations

---

#  Tech Stack

## Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Framer Motion
- Socket.io Client

## Backend

- Node.js
- Express.js
- Socket.io

## Database & Authentication

- Firebase Authentication
- Firestore

---

#  Project Structure

```text
Realm/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── context/
│   └── assets/
│
├── backend/
│   ├── routes/
│   ├── socket/
│   ├── controllers/
│   ├── middleware/
│   └── config/
│
└── README.md
```


## Install

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

### Backend

```bash
cd backend
npm install
npm run dev
```

---

#  Environment Variables

Create the required `.env` files.

Frontend

```env
VITE_API_URL=
VITE_SOCKET_URL=

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Backend

```env
PORT=
CLIENT_URL=

JWT_SECRET=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

---

# 🖼Screenshots

> Coming Soon

- Landing Page
- Watch Room
- Live Chat
- Queue System
- Invite System

---

# Roadmap

##  Current

- Authentication
- Room creation
- Room joining
- Realtime chat
- Playback synchronization
- Queue
- QR invite links

---

## In Progress

- Voice Chat
- Camera Support
- Better Queue Controls
- Production Deployment
- Mobile Optimization

---

##  Future

- Jellyfin Integration
- Plex Support
- Netflix Party Support (where permitted)
- Themes
- Movie Collections
- Watch History
- Friends List
- Rich Presence
- AI Recommendations
- Smart Room Moderation

---

#  Contributing

Contributions, ideas, and feature suggestions are welcome.

If you'd like to improve Realm, feel free to fork the repository and submit a pull request.

---

#  License

This project is licensed under the MIT License.

---

<div align="center">

### ⭐ If you like Realm, consider giving it a star!

Made by **Nandeni Tiwari**

</div>
