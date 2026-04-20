# Smart Bus System — Complete Backend Architecture

## 1. Project Structure Overview

```
minor/
├── backend/                        ← Node.js Express Server
│   ├── server.js                   ← Entry point, starts the server
│   ├── firebase.js                 ← Firebase Admin SDK connection
│   ├── firebase-key.json           ← Secret credentials (DO NOT SHARE)
│   ├── package.json                ← Dependencies & scripts
│   └── routes/
│       ├── scan.js                 ← POST /api/scan  (receives data from ESP32)
│       ├── bus.js                  ← GET  /api/bus   (sends data to website)
│       └── scans.js                ← GET  /api/scans (scan history for map)
│
├── esp32/                          ← Hardware Code
│   └── real.ino                    ← ESP32 firmware (IR sensors + GPS + WiFi)
│
└── frontend/                       ← React + Vite Web Application
    └── src/
        ├── App.jsx                 ← Main app with auth & role routing
        ├── firebase.js             ← Frontend Firebase config (Google login)
        ├── components/
        │   ├── Login.jsx           ← Google sign-in page
        │   ├── RoleSelection.jsx   ← Choose Passenger or Conductor
        │   ├── PassengerView.jsx   ← QR ticket + Map + Dashboard
        │   └── ConductorView.jsx   ← QR scanner + Dashboard
        └── pages/
            ├── Dashboard.jsx       ← Polls /api/bus every 3s for passenger count
            ├── BusMap.jsx          ← Polls /api/bus every 8s for GPS location
            └── Ticket.jsx          ← QR code generation
```

---

## 2. The Complete Data Flow

```
  ┌───────────────┐         ┌──────────────────┐         ┌──────────────┐
  │  ESP32 Board  │  POST   │  Backend Server   │  read   │   Firebase   │
  │  (real.ino)   │────────►│  (server.js)      │◄───────►│  Firestore   │
  │               │  /scan  │  Port 3000        │  write  │  Cloud DB    │
  └───────────────┘         └────────┬─────────┘         └──────────────┘
                                     │
                                     │ GET /api/bus
                                     │ (every 3-8 seconds)
                                     ▼
                            ┌──────────────────┐
                            │  React Frontend   │
                            │  (Vite, Port 5173)│
                            │  Dashboard + Map  │
                            └──────────────────┘
```

**In simple terms:**
1. ESP32 sensors collect data (passenger count + GPS coordinates)
2. ESP32 sends this data to the backend server via HTTP POST
3. Backend writes the data into Firebase Firestore (cloud database)
4. Frontend polls the backend every few seconds via HTTP GET
5. Backend reads from Firebase and returns the latest data
6. Frontend displays the live passenger count and bus location on the map

---

## 3. Backend Files — Detailed Breakdown

---

### 3.1 `server.js` — The Entry Point

**Location:** `backend/server.js`  
**Purpose:** Creates the Express web server and registers all API routes

```javascript
const express = require('express');
const cors = require('cors');
const { admin, db } = require('./firebase');
const app = express();
app.use(cors());
app.use(express.json());

const scanRoute = require('./routes/scan');
const busRoute = require('./routes/bus');
const scansRoute = require('./routes/scans');

app.use('/api/scan', scanRoute);
app.use('/api/bus', busRoute);
app.use('/api/scans', scansRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`ESP32 should connect to: http://192.168.137.1:${PORT}/api/scan`);
});
```

**Line-by-line explanation:**

| Line | What it does |
|------|-------------|
| `require('express')` | Loads Express.js — the web framework that handles HTTP requests |
| `require('cors')` | Loads CORS middleware — allows the frontend (port 5173) to talk to backend (port 3000) |
| `require('./firebase')` | Connects to Firebase using the secret service account key |
| `app.use(cors())` | Enables cross-origin requests from ANY origin (needed for frontend-backend communication) |
| `app.use(express.json())` | **Critical:** Parses incoming JSON request bodies. Without this, `req.body` would be `undefined` and ESP32 data would be lost |
| `app.use('/api/scan', scanRoute)` | Any POST request to `/api/scan` is handled by `routes/scan.js` |
| `app.use('/api/bus', busRoute)` | Any GET request to `/api/bus` is handled by `routes/bus.js` |
| `app.use('/api/scans', scansRoute)` | Any GET request to `/api/scans` is handled by `routes/scans.js` |
| `app.listen(PORT, '0.0.0.0')` | Starts server on port 3000, bound to ALL network interfaces |

**Why `0.0.0.0`?**  
By default, Express only listens on `127.0.0.1` (localhost). The ESP32 is a separate device on the WiFi network, so it connects via the computer's IP address (`192.168.137.1`). Binding to `0.0.0.0` means "accept connections from anywhere on the network."

---

### 3.2 `firebase.js` — Database Connection

**Location:** `backend/firebase.js`  
**Purpose:** Initializes Firebase Admin SDK with service account credentials

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://minor-4edc7.firebaseio.com'
});
const db = admin.firestore();

module.exports = { admin, db };
```

