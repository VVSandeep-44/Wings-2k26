db.js
DEPLOYMENT.md
netlify.toml
package.json
server.js
assets/
client/
  ├── build_out.txt
  ├── index.html
  ├── package.json
  ├── vite.config.js
  ├── assets/
  ├── public/
  ├── src/
  │   ├── App.jsx
  │   ├── main.jsx
  │   ├── components/
  │   ├── pages/
  │   ├── services/
  │   └── styles/
data/
scripts/
templates/
<p align="center">
  <img src="client/public/assets/logo.png" alt="Wings 2k26 Logo" width="180"/>
</p>

# Wings 2k26

**Wings 2k26** is a modern web application for comprehensive event management, registration, and administration. It features a robust Node.js/Express backend and a high-performance React frontend powered by Vite.

---

## 🚀 Features
- Online event registration and management
- Secure admin dashboard for event oversight
- QR code generation and scanning for verification
- Automated email invitations and admit card generation
- Responsive, mobile-friendly UI
- Robust error monitoring (Sentry, New Relic)
- Cloud-ready deployment (Render, Netlify, MongoDB Atlas)

---

## 🗂️ Project Structure
```
db.js
DEPLOYMENT.md
netlify.toml
package.json
server.js
assets/
client/
  ├── index.html
  ├── package.json
  ├── vite.config.js
  ├── public/
  ├── src/
  │   ├── App.jsx
  │   ├── main.jsx
  │   ├── components/
  │   ├── pages/
  │   ├── services/
  │   └── styles/
data/
scripts/
templates/
```

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express, MongoDB (Atlas)
- **Frontend:** React 19, Vite, React Router
- **Email:** Brevo (Sendinblue)
- **Monitoring:** Sentry, New Relic
- **Deployment:** Render (API), Netlify (frontend)

---

## ⚡ Getting Started

### Prerequisites
- Node.js v16 or higher
- npm (or yarn)
- MongoDB Atlas account

### Installation
1. **Clone the repository:**
   ```sh
   git clone https://github.com/VVSandeep-44/Wings-2k26.git
   cd Wings-2k26
   ```
2. **Install backend dependencies:**
   ```sh
   npm install
   ```
3. **Install frontend dependencies:**
   ```sh
   cd client
   npm install
   ```

### Running Locally
1. **Start the backend server:**
   ```sh
   npm start
   ```
2. **Start the frontend development server:**
   ```sh
   cd client
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

---

## 🌐 Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for a full production checklist and cloud deployment steps.

- **Frontend:** Netlify (see `netlify.toml`)
- **Backend:** Render (see `DEPLOYMENT.md`)
- **Database:** MongoDB Atlas

---

## 🔑 Environment Variables
Copy `.env.example` to `.env` and fill in the required values:

```env
# Core
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://your-frontend-domain.com

# MongoDB
MONGODB_URI=your_mongodb_atlas_uri
MONGODB_DB_NAME=wings2k26

# Brevo (Email)
BREVO_API_KEY=your_brevo_api_key
INVITE_FROM_EMAIL=verified_sender@example.com

# Admin
ADMIN_PASSWORD=your_strong_password
ADMIN_SESSION_TOKEN=your_long_random_token

# Sentry / New Relic (optional)
SENTRY_DSN=
NEW_RELIC_LICENSE_KEY=
```

---

## 🧪 Testing & Verification
- Health check: `GET /api/health` should return `{ status: "ok" }`
- Mail check: `GET /api/health/mail` should return `{ status: "ok" }`
- Register a test user and verify admin dashboard
- See [DEPLOYMENT.md](DEPLOYMENT.md) for full post-deploy checklist

---

## 🤝 Contributing
Contributions are welcome! Please open an issue to discuss major changes before submitting a pull request.

---

## 📄 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center"><i>Developed for Wings 2k26 event management. Built with ❤️ by the Wings 2k26 team.</i></p>
