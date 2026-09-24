# Of Wild & Walls

A sleek, responsive photography portfolio web application featuring dynamic layout modes ("Flow", "Grid", and "Detail") alongside a fully integrated admin dashboard for managing photo collections, built with Express, TypeScript, EJS, and Tailwind CSS.

## Features

- **Public Portfolio**: 
  - Dual layout options: **Flow** (masonry-style scattered columns) and **Grid** (horizontal strip).
  - Responsive, mobile-first design using Tailwind CSS.
  - Infinite scroll loading and live image filtering by categories, collections, cameras, lenses, countries, and years.
  - Dynamic image scaling and layout algorithms built in vanilla JavaScript.
  - Full dark mode and light mode support.

- **Admin Dashboard**:
  - Secure `/admin` portal (cookie-based session authentication with bcrypt).
  - Manage live and draft photos.
  - Upload images (processed in memory and uploaded directly to Amazon S3).
  - Edit metadata (camera specs, lens specs, categories, collections, and EXIF-like details).

- **Tech Stack**:
  - **Backend**: Node.js, Express.js, TypeScript.
  - **Database**: MySQL (using `mysql2` and `db-migrate`).
  - **Storage**: Amazon S3 (via `@aws-sdk/client-s3`).
  - **Frontend**: EJS templates, Tailwind CSS (CDN), Vanilla JavaScript.

## Prerequisites

- **Node.js** (v22+)
- **MySQL** (v8+)
- **AWS S3 Bucket** (for image storage)
- **Docker** (optional, for running the local MySQL database)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/manoj-negi/wild-o-photo.git
   cd wild-o-photo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root of the project with the following keys:
   ```env
   # Application Configuration
   PORT=3000
   SESSION_SECRET=your_secure_session_secret_here

   # Admin Credentials
   # Set a plain text password here for local testing, or use bcrypt hashes for production
   ADMIN_PASSWORD=your_admin_password

   # Database Configuration (MySQL)
   DB_HOST=127.0.0.1
   DB_PORT=3307
   DB_USER=root
   DB_PASSWORD=your_db_password
   DB_NAME=wild-photos

   # AWS S3 Configuration
   AWS_REGION=your_aws_region
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   S3_BUCKET=your_s3_bucket_name
   ```

4. **Database Setup & Migrations:**
   Ensure your MySQL server is running (or start it via `docker-compose up -d`). Then run the database migrations to build the schema:
   ```bash
   npm run migrate:up
   ```

## Running the Application

**Development Mode** (with hot-reloading via `tsx watch`):
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

**Production Build & Run:**
```bash
# Compile TypeScript to the dist/ directory
npm run build

# Start the Node process
npm start
```

## Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Compiles TypeScript source to JavaScript (`/dist`).
- `npm start`: Runs the compiled production server.
- `npm run typecheck`: Runs TypeScript type checking without emitting files.
- `npm run migrate:up`: Applies all pending database migrations.
- `npm run migrate:down`: Reverts the last database migration.
- `npm run migrate:reset`: Drops all tables and resets the database.

## Application Structure

- `/src`: Contains the main TypeScript application code (controllers, routes, config, server entry).
- `/views`: EJS templates for the public site (`/site`) and admin dashboard (`/admin`).
- `/public`: Static assets (JavaScript, CSS, images).
- `/migrations`: SQL scripts managed by `db-migrate` for database schema updates.
- `/config`: Configuration files for the database and `db-migrate`.

## License

This project is proprietary. All rights reserved.
