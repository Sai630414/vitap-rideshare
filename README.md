# VIT RideShare 🚗

VIT RideShare is a secure, production-ready MERN ride-sharing platform designed exclusively for students, staff, and faculty of **VIT-AP**. 

Only users with `@vitapstudent.ac.in` or `@vitap.ac.in` domains are permitted to register, preventing external accounts from accessing the platform. It features interactive map routing, document uploads for driver verification, booking lifecycle actions, real-time messaging, in-app updates, emergency SOS triggers, and administrative moderation panels.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React + Vite, TypeScript, React Router, TailwindCSS, React Query, Axios, React Hook Form, Zod, Socket.io Client, Leaflet + OpenStreetMap.
- **Backend**: Node.js, Express, TypeScript, Mongoose, Socket.io, Multer, Cloudflare R2, Helmet, Rate Limiting, CORS, Winston Logger.
- **Database**: MongoDB Atlas.
- **Containerization**: Docker, Docker Compose.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or a MongoDB Atlas URI
- Google OAuth credentials (optional; developer sandbox bypass mode is enabled by default)

### Setup Configurations

1. Clone the repository workspace.
2. Setup Backend `.env` configuration:
   Ensure `backend/.env` is configured with all required environment variables.
3. Setup Frontend `.env` configuration:
   Copy `client/.env.example` to `client/.env`.

---

### Run Locally (Without Docker)

1. **Start the Backend server**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   The backend server runs on `http://localhost:5000`.

2. **Start the Frontend client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   The Vite client runs on `http://localhost:5173`.

---

### Run with Docker Compose (Single Command)

To build and run all services (Node Server, React Client, MongoDB) in insulated container environments:
```bash
docker-compose up --build
```
- Access Frontend client: `http://localhost:5173`
- Access Backend API: `http://localhost:5000/api`

---

## 🧪 Developer Sandbox Bypass credentials

To simplify verification reviews without needing active Google Client IDs or live `@vitap.ac.in` Google accounts:
1. Ensure `DEV_BYPASS_AUTH=true` is set in `backend/.env`.
2. Navigate to the login screen (`http://localhost:5173/login`).
3. Fill in any email ending with `@vitapstudent.ac.in` or `@vitap.ac.in` in the Sandbox login form.
4. Select a role profile:
   - **Student**: Registers a verified student account. Can search for rides, submit seat requests, rate drivers, and trigger SOS.
   - **Driver**: Registers an auto-verified driver profile (automatically passes license and RC check logs). Can instantly list ride offers on the map.
   - **Administrator**: Registers an administrator account. Gives full access to stats, pending document approval logs, report moderations, and banning/ride cancellation triggers.

---

## 🛡️ API Endpoints Summary

- **Auth** (`/api/auth`)
  - `POST /google` - Verify Google ID Token
  - `POST /bypass` - Developer Sandbox Login
  - `POST /refresh` - Refresh access tokens
  - `POST /logout` - Clear cookies
  - `GET /me` - Fetch profile metadata

- **Users** (`/api/users`)
  - `PUT /profile` - Update details
  - `POST /avatar` - Upload profile picture
  - `GET /blocked` - Retrieve blocked users list
  - `POST /block/:id` - Block a student
  - `POST /unblock/:id` - Unblock a student
  - `POST /report/:id` - Submit a violation report

- **Vehicles** (`/api/vehicles`)
  - `POST /` - Register a vehicle
  - `POST/:id/rc` - Upload Registration Certificate (RC) Scan
  - `GET /my-vehicles` - Get owned vehicles
  - `DELETE /:id` - Unregister a vehicle

- **Licences** (`/api/licences`)
  - `POST /` - Upload driving licence details and double-sided scans
  - `GET /my-licence` - Get licence status

- **Rides** (`/api/rides`)
  - `GET /` - Search rides with sorting and location filters
  - `POST /` - List a ride offer (verified drivers only)
  - `GET /requests` - View passenger request board
  - `POST /requests` - Request a journey
  - `PATCH /:id/status` - Driver update trip status (`ongoing`, `completed`, `cancelled`)

- **Bookings** (`/api/bookings`)
  - `POST /` - Submit seat booking request
  - `GET /my-bookings` - Fetch my booking timeline
  - `GET /ride/:rideId` - Driver review passengers list
  - `PATCH /:id/respond` - Driver Approve/Decline requests
  - `PATCH /:id/cancel` - Passenger cancel reservation

- **Chat** (`/api/chat`)
  - `GET /` - Fetch chat inbox threads
  - `POST /` - Create or fetch direct thread
  - `GET /:chatId/messages` - Retrieve message history
  - `POST /:chatId/messages` - Send text/image attachments
  - `PATCH /:chatId/seen` - Mark thread messages as read

- **Notifications** (`/api/notifications`)
  - `GET /` - Retrieve notification board log
  - `PATCH /mark-read` - Mark all notifications as read
  - `PATCH /:id/read` - Mark single notification as read

- **Admin** (`/api/admin`)
  - `GET /stats` - View stats metrics summary
  - `GET /licences/pending` - Review license submissions
  - `GET /vehicles/pending` - Review vehicle RC documents
  - `GET /reports` - Review user reports queue
  - `PATCH /licences/:id/verify` - Approve/Reject driving license
  - `PATCH /vehicles/:id/verify` - Approve/Reject vehicle RC
  - `PATCH /users/:id/ban` - Ban/Unban user profile
  - `DELETE /rides/:id` - Cancel and delete ride

---

## 📡 Socket.io Events mapping

- **Client to Server**:
  - `register_user` (`userId`): Binds the socket to the logged in user ID room.
  - `join_chat` (`chatId`): Enters a conversation room.
  - `typing` (`{chatId, userId, userName, isTyping}`): Emits typing states.
  - `sos_alert` (`{userId, userName, phone, coordinates}`): Broadcasts emergency alerts with coordinates.

- **Server to Client**:
  - `notification` (`NotificationData`): Triggers floating toast alerts.
  - `new_message` (`MessageData`): appends incoming chat messages.
  - `messages_seen` (`{chatId, seenBy}`): sets checkmark double ticks.
  - `typing_status` (`{userId, userName, isTyping}`): shows typing bubbles.
  - `admin_sos_alert` (`{userId, userName, phone, coordinates}`): pushes urgent overlay cards to admins.
