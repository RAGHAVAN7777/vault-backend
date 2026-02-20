# VaultLock  
Secure Cloud Storage & Notebook Full-Stack SaaS Application

VaultLock is a production-ready full-stack SaaS application designed for secure cloud file storage and notebook management.

The system combines a responsive frontend interface with a robust backend architecture, implementing tier-based storage limits, automated file expiry enforcement, OTP-based onboarding, secure MPIN authentication, and controlled administrative access.

The application is deployed as a unified service on Render.

---

## Live Deployment

Application URL:  
https://vault-backend-dq8o.onrender.com

The deployed service includes both the frontend interface and backend API in a single production environment.

---

## Core Capabilities

- Secure user registration with email OTP verification  
- MPIN-based authentication with Bcrypt hashing  
- Tier-based subscription model (Normal, Power, Premium)  
- Strict server-side storage quota enforcement  
- Cloudinary-based file storage  
- Automated file expiry background worker  
- Notebook creation and management (CRUD operations)  
- Administrative monitoring and control endpoints  
- Secure destructive account confirmation workflow  

---

## System Architecture

VaultLock follows a full-stack SaaS architecture:

Frontend (Static UI served from `/public`)  
→ Express.js API Layer  
→ MongoDB Database  
→ Cloudinary Storage  
→ Email Service (OTP & Authorization)  
→ Background Expiry Worker  

All components operate within a unified Node.js runtime environment.

---

## Application Workflow

### Registration Flow
1. User enters email  
2. OTP is generated and sent  
3. OTP is verified  
4. Account is created under selected tier  

### Authentication Flow
1. User submits MPIN  
2. Bcrypt verifies hash  
3. Access granted upon successful validation  

### File Upload Flow
1. Tier quota validation performed  
2. File uploaded to Cloudinary  
3. Metadata stored in MongoDB  
4. Expiry timestamp assigned based on tier  

### Expiry Worker Flow
1. Background process runs every 5 minutes  
2. Expired files identified  
3. Files removed from Cloudinary  
4. Database metadata cleaned  

---

## SaaS Subscription Model

| Tier     | Storage Limit | File Expiry |
|----------|--------------|------------|
| Normal   | 5 MB        | 12 Hours   |
| Power    | 25 MB       | 36 Hours   |
| Premium  | Unlimited   | No Expiry  |

All limits are strictly enforced server-side.

---

## Technology Stack

Runtime: Node.js  
Framework: Express.js (v5+)  
Database: MongoDB (Mongoose ODM)  
Cloud Storage: Cloudinary  
Authentication: Bcrypt.js, Email OTP  
Email Service: Nodemailer / Resend  
File Handling: Multer (memory storage)  
Frontend: Static HTML, CSS, JavaScript  

---

## Project Structure

vault-backend/
├── models/              # Database schemas  
├── public/              # Frontend interface (HTML/CSS/JS)  
├── utils/               # Utility modules  
├── server.js            # Application entry point  
├── package.json  
└── .gitignore  

---

## Environment Configuration

Create a `.env` file with the following variables:

- PORT  
- MONGO_URI  
- EMAIL_HOST  
- EMAIL_PORT  
- EMAIL_USER  
- EMAIL_PASS  
- MASTER_ADMIN_EMAIL  
- CLOUDINARY_CLOUD_NAME  
- CLOUDINARY_API_KEY  
- CLOUDINARY_API_SECRET  
- ADMIN_PATTERN  

In production, configure these variables in the Render dashboard.

---

## Local Development

Clone repository:

git clone <repository-url>  
cd vault-backend  

Install dependencies:

npm install  

Start server:

npm start  

Development mode:

npm run dev  

---

## API Endpoints Overview

### Authentication
- POST /api/send-otp  
- POST /api/verify-otp  
- POST /api/register  
- POST /api/login  
- POST /api/send-master-otp  
- POST /api/verify-master-otp  

### File Management
- POST /api/upload  
- GET /api/files/:userId  
- DELETE /api/delete/:publicId  
- POST /api/purge-all/:userId  

### Notebook
- GET /api/notes/:userId  
- POST /api/notes  
- PUT /api/notes/:noteId  
- DELETE /api/notes/:noteId  

### Administrative
- GET /api/admin/stats  
- GET /api/admin/users  
- POST /api/admin-login-pattern  

---

## Security Design

- Secure MPIN hashing using Bcrypt  
- OTP-based identity verification  
- Tier-based quota validation  
- Background file lifecycle enforcement  
- Admin pattern-based protected access  
- Email-based destructive action confirmation  

---

## Error Handling Strategy

- Structured API responses  
- Input validation across endpoints  
- Atomic synchronization between database and cloud storage  
- Graceful handling of background worker failures  
- Controlled async flow management  

---

## Future Enhancements

- AES-256 client-side encryption  
- JWT-based stateless authentication  
- Integrated subscription billing (Stripe)  
- Dedicated mobile client  
- Scalable object storage abstraction layer  

---

## License

This project is licensed under the MIT License.
