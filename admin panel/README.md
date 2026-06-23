# Inventory Admin Panel

React admin panel for the Prisma/PostgreSQL inventory schema.

## Tech

- HTML
- Bootstrap
- React JS
- Axios
- React Router DOM

## Setup

1. Run `npm install`
2. Copy `.env.example` to `.env`
3. Paste your backend routes in `.env`
4. Run `npm run dev`

## Backend Route Format

Each page expects normal REST endpoints:

- `GET /resource` for all records
- `POST /resource` to create
- `PUT /resource/:id` to edit
- `DELETE /resource/:id` to delete

If your backend uses different route names, update the matching `VITE_*_URL` value in `.env`.
