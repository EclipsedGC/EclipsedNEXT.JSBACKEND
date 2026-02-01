# 🚀 Quick Start Guide - Rank-Based Access Control

## Step 1: Create Initial Guild Master (ONE TIME)

```bash
curl -X POST http://localhost:3001/api/auth/seed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "guildmaster",
    "temporaryPassword": "changeme123",
    "warning": "PLEASE CHANGE THIS PASSWORD IMMEDIATELY"
  }
}
```

---

## Step 2: Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"guildmaster","password":"changeme123"}'
```

**Save the token from the response!**

---

## Step 3: Create a Team

```bash
curl -X POST http://localhost:3001/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"Alpha Team","description":"Main raid team"}'
```

---

## Step 4: Create a Team Lead

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "username":"teamlead1",
    "password":"secure123",
    "rank":"TEAM_LEAD",
    "teamId":1
  }'
```

---

## Step 5: Create a Council Member

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "username":"council1",
    "password":"secure123",
    "rank":"COUNCIL"
  }'
```

---

## Permission Summary

| Action | GUILD_MASTER | COUNCIL | TEAM_LEAD |
|--------|--------------|---------|-----------|
| Create users | ✅ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ |
| Change passwords | ✅ | ❌ | ❌ |
| Change ranks | ✅ | ❌ | ❌ |
| Create teams | ✅ | ❌ | ❌ |
| Delete teams | ✅ | ❌ | ❌ |
| View all teams | ✅ | ✅ | ❌ |
| Edit all teams | ✅ | ✅ | ❌ |
| View own team | ✅ | ✅ | ✅ |
| Edit own team | ✅ | ✅ | ✅ |
| Account Manager | ✅ | ❌ | ❌ |

---

## All Endpoints

### Authentication
- `POST /api/auth/login` - Login (public)
- `POST /api/auth/seed` - Create initial Guild Master (remove after use)

### User Management (GUILD_MASTER only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `GET /api/users/[id]` - Get user details
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user
- `PATCH /api/users/[id]/password` - Change password

### Team Management (rank-based access)
- `GET /api/teams` - List accessible teams
- `POST /api/teams` - Create team (GUILD_MASTER only)
- `GET /api/teams/[id]` - Get team details
- `PATCH /api/teams/[id]` - Update team
- `DELETE /api/teams/[id]` - Delete team (GUILD_MASTER only)

---

## Environment Variables (Production)

Create a `.env.local` file:

```env
# JWT Secret (use a long random string!)
JWT_SECRET=your-very-long-random-secret-key-change-this-in-production

# Database path (optional)
SQLITE_PATH=./database/app.db
```

---

## Frontend Integration

### 1. Store Token After Login

```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
})

const data = await response.json()

if (data.success) {
  // Store token in localStorage
  localStorage.setItem('token', data.data.token)
  localStorage.setItem('user', JSON.stringify(data.data.user))
}
```

### 2. Send Token with Requests

```javascript
const token = localStorage.getItem('token')

const response = await fetch('http://localhost:3001/api/teams', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### 3. Check Permissions in UI

```javascript
const user = JSON.parse(localStorage.getItem('user'))

// Show Account Manager only to Guild Master
if (user.rank === 'GUILD_MASTER') {
  // Show Account Manager link
}

// Show team dropdown based on rank
if (user.rank === 'TEAM_LEAD') {
  // Only show their assigned team
} else if (user.rank === 'COUNCIL' || user.rank === 'GUILD_MASTER') {
  // Show all teams
}
```

---

## Security Reminders

1. ✅ Passwords are hashed with bcrypt
2. ✅ All permissions checked server-side
3. ✅ JWT tokens expire after 7 days
4. ✅ SQL injection protected with parameterized queries
5. ⚠️ Change JWT_SECRET in production
6. ⚠️ Remove /api/auth/seed after initial setup
7. ⚠️ Use HTTPS in production

---

## Testing with Postman/Thunder Client

1. Import this collection or create requests manually
2. After login, set Authorization header for all other requests:
   - Type: Bearer Token
   - Token: (paste the token from login response)

---

## Database Location

Your database is stored at:
```
next.js BACKEND/database/app.db
```

You can view it with SQLite tools like:
- DB Browser for SQLite
- SQLite Viewer (VS Code extension)
- Command line: `sqlite3 database/app.db`

---

For detailed documentation, see `AUTH_SYSTEM_GUIDE.md`