**How it works:**

1. Loads `firebase-admin` — the **server-side** Firebase SDK (has full admin access)
2. Reads `firebase-key.json` — a private key file downloaded from the Firebase Console
3. Calls `admin.initializeApp()` — authenticates with Google Cloud
4. Creates `db = admin.firestore()` — this is the Firestore database handle
5. Exports `{ admin, db }` — so all route files can import and use the database

**⚠️ SECURITY WARNING:**  
`firebase-key.json` contains your private key. Never share it or commit it to GitHub. It gives full admin access to your entire Firebase project.

**Firebase Firestore Collections used in this project:**

| Collection | Document | Fields | Who writes | Who reads |
|---|---|---|---|---|
| `bus_status` | `BUS101` | `passenger_count`, `location {lat, lng}`, `speed`, `last_updated` | ESP32 (via scan.js) | Frontend (via bus.js) |
| `scans` | auto-generated IDs | `userId`, `action`, `location {lat, lng}`, `time`, `passenger_count` | Conductor QR scan | Frontend map (via scans.js) |
| `tickets` | user ID string | `status` (NOT_USED / IN_PROGRESS / COMPLETED) | Conductor QR scan | scan.js for validation |

---

### 3.3 `routes/scan.js` — Hardware-to-Cloud Communication (THE MOST IMPORTANT FILE)

**Location:** `backend/routes/scan.js`  
**Endpoint:** `POST /api/scan`  
**Called by:** ESP32 hardware (every 0.5 seconds) AND Conductor QR scanner

This file handles **two completely different scenarios:**

#### Scenario A: ESP32 Hardware Update

The ESP32 sends a POST request every 0.5 seconds with this JSON:
```json
{
  "count": 7,
  "lat": 13.082700,
  "lng": 80.270700,
  "speed": 25.5
}
```

**What happens step by step:**

1. Backend receives the JSON in `req.body`
2. The code checks: is there a `qr` field? **No** → defaults to `"BUS_UPDATE"`
3. Since `qr === "BUS_UPDATE"`, it enters the **hardware sync branch**
4. It writes to Firestore document `bus_status/BUS101`:
   ```json
   {
     "passenger_count": 7,
     "location": { "lat": 13.0827, "lng": 80.2707 },
     "speed": 25.5,
     "last_updated": "2026-04-20T08:00:00Z"
   }
   ```
5. Uses `{ merge: true }` — only updates listed fields, doesn't delete others
6. Returns `{ "status": "SUCCESS", "action": "SYNC" }` to the ESP32

**Field name mapping (ESP32 → Firebase):**

| ESP32 sends | Firebase stores as | Why |
|---|---|---|
| `count` | `passenger_count` | The frontend reads `passenger_count`, so we translate it |
| `lat` | `location.lat` | Stored as a nested object for cleaner structure |
| `lng` | `location.lng` | Same as above |
| `speed` | `speed` | Stored directly |

