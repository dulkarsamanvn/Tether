# Tether CMS

A blog management system with a **Laravel** API backend and a **React** frontend.

## Features

- User registration, login and logout (token login with Laravel Sanctum)
- Create, edit, delete and view blogs 
- Featured image upload
- Comments on blogs
- "My Blogs" dashboard for each user

### Coming Soon

- More features will be added over time

## Tech Stack

- **Backend:** PHP, Laravel, Laravel Sanctum, PostgreSQL
- **Frontend:** React (Vite), React Router, Axios

## Project Structure

```
Tether-CMS/
├── Backend/     Laravel API
└── Frontend/    React app
```

## Getting Started

### Requirements

- PHP 8.2 or higher
- Composer
- Node.js and npm
- A database (MySQL or PostgreSQL)

### 1. Backend setup

```bash
cd Backend
composer install
cp .env.example .env
php artisan key:generate
```

Open `.env` and set your database details:

```
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
APP_URL=http://127.0.0.1:8000
```

Then run:

```bash
php artisan migrate
php artisan db:seed --class=CategorySeeder
php artisan storage:link
php artisan serve
```

The API runs at `http://127.0.0.1:8000`.

### 2. Frontend setup

```bash
cd Frontend
npm install
```

Create a file named `.env` inside the `Frontend` folder:

```
VITE_API_URL=http://127.0.0.1:8000/api
```

Then start the app:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

> CORS: the Laravel file `config/cors.php` must list `http://localhost:5173` in `allowed_origins`.

## Author

Dulkar Saman V N