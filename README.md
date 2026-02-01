# Next.js REST API Backend

A robust REST API backend built with Next.js, TypeScript, and MySQL featuring comprehensive error handling and proper HTTP status codes.

## Features

- ✅ Full CRUD operations (GET, POST, PUT, PATCH, DELETE)
- ✅ Comprehensive error handling with custom error classes
- ✅ Proper HTTP status codes
- ✅ MySQL database integration with connection pooling
- ✅ Request validation
- ✅ Pagination support
- ✅ TypeScript for type safety
- ✅ Health check endpoint

## Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nextjs_backend
```

3. Create the database and table:
```sql
CREATE DATABASE nextjs_backend;

USE nextjs_backend;

CREATE TABLE items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2),
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

4. Run the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /api/health` - Check API and database status

### Items Resource
- `GET /api/items` - Get all items (supports pagination and search)
  - Query params: `page`, `limit`, `search`
- `GET /api/items/[id]` - Get a single item by ID
- `POST /api/items` - Create a new item
- `PUT /api/items/[id]` - Full update of an item
- `PATCH /api/items/[id]` - Partial update of an item
- `DELETE /api/items/[id]` - Delete an item

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["Error details"]
  }
}
```

## HTTP Status Codes

- `200 OK` - Successful GET, PUT, PATCH requests
- `201 Created` - Successful POST requests
- `204 No Content` - Successful DELETE requests
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate entry)
- `422 Unprocessable Entity` - Validation errors
- `500 Internal Server Error` - Server errors
- `503 Service Unavailable` - Database unavailable

## Error Handling

The API includes comprehensive error handling:

- Custom error classes for different error types
- MySQL error translation
- Validation error details
- Stack traces in development mode
- Consistent error response format

## Database

The project uses MySQL with connection pooling for efficient database operations. The database configuration is managed through environment variables.

## Project Structure

```
src/
├── app/
│   └── api/
│       ├── health/
│       │   └── route.ts
│       └── items/
│           ├── route.ts          # GET all, POST
│           └── [id]/
│               └── route.ts      # GET, PUT, PATCH, DELETE
├── lib/
│   ├── db.ts                     # Database connection and queries
│   ├── errors.ts                 # Custom error classes
│   ├── http-status.ts            # HTTP status code utilities
│   ├── api-response.ts           # Response helpers
│   └── middleware.ts              # Request handlers and utilities
```

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

MIT