#### Scenario B: Conductor QR Scan

When a conductor scans a passenger's QR code, the webapp sends:
```json
{
  "qr": "userId123|2026-04-20T08:00:00Z",
  "lat": 13.08,
  "lng": 80.27
}
```

**What happens:**

1. `qr` is NOT `"BUS_UPDATE"`, enters the **QR validation branch**
2. Splits the QR string: `userId = "userId123"`
3. Looks up the `tickets` collection in Firestore for that user
4. **If ticket status is `NOT_USED`** → marks action as `ENTRY`, changes status to `IN_PROGRESS`
5. **If ticket status is `IN_PROGRESS`** → marks action as `EXIT`, changes status to `COMPLETED`
6. **If no ticket found** → marks as `GUEST_SCAN`
7. Logs the event in the `scans` collection (with location, timestamp, action)
8. Returns `{ "status": "SUCCESS", "action": "ENTRY" }` (or EXIT or GUEST_SCAN)

---

### 3.4 `routes/bus.js` — Website Data Feed

**Location:** `backend/routes/bus.js`  
**Endpoint:** `GET /api/bus`  
**Called by:** Frontend `Dashboard.jsx` (every 3 seconds) and `BusMap.jsx` (every 8 seconds)

```javascript
router.get("/", async (req, res) => {
  try {
    const busDoc = await withTimeout(
      db.collection("bus_status").doc("BUS101").get(), 
      2000  // 2-second timeout
    );
    if (busDoc.exists) {
      res.json(busDoc.data());  // Returns the real data
    } else {
      res.json({ passenger_count: 0, location: { lat: 13.0827, lng: 80.2707 } });
    }
  } catch (err) {
    // Fallback mock data if Firebase is down
    res.json({ passenger_count: 12, location: { lat: 13.0827, lng: 80.2707 }, mock: true });
  }
});
```

**What it does:**

1. Reads the Firestore document `bus_status/BUS101`
2. Returns the full document as JSON to the frontend:
   ```json
   {
     "passenger_count": 7,
     "location": { "lat": 13.0827, "lng": 80.2707 },
     "speed": 25.5,
     "last_updated": { "_seconds": 1776579800 }
   }
   ```
3. Has a **2-second timeout** — if Firestore is slow, it doesn't freeze the website
4. Has a **mock data fallback** — returns fake data if Firebase is completely down

**This is the bridge:** ESP32 writes to `bus_status/BUS101` via `scan.js`, and the frontend reads from the same document via `bus.js`. Firebase acts as the shared database.

---

### 3.5 `routes/scans.js` — Scan History

**Location:** `backend/routes/scans.js`  
**Endpoint:** `GET /api/scans`  
**Called by:** Frontend `BusMap.jsx` (every 8 seconds)

```javascript
router.get("/", async (req, res) => {
  const scansSnapshot = await db.collection("scans")
    .orderBy("time", "desc")
    .limit(10)
    .get();
  const scans = [];
  scansSnapshot.forEach(doc => scans.push(doc.data()));
  res.json(scans);
});
```

**What it does:**

1. Queries the `scans` collection, ordered by most recent first
2. Returns the 10 latest scan events
3. Each event has: `{ userId, action, location, time, passenger_count }`
4. The frontend map uses these to place passenger markers on the map

---

### 3.6 `package.json` — Dependencies

| Package | Version | What it does |
|---|---|---|
| `express` | 5.2.1 | Web server framework — handles all HTTP requests and routes |
| `cors` | 2.8.6 | Cross-Origin Resource Sharing — lets frontend (port 5173) call backend (port 3000) |
| `firebase-admin` | 13.7.0 | Server-side Firebase SDK — full admin access to Firestore database |
| `firebase` | 12.11.0 | Firebase client SDK — used for some authentication support |
| `body-parser` | 2.2.2 | Parses JSON request bodies (Express 5 has this built-in via `express.json()`) |

**Scripts:**
- `npm start` → runs `node server.js`

---

