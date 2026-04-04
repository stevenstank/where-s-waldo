# Where's Waldo

## Overview
Where's Waldo is a deployed full-stack game where players search for Waldo inside a procedurally generated scene. Waldo's position is selected by the backend, rendered by the frontend using exact coordinates, and validated server-side so click detection stays accurate.

## Live Demo
- Frontend (Vercel): https://where-s-waldo-roan.vercel.app/
- Backend (Render): https://where-s-waldo-pr8v.onrender.com

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL (Neon)
- ORM: Prisma
- Deployment:
  - Frontend: Vercel
  - Backend: Render
  - Database: Neon

## Features
- Random Waldo position selected from `TargetPosition` records in the database
- Procedurally generated scene with hundreds of objects
- Backend-driven Waldo rendering coordinates
- Accurate click validation using normalized image-relative coordinates
- Timer-based gameplay
- Restart game functionality
- Leaderboard restricted to authenticated users
- Best-score tracking with one leaderboard score per user

## How It Works
1. The backend starts a game session and picks a random Waldo position from `TargetPosition`.
2. The frontend renders Waldo at the exact coordinates returned by the backend.
3. User clicks are converted into scene-relative coordinates based on the rendered scene size.
4. The backend validates whether the click falls inside Waldo's bounding box.
5. When Waldo is found, the timer stops and the final time is frozen.
6. For authenticated users, the backend stores only the best score and prevents duplicate leaderboard entries per user.

## Project Structure
```text
.
├── backend
│   ├── controllers
│   ├── middleware
│   ├── prisma
│   ├── routes
│   └── utils
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   └── services
└── README.md
```

## Environment Variables

### Backend `.env`
```env
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_secret
CLIENT_ORIGIN=https://where-s-waldo-git-main-stevenstanks-projects.vercel.app
```

Note: the backend also supports `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. If those are not set, it falls back to `JWT_SECRET`.

### Frontend `.env`
```env
VITE_API_URL=https://where-s-waldo-pr8v.onrender.com
```

## Local Setup
1. Clone the repository.
2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Install frontend dependencies:

```bash
cd frontend
npm install
```

4. Configure environment variables for both apps.
5. Start the backend:

```bash
cd backend
npm run dev
```

6. Start the frontend:

```bash
cd frontend
npm run dev
```

7. Open `http://localhost:5173`.

## Deployment Notes
- The backend is deployed on Render.
- The frontend is deployed on Vercel.
- The database is hosted on Neon PostgreSQL.
- The frontend uses `VITE_API_URL` to point to the deployed backend.
- The backend must allow CORS for the deployed Vercel frontend.

## Gameplay Notes
- Waldo's visual position is never randomized on the client.
- Click detection is validated by the backend using the same coordinate system used for rendering.
- The timer stops when Waldo is found.
- Guest users can play, but leaderboard access is limited to authenticated users.

## Future Improvements
- Multiple characters instead of only Waldo
- Difficulty levels
- Image-based maps instead of generated shapes
- Expanded global leaderboard with deeper pagination
- More sound effects and animations
