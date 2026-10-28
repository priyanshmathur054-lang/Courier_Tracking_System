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

   If `backend/.env` does not exist, create it with `Copy-Item .env.example .env`.    Otherwise, keep the existing file and verify it has `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Set `WEATHER_API_KEY` to an OpenWeatherMap API key to enable the admin dashboard weather check. Use a long, unique JWT secret and a strong admin password. Do not commit `.env`.

2. Install dependencies and seed the administrator, courier roster, and sample shipments:

   ```powershell
   npm install
   npm run seed:admin
   ```

   The seed command adds one demo parcel for each supported status if those tracking numbers do not already exist, preserving other parcel records. Demo couriers are used unless `COURIERS_JSON` is set in `backend/.env`. Configure that value as a JSON array with each courier's `code`, `name`, `phone`, and `vehicleType` (`Bike`, `Van`, or `Truck`). Keep at least one active courier for each vehicle class you want to book; booking assigns the least-loaded courier with enough capacity.

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
| `GET` | `/api/parcels/weather?city=:city` | Admin | Check current weather and rain alerts for a city |
| `PATCH` | `/api/parcels/:id/status` | Admin | Update status and append history |
| `PATCH` | `/api/parcels/:id/courier` | Admin | Assign/update courier name, phone and vehicle |