## 4. Network Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              YOUR COMPUTER (IP: 192.168.137.1)                 │
│                                                                │
│   ┌──────────────┐    ┌──────────────┐    ┌────────────────┐  │
│   │   Backend     │    │   Frontend   │    │    Firebase    │  │
│   │   Express     │◄──►│   React+Vite │    │   Cloud DB     │  │
│   │   Port 3000   │    │   Port 5173  │    │   (Internet)   │  │
│   └──────┬───────┘    └──────────────┘    └───────┬────────┘  │
│          │                                         │           │
│          │   reads/writes via firebase-admin SDK    │           │
│          └─────────────────────────────────────────┘           │
│          │                                                     │
│          │  Mobile Hotspot "ABC" (192.168.137.x network)       │
└──────────┼─────────────────────────────────────────────────────┘
           │
           │  HTTP POST every 0.5s
           │  to http://192.168.137.1:3000/api/scan
           │
     ┌─────┴─────┐
     │   ESP32   │
     │  Hardware │
     │  (WiFi)   │
     └───────────┘
```

**How they connect:**
- Your computer runs a **Mobile Hotspot** named "ABC"
- The ESP32 connects to this hotspot via WiFi
- The hotspot creates a private network: computer = `192.168.137.1`, ESP32 = `192.168.137.x`
- The ESP32 sends HTTP POST requests to `http://192.168.137.1:3000/api/scan`
- The backend receives these requests and writes to Firebase (cloud)
- The frontend (running in your browser) polls the backend and displays the data

---

## 5. Firebase: Two Different SDKs

This project uses Firebase in **two separate places** with **two different SDKs:**

| | Backend (`backend/firebase.js`) | Frontend (`frontend/src/firebase.js`) |
|---|---|---|
| **SDK** | `firebase-admin` (Admin SDK) | `firebase` (Client SDK) |
| **Auth method** | Service Account Key (JSON file) | API Key + Google Sign-In popup |
| **Permissions** | Full admin — can read/write/delete anything | User-level — restricted by Firestore security rules |
| **Purpose** | Write ESP32 sensor data, read bus status | Google authentication, display data in browser |
| **Runs on** | Your computer (Node.js server process) | User's browser (client-side JavaScript) |

**Why two SDKs?**  
The backend needs admin access to write sensor data from the ESP32 without any user login. The frontend needs the client SDK for Google login popup and displaying data in the browser.

---

## 6. What Each Frontend Component Does with Backend Data

### `Dashboard.jsx` — Passenger Counter Display
- **Polls:** `GET http://localhost:3000/api/bus` every **3 seconds**
- **Reads field:** `data.passenger_count`
- **Displays:** A large number showing how many passengers are currently onboard
- **Used in:** Both PassengerView AND ConductorView

### `BusMap.jsx` — Live Map with Bus Tracker
- **Polls:** `GET http://localhost:3000/api/bus` every **8 seconds** for bus location
- **Also polls:** `GET http://localhost:3000/api/scans` for recent passenger boarding points
- **Reads fields:** `data.location.lat` and `data.location.lng`
- **Displays:** An OpenStreetMap with a bus icon marker that moves in real-time
- **Feature:** Map auto-recenters when bus location changes
- **Used in:** PassengerView only

### `ConductorView.jsx` — QR Scanner + Count
- **Uses:** Camera-based QR scanner (`html5-qrcode` library)
- **When QR is scanned:** Can POST the data to `/api/scan` for ticket validation
- **Displays:** QR scanner + real-time passenger count from Dashboard
- **No map** — conductor doesn't need to track the bus they're already on

### `PassengerView.jsx` — QR Ticket + Map + Count
- **Generates:** A QR code containing `userId|timestamp` for the conductor to scan
- **Displays:** QR ticket card + Dashboard (passenger count) + Live Bus Map
- **Purpose:** Passenger can see their ticket and track the bus in real-time

---

## 7. Step-by-Step Timeline: How Data Flows

