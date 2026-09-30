# ShiftTracker - Employee Time Tracking Web Application

A full-stack employee time tracking web application that enables employees to clock in/out of shifts, manage breaks, and track work hours with GPS-based location verification. Features role-based access with an Admin Dashboard for workforce oversight and a personal Employee Dashboard for individual shift management.

## Screenshots

### Landing Page
![Landing Page](screenshots/homepage.png)

### Employee Dashboard - Inactive
![Dashboard Inactive](screenshots/dashboard-inactive.png)

### Employee Dashboard - Active Shift
![Dashboard Active](screenshots/dashboard-active.png)

### Shift Status & Location Tracking
![Location Tracking](screenshots/dashboard-location.png)

## Features

- **Real-Time Shift Tracking** — Start and end work shifts with a single click, with a live timer displaying working hours in real time
- **Break Management** — Support for Lunch Break and Short Break types, with automatic exclusion of break time from total working hours
- **GPS Location Tracking** — Captures employee geolocation at shift start/end and break transitions, displayed on an interactive map
- **Work Statistics** — View daily, weekly, and monthly working hour summaries at a glance
- **Shift History** — Paginated history table showing date, start/end times, duration, and break count
- **Admin Dashboard** — View all employees, manage roles (Employee/Admin), toggle active/inactive status, and review all shift records
- **CSV Export** — Export shift data to CSV for payroll or reporting
- **JWT Authentication** — Secure token-based authentication with role-based route protection
- **Dark Mode** — System-aware dark/light theme toggle with localStorage persistence
- **Responsive Design** — Mobile-first UI that adapts across all screen sizes
- **Email Notifications** — Automated shift start/end confirmation emails

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Build tool with HMR |
| Tailwind CSS 4 | Utility-first styling |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Leaflet / React-Leaflet | Interactive maps |
| date-fns | Date formatting |
| jwt-decode | Token decoding |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | Web framework |
| MongoDB | Database |
| Mongoose | ODM |
| JSON Web Token | Authentication |
| bcryptjs | Password hashing |
| Nodemailer | Email notifications |

## Project Structure

```
time-tracker-web-app/
├── time-tracker-webapp-backend/
│   ├── controllers/        # Route handlers (auth, shift, admin)
│   ├── models/             # Mongoose schemas (User, Shift)
│   ├── routes/             # API endpoint definitions
│   ├── middleware/          # Auth & error handling middleware
│   ├── utils/              # Email service
│   └── server.js           # Entry point
├── time-tracker-webapp-frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React Context (Auth, Shift, Theme)
│   │   ├── pages/          # Page components
│   │   └── App.jsx         # Root component with routing
│   └── index.html
├── screenshots/
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (running locally or a cloud URI)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/time-tracker-web-app.git
cd time-tracker-web-app
```

### 2. Backend Setup

```bash
cd time-tracker-webapp-backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and email credentials
npm run dev
```

The backend runs on `http://localhost:3001` by default.

### 3. Frontend Setup

```bash
cd time-tracker-webapp-frontend
npm install
cp .env.example .env
# Edit .env if your backend runs on a different URL
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user profile |

### Shifts (Authenticated)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/shifts/current` | Get active shift |
| POST | `/api/shifts/start` | Start a new shift |
| POST | `/api/shifts/end` | End current shift |
| POST | `/api/shifts/break/start` | Start a break |
| POST | `/api/shifts/break/end` | End current break |
| GET | `/api/shifts/history` | Get shift history (paginated) |
| GET | `/api/shifts/stats` | Get work hour statistics |

### Admin (Admin role required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/employees` | List all employees |
| PUT | `/api/admin/employees/role` | Update employee role |
| PUT | `/api/admin/employees/status` | Toggle employee status |
| GET | `/api/admin/shifts` | List all shifts |
| GET | `/api/admin/shifts/:employeeId` | Get employee shifts |

## Environment Variables

### Backend (`time-tracker-webapp-backend/.env`)
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/shift-tracker
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password_here
```

### Frontend (`time-tracker-webapp-frontend/.env`)
```
VITE_API_URL=http://localhost:3001
```

## License

This project is for portfolio/educational purposes.
