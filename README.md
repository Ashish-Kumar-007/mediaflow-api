# MediaFlow API: Audio & Video Asset Management

A robust, production-ready backend API designed to handle heavy media workflows, asynchronous processing, and cloud asset management. This project serves as a comprehensive demonstration of the backend architecture required for a scalable, cloud-native media editing platform.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (Hosted on Neon)
- **ORM:** Sequelize
- **Object Storage:** Neon Object Storage (AWS S3 SDK)
- **Background Jobs:** Redis + BullMQ
- **Authentication:** JSON Web Tokens (JWT) & bcrypt

---

## The Core Problem Solved: HTTP Timeouts & Server Blocking

Imagine a standard web server where a user uploads a large 4K video and clicks "Compress." Compressing that video takes 5 minutes. If the API tries to compress the video right then and there, the HTTP request will stay open for 5 minutes. 
1. The user's web browser will likely give up and throw a "Network Timeout" error after 30 seconds.
2. While the server is busy crunching that video, it is "blocked"—meaning it cannot respond to any other users trying to log in or browse the site. The whole app slows down or crashes.

**This architecture completely decouples *receiving* requests from *processing* requests:**
1. **Instant Response:** When a user clicks "Compress", the API instantly replies, *"Got it, you're Job #123,"* and closes the HTTP request immediately. No timeouts.
2. **Asynchronous Queue:** It drops a ticket into the **Redis Queue**.
3. **Background Workers:** A completely separate server (the `worker.js`) quietly picks up the heavy processing in the background, leaving the main API lightning-fast and ready to handle thousands of other users simultaneously.

Combined with **Object Storage (S3)** (so the database isn't clogged with massive video files), this solves the two major bottlenecks of scaling a media application.

---

## Architecture & Data Flow

Here is the complete, step-by-step flow of how data moves through the project:

### 1. Authentication (The Gateway)
- **Action:** A user signs up or logs in.
- **Backend Flow:** The Express API takes their email and password, hashes the password using `bcrypt`, and saves it to the **Neon PostgreSQL Database**. 
- **Result:** The user is granted 100 starting "credits" and receives a secure **JWT Token** which they must attach to all future requests to prove who they are.

### 2. Media Upload (Handling Heavy Files)
- **Action:** The user selects a video on their phone and uploads it.
- **Backend Flow:** 
  - The API receives the file via the `multer` middleware, holding it temporarily in server memory.
  - Using the AWS SDK, the API streams the file directly into a **Neon Object Storage Bucket**.
  - Once uploaded, the API saves a record in the `Assets` database table linking the S3 URL to that specific User.
- **Result:** The file is safely in the cloud, and the API returns an `assetId` to the user.

### 3. Requesting a Transformation (The Async Queue)
- **Action:** The user clicks a button to "Compress Video".
- **Backend Flow:**
  - The API checks the database to ensure the user actually owns that `assetId` and has at least 1 credit.
  - It deducts 1 credit from their account and saves a new record in the `Jobs` database table with a status of `pending`.
  - **Crucial Step:** Instead of actually compressing the video right then and there, it drops a "ticket" into a **Redis Queue** (using BullMQ) saying *"Hey, when someone is free, compress this video."*
- **Result:** The API instantly replies to the user with a `jobId`. The user doesn't have to wait with a loading spinner for 10 minutes.

### 4. Background Processing (The Heavy Lifting)
- **Action:** The `worker.js` script is constantly running in the background, listening to Redis.
- **Backend Flow:** 
  - The worker grabs the "ticket" from the queue.
  - It updates the database Job status to `processing`.
  - It downloads the video from the S3 bucket, does the heavy processing (simulated by a 5-second delay), and uploads the finished video back to the bucket.
  - It updates the database Job status to `completed` and attaches the new result URL.

### 5. Polling for Completion (The Final Step)
- **Action:** While the worker is busy, the user's mobile app is silently checking the API every few seconds asking, *"Is Job #123 done yet?"*
- **Backend Flow:** The API queries the database for that `jobId`. Once the worker flips the status to `completed`, the API returns the final URL.
- **Result:** The user's app sees the job is complete and displays the final, compressed video to the user!

---

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Local Redis Server (v5+ is supported via skipVersionChecker)
- Neon CLI (`npm i -g neon@latest`)

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Cloud Infrastructure Setup (Neon)
This project relies on Neon for serverless PostgreSQL and Object Storage.
```bash
# Login to Neon via browser
neon login

# Link your project and initialize config
neon link --project-id <YOUR_PROJECT_ID> --branch production -y
neon config init

# Deploy configuration (creates bucket and pulls .env variables)
neon deploy
```

### 3. Environment Variables
Your `.env` file should be automatically populated by the `neon deploy` command. Ensure it looks like this:
```env
PORT=3000
DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require&uselibpqcompat=true"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_ENDPOINT_URL_S3="..."
AWS_REGION="ap-southeast-1"
```

### 4. Running the Project
You must run both the main API server and the background worker simultaneously.

In terminal 1 (Main API Server):
```bash
npm run dev
```

In terminal 2 (Background Worker):
```bash
npm run worker:dev
```

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user (returns JWT & 100 credits)
- `POST /api/auth/login` - Login (returns JWT)

### Assets & Jobs (Requires Bearer Token)
- `POST /api/assets/upload` - Upload a media file (Multipart Form Data, key: `media`)
- `GET /api/assets` - List all assets owned by the user
- `POST /api/assets/process` - Queue a processing job (Body: `{ "assetId": "...", "type": "compress_video" }`)
- `GET /api/assets/jobs/:jobId` - Check the status of a specific job
