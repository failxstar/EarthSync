# 🌍 EarthSync — AI-Assisted Environmental Resource Management Platform

[![Live Demo](https://img.shields.io/badge/Live%20App-AWS%20Amplify-FF9900.svg?logo=awsamplify&logoColor=white)](https://main.d2wx8nlqy99bxh.amplifyapp.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-green.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5-2d3748.svg)](https://www.prisma.io/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20Vision-8e44ad.svg)](https://ai.google.dev/)
[![Cloudinary](https://img.shields.io/badge/Media-Cloudinary%20CDN-3448c5.svg)](https://cloudinary.com/)

> 🌐 **Live Application**: [https://main.d2wx8nlqy99bxh.amplifyapp.com](https://main.d2wx8nlqy99bxh.amplifyapp.com/)


**EarthSync** is an enterprise-grade, full-stack, AI-driven environmental resource recovery and hazard management platform. It connects citizens, municipal authorities, community donors, non-profits, and service providers into a unified circular-economy and incident-response network.

---

## 🌟 Key Highlights

- **✨ Multimodal Computer Vision (Google Gemini 3.8 Flash)**
  - Citizens take or upload photos of environmental hazards (illegal dumping, water leaks, toxic runoff).
  - The AI visually audits the scene, detects materials, assigns categories and priority levels, formulates titles and detailed descriptions, and extracts ecological risk factors with up to 98% confidence.
  - Donors upload surplus goods photos; the AI auto-detects item types, condition, and estimated quantities.
- **🗺️ Interactive GIS Mapping (Leaflet & OpenStreetMap)**
  - Live incident pins color-coded by severity (Critical, High, Medium, Low).
  - Click-to-pin coordinate picker for accurate field reporting.
  - Grid / Map toggle for both Resource Marketplace and Hazard Reports.
- **🔄 Circular Economy Marketplace**
  - Surplus resource listings across Food, Clothing, Electronics, Furniture, Medical, Building Materials.
  - Multi-stage claim request lifecycle (Pending, Approved, Fulfilled, Rejected).
  - Donor inventory management with approval/rejection workflows.
- **📊 EPA WARM Environmental Impact Analytics**
  - Real-time CO₂e avoided calculations, waste diverted metrics, and municipal cleanup tracking.
  - Interactive Recharts visualization with Scope toggle (Platform-wide vs. Personal contributions).
- **🛡️ Role-Based Access Control (RBAC)**
  - 5 tailored operational dashboards: `CITIZEN`, `DONOR`, `RECIPIENT`, `PROVIDER`, and `ADMIN`.
  - Admin governance portal: user moderation, provider dispatch queues, and tamper-resistant audit logs.
- **☁️ Cloudinary CDN Media Storage**
  - Direct buffer streaming for high-resolution photo evidence and surplus item listings.

---

## 🏗️ Architecture

```
                                  ┌────────────────────────┐
                                  │   React 19 Frontend    │
                                  │  TypeScript + Vite     │
                                  │   Tailwind CSS 4       │
                                  └───────────┬────────────┘
                                              │ REST (Axios / JWT)
                                              ▼
                                  ┌────────────────────────┐
                                  │   Express.js Backend   │
                                  │    Node.js (CommonJS)  │
                                  └─────┬──────────────┬───┘
                                        │              │
                    ┌───────────────────┴───┐          │
                    ▼                       ▼          ▼
         ┌─────────────────────┐  ┌──────────────────┐  ┌───────────────────┐
         │    PostgreSQL 17    │  │  Google Gemini   │  │   Cloudinary CDN  │
         │   (Prisma ORM 6)    │  │  Vision & NLP    │  │   Media Uploads   │
         └─────────────────────┘  └──────────────────┘  └───────────────────┘
```

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Bundler & Tooling**: Vite 8
- **Styling**: Tailwind CSS 4 with custom design tokens
- **Routing**: React Router DOM 7
- **Mapping**: Leaflet 1.9 & React-Leaflet
- **Data Visualization**: Recharts 2.15
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Web Framework**: Express.js 4.21
- **Database & ORM**: PostgreSQL 17 + Prisma ORM 6.5
- **Authentication**: JSON Web Tokens (JWT) & bcrypt
- **Validation**: Zod schema validation
- **AI Engine**: `@google/genai` (Gemini 3.8 Flash Multimodal)
- **Media Uploads**: Cloudinary Node.js SDK & Multer

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 16+ running locally or in Docker
- Cloudinary account credentials
- Google Gemini API Key

### 1. Repository Setup
```bash
git clone https://github.com/failxstar/EarthSync.git
cd EarthSync
```

### 2. Backend Configuration
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see [`.env.example`](backend/.env.example)):
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/earthsync?schema=public"
JWT_SECRET="your-jwt-secret-key"
CLOUDINARY_URL="cloudinary://<api_key>:<api_secret>@<cloud_name>"
AI_API_KEY="your-gemini-api-key"
```

Initialize the PostgreSQL database:
```bash
npx prisma db push
node prisma/seed.js
npm run dev
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd ../earthsync/frontend
npm install
npm run dev
```

The application is now live at `http://127.0.0.1:5173`.

---

## 👥 Demo Accounts (Pre-Seeded)

All demo accounts use password: `password123`

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **System Admin** | `admin@earthsync.local` | Platform governance, user verification, dispatch, audit logs |
| **Citizen** | `citizen@earthsync.local` | Incident reporting, AI vision analysis, public map tracking |
| **Donor** | `donor@earthsync.local` | List surplus items, manage inventory, approve/reject claim requests |
| **Recipient** | `recipient@earthsync.local` | Browse marketplace, submit claim requests, track deliveries |
| **Service Provider** | `provider@earthsync.local` | Assigned hazard incidents, update remediation status |

*(Quick 1-Click login buttons are available on the login page for instant role switching)*

---

## 📄 License
MIT License. Built for community-driven environmental resilience and circular resource sharing.