```
TIME      WHAT HAPPENS
──────────────────────────────────────────────────────────────────

0.0s      ESP32 boots up, connects to WiFi "ABC"
          IR sensors start reading on Pin 26 and Pin 27
          GPS module starts acquiring satellite signal on Pin 16/17
          TFT display shows "SMART BUS SYSTEM" and "Connecting to Sat..."

0.5s      First HTTP POST sent to backend:
          {"count":0, "lat":0.000000, "lng":0.000000, "speed":0}
          ↓
          Backend receives it, writes to Firebase:
          bus_status/BUS101 → passenger_count=0, location={0,0}
          ↓
          Returns: {"status":"SUCCESS","action":"SYNC"}

1.0s      A passenger walks through the door
          IR_1 (Pin 26) triggers LOW → state changes to 1
          Then IR_2 (Pin 27) triggers LOW → passenger counted!
          passengerCount becomes 1
          TFT display updates: "1 / 11"
          Buzzer does NOT sound (count < MAX_CAPACITY of 11)

1.5s      Next POST sends updated count:
          {"count":1, "lat":0.000000, "lng":0.000000, "speed":0}
          Backend writes count=1 to Firebase

3.0s      Frontend Dashboard.jsx polls GET /api/bus
          Backend reads from Firebase: passenger_count = 1
          Dashboard displays: "1" on the website

10.0s     GPS gets satellite lock!
          lat: 13.08270, lng: 80.27070
          Buzzer plays 2000Hz tone for 1 second to indicate GPS lock
          TFT shows: "LAT: 13.08270" "LNG: 80.27070"

10.5s     POST now includes real GPS:
          {"count":1, "lat":13.082700, "lng":80.270700, "speed":30.5}
          Backend writes location + speed to Firebase

12.0s     Frontend BusMap.jsx polls GET /api/bus
          Gets real lat/lng → map marker jumps to actual bus position!

20.0s     5 more passengers board, count goes to 6
          Each boarding triggers an immediate POST with new count

60.0s     Count reaches 11 (MAX_CAPACITY)
          Buzzer starts alternating 1500Hz every 400ms: BEEP-pause-BEEP
          TFT count turns RED

63.0s     Frontend shows "11" in the dashboard
          Real-time alert visible to anyone viewing the website
```

---

## 8. How to Run the System

### Start the Backend:
```bash
cd backend
npm start
```
Expected output:
```
Server is running on http://0.0.0.0:3000
ESP32 should connect to: http://192.168.137.1:3000/api/scan
```

### Start the Frontend:
```bash
cd frontend
npm run dev
```
Expected output:
```
VITE ready
➜ Local: http://localhost:5173/
```

### Flash the ESP32:
1. Open `esp32/real.ino` in Arduino IDE
2. Set board to your ESP32 variant
3. Set WiFi SSID to your hotspot name (e.g., "ABC")
4. Set `serverURL` to `http://192.168.137.1:3000/api/scan`
5. Upload and open Serial Monitor at 115200 baud

### Verify the Pipeline:
```bash
# Simulate ESP32 data from your terminal:
curl -X POST http://192.168.137.1:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"count":5,"lat":13.0827,"lng":80.2707,"speed":0}'

# Check what the website sees:
curl http://localhost:3000/api/bus
```

---

## 9. Summary

**The backend is a Node.js Express server** that acts as the **bridge** between the ESP32 hardware and the React website.

- **6 files** make up the backend: `server.js`, `firebase.js`, `firebase-key.json`, `scan.js`, `bus.js`, `scans.js`
- **3 API endpoints**: POST `/api/scan` (write), GET `/api/bus` (read), GET `/api/scans` (history)
- **1 database**: Firebase Firestore in the cloud — shared between hardware writes and frontend reads
- **Real-time flow**: ESP32 POSTs every 0.5s → backend writes to Firebase → frontend polls every 3-8s → UI updates

The ESP32 never talks directly to the website. The backend + Firebase form the middleware layer that connects the physical world (sensors) to the digital world (web dashboard).
