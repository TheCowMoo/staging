# PursuitPathways Workplace App

A comprehensive, self-hosted workplace safety assessment platform.

This repository contains the full source code for the Safeguard Audit platform, completely decoupled from any proprietary runtime or platform dependencies. It is designed to be deployed on any standard Node.js hosting environment (Vercel, Render, Railway, AWS, DigitalOcean, etc.).

## Features

- **Site Audit**: 17 categories, up to 180 questions, scored findings tied to corrective action plans
- **Emergency Action Plan**: NFPA 3000-aligned EAP covering evacuation, lockdown, shelter-in-place, and recovery
- **Visitor Management**: Photo ID verification, time tracking, flagged-name watchlist
- **Incident Reporting**: Anonymous submission, tracking tokens, OSHA 300 log fields
- **Training & Drills**: Drill scheduling, after-action reviews, documented training records
- **Communication**: Mass notifications, emergency alerts, staff check-in accountability
- **BTAM**: Behavioral Threat Assessment & Management with WAVR-21 scoring engine

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, React Query, wouter
- **Backend**: Node.js, Express, tRPC, Drizzle ORM
- **Database**: MySQL / TiDB
- **Authentication**: Custom JWT-based email/password authentication
- **Storage**: AWS S3 (or any S3-compatible storage like Cloudflare R2, MinIO)
- **AI/LLM**: OpenAI API (or any OpenAI-compatible endpoint)
- **Maps**: Google Maps API

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL Database
- AWS S3 Bucket (or compatible)
- OpenAI API Key
- Google Maps API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/TheCowMoo/pursuitpathways-workplace.git
   cd pursuitpathways-workplace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials, API keys, and S3 configuration.

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

### Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## License

Private repository. All rights reserved.
