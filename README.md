# NexRoute — Courier Tracking System

MERN based courier booking and parcel tracking app. Customers can register, book parcels and track shipments with a tracking number. An administrator can view all shipments and update delivery status.

## Features

- Customer registration and sign-in using JWT authentication
- Admin account creation via the backend seed script
- Parcel booking with sender/recipient details and optional image
- Unique tracking number and public shipment progress/history
- Admin shipment search and status updates
- Customers can only see their own shipments; tracking lookup does not expose contact details
- Responsive React interface

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB running locally or a MongoDB connection string

## Run locally

1. Configure the backend:

   ```powershell
   cd backend
   ```

   If `backend/.env` does not exist, create it with `Copy-Item .env.example .env`. Otherwise, keep the existing file and verify it has `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Use a long, unique JWT secret and a strong admin password. Do not commit `.env`.

2. Install dependencies and seed the administrator:

   ```powershell
   npm install
   npm run seed:admin
   ```

3. Start the API in the `backend` directory:

   ```powershell
   npm run dev
   ```

   The API listens on `http://localhost:5000`.

4. In a second terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the Vite URL (usually `http://localhost:5173`). To use another API URL, set `VITE_API_URL` to the API base URL, such as `http://localhost:5000/api`.

## Main API routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a customer |
| `POST` | `/api/auth/login` | Public | Sign in |
| `POST` | `/api/parcels` | Signed-in user | Book a parcel |
| `GET` | `/api/parcels` | Signed-in user | List own parcels (admin sees all) |
| `GET` | `/api/parcels/track/:trackingNumber` | Public | Track parcel status/history |
| `PATCH` | `/api/parcels/:id/status` | Admin | Update status and append history |
| `PATCH` | `/api/parcels/:id/courier` | Admin | Assign/update courier name, phone and vehicle |
