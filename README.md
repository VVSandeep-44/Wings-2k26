# Wings 2k26

Wings 2k26 is a web application designed for event management, registration, and administration. This project includes both a Node.js/Express backend and a modern React frontend built with Vite.

## Features
- Event registration and management
- Admin dashboard for event oversight
- QR code scanning for verification
- Email invitation and admit card generation
- Responsive and modern UI

## Project Structure
```
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
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn
- MongoDB (for backend database)

### Installation
1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/wings-2k26.git
   cd wings-2k26
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

### Running the Application
1. **Start the backend server:**
   ```sh
   npm start
   ```
2. **Start the frontend development server:**
   ```sh
   cd client
   npm run dev
   ```

The frontend will be available at `http://localhost:5173` (or as specified by Vite), and the backend at `http://localhost:3000` (or as specified in your server.js).

## Deployment
- The project includes a `netlify.toml` for Netlify deployment and scripts for MongoDB backup.
- See `DEPLOYMENT.md` for detailed deployment instructions.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)

---
*Developed for Wings 2k26 event management.*
