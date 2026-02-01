# 🛡️ Rank-Based Access Control System - Beginner's Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Ranks and Permissions](#ranks-and-permissions)
4. [Database Schema](#database-schema)
5. [Getting Started](#getting-started)
6. [API Endpoints](#api-endpoints)
7. [Security Notes](#security-notes)

---

## Overview

This is a **closed system** - there's no public signup. Only the Guild Master can create new users.

**Think of it like a video game guild:**
- The **Guild Master** is the owner (full control)
- The **Council** members are admins (can manage teams but not users)
- **Team Leads** manage only their assigned team

---

## How It Works

### 1. **Authentication Flow**

```
User enters username + password
        ↓
Backend checks if user exists
        ↓
Backend verifies password (securely hashed!)
        ↓
Backend generates a JWT token
        ↓
Frontend stores token (in localStorage or cookie)
        ↓
Frontend sends token with every request
        ↓
Backend checks token and permissions
```

### 2. **What is a JWT Token?**

Think of a JWT token like a **VIP pass at a concert**:
- It proves who you are
- It shows what you're allowed to do
- It expires after 7 days (for security)
- You show it every time you want to access something

---

## Ranks and Permissions

### 🏆 GUILD_MASTER (Highest Rank)
**Can do EVERYTHING:**
- ✅ Create new users
- ✅ Delete users
- ✅ Change anyone's password
- ✅ Change anyone's rank
- ✅ Assign users to teams
- ✅ Create/edit/delete teams
- ✅ Access Account Manager page
- ✅ View and edit ALL teams

**Cannot have:** A team assignment (they oversee ALL teams)

---

### 👑 COUNCIL (Admin Rank)
**Can manage teams:**
- ✅ View ALL teams
- ✅ Edit ANY team
- ❌ Cannot create/delete teams
- ❌ Cannot manage users
- ❌ Cannot change passwords or ranks
- ❌ Cannot access Account Manager

**Cannot have:** A team assignment (they oversee ALL teams)

---

### 🎯 TEAM_LEAD (Basic Rank)
**Limited to one team:**
- ✅ View ONLY their assigned team
- ✅ Edit ONLY their assigned team
- ❌ Cannot see other teams
- ❌ Cannot create teams
- ❌ Cannot manage users

**Must have:** Exactly ONE team assigned

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,        -- Password is HASHED (secure!)
  rank TEXT NOT NULL,                 -- GUILD_MASTER, COUNCIL, or TEAM_LEAD
  team_id INTEGER,                    -- Only for TEAM_LEAD
  created_at TEXT,
  updated_at TEXT
)
```

### Teams Table
```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT,
  updated_at TEXT
)
```

---

## Getting Started

### Step 1: Create Initial Guild Master

**ONE TIME ONLY** - Run this to create your first user:

```bash
POST http://localhost:3001/api/auth/seed
```

This creates a Guild Master with:
- **Username:** `guildmaster`
- **Password:** `changeme123`

⚠️ **IMPORTANT:** Change this password immediately after logging in!

---

### Step 2: Login

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "username": "guildmaster",
  "password": "changeme123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "guildmaster",
      "rank": "GUILD_MASTER",
      "team_id": null
    }
  }
}
```

**Save the token!** You'll need it for all other requests.

---

### Step 3: Use the Token

For all protected endpoints, include the token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## API Endpoints

### 🔐 Authentication

#### Login
```
POST /api/auth/login
Body: { username, password }
Returns: { token, user }
```

#### Create Initial Guild Master (ONE TIME)
```
POST /api/auth/seed
Returns: Default credentials
```

---

### 👤 User Management (GUILD_MASTER Only)

#### Get All Users
```
GET /api/users
Headers: Authorization: Bearer <token>
Returns: List of all users
```

#### Create User
```
POST /api/users
Headers: Authorization: Bearer <token>
Body: { username, password, rank, teamId? }

Example - Create a Team Lead:
{
  "username": "teamlead1",
  "password": "securepass123",
  "rank": "TEAM_LEAD",
  "teamId": 1
}

Example - Create Council Member:
{
  "username": "council1",
  "password": "securepass123",
  "rank": "COUNCIL"
  // No teamId for Council!
}
```

#### Update User
```
PATCH /api/users/[id]
Headers: Authorization: Bearer <token>
Body: { username?, rank?, teamId? }
```

#### Change Password
```
PATCH /api/users/[id]/password
Headers: Authorization: Bearer <token>
Body: { password }
```

#### Delete User
```
DELETE /api/users/[id]
Headers: Authorization: Bearer <token>
```

---

### 🏢 Team Management

#### Get All Teams (You Can Access)
```
GET /api/teams
Headers: Authorization: Bearer <token>

Returns:
- GUILD_MASTER & COUNCIL: All teams
- TEAM_LEAD: Only their team
```

#### Create Team (GUILD_MASTER Only)
```
POST /api/teams
Headers: Authorization: Bearer <token>
Body: { name, description? }
```

#### Get Single Team
```
GET /api/teams/[id]
Headers: Authorization: Bearer <token>

Access Rules:
- GUILD_MASTER & COUNCIL: Any team
- TEAM_LEAD: Only their team
```

#### Update Team
```
PATCH /api/teams/[id]
Headers: Authorization: Bearer <token>
Body: { name?, description? }

Access Rules:
- GUILD_MASTER & COUNCIL: Any team
- TEAM_LEAD: Only their team
```

#### Delete Team (GUILD_MASTER Only)
```
DELETE /api/teams/[id]
Headers: Authorization: Bearer <token>
```

---

## Security Notes

### ✅ What We Do Right

1. **Passwords are HASHED** - We never store plain passwords
   - Uses bcrypt with 10 salt rounds
   - Even if database is stolen, passwords are safe

2. **Server-Side Validation** - All permission checks happen on the backend
   - Frontend can't fake permissions
   - Even if someone modifies the UI, backend will reject unauthorized requests

3. **JWT Tokens** - Secure, stateless authentication
   - Tokens expire after 7 days
   - Contains user info (rank, teamId) for fast permission checks

4. **SQL Injection Protection** - We use parameterized queries
   - All database queries use `?` placeholders
   - User input is automatically escaped

### 🔒 Production Checklist

Before going live, make sure to:

1. **Change JWT Secret**
   ```
   Set environment variable: JWT_SECRET=your-very-long-random-secret-key
   ```

2. **Remove Seed Endpoint**
   - Delete `/api/auth/seed/route.ts` after initial setup

3. **Use HTTPS**
   - Never send tokens over plain HTTP in production

4. **Add Rate Limiting**
   - Prevent brute force login attempts

5. **Add Logging**
   - Track who does what (audit trail)

---

## Code Structure

```
src/
├── lib/
│   ├── auth.ts              # Password hashing, JWT generation/verification
│   ├── auth-middleware.ts   # Extract user from request
│   ├── permissions.ts       # Permission check functions
│   └── db.ts               # Database connection & schema
│
└── app/api/
    ├── auth/
    │   ├── login/route.ts   # Login endpoint
    │   └── seed/route.ts    # Create initial Guild Master
    │
    ├── users/               # User management (GUILD_MASTER only)
    │   ├── route.ts         # GET all, POST create
    │   └── [id]/
    │       ├── route.ts     # GET, PATCH, DELETE user
    │       └── password/
    │           └── route.ts # PATCH password
    │
    └── teams/               # Team management (rank-based)
        ├── route.ts         # GET all, POST create
        └── [id]/
            └── route.ts     # GET, PATCH, DELETE team
```

---

## Example Workflow

### Creating a New Team Lead

**Step 1:** Guild Master creates a team
```bash
POST /api/teams
Authorization: Bearer <guild-master-token>
{
  "name": "Raid Team Alpha",
  "description": "Main raid progression team"
}
```

**Step 2:** Guild Master creates a Team Lead user
```bash
POST /api/users
Authorization: Bearer <guild-master-token>
{
  "username": "raidleader1",
  "password": "temp123",
  "rank": "TEAM_LEAD",
  "teamId": 1
}
```

**Step 3:** Team Lead logs in
```bash
POST /api/auth/login
{
  "username": "raidleader1",
  "password": "temp123"
}
```

**Step 4:** Team Lead can now manage their team
```bash
PATCH /api/teams/1
Authorization: Bearer <team-lead-token>
{
  "description": "Updated description"
}
```

But they CANNOT access other teams:
```bash
GET /api/teams/2
Authorization: Bearer <team-lead-token>
// Returns: 403 Forbidden
```

---

## Common Questions

**Q: Can I have multiple Guild Masters?**
A: Yes! Guild Master can create more Guild Masters.

**Q: Can Team Leads see other teams?**
A: No, they can only see and edit their assigned team.

**Q: Can Council members create users?**
A: No, only Guild Master can manage users.

**Q: How do I change a Team Lead's assigned team?**
A: Guild Master can update the user's `teamId`.

**Q: Can I delete my own account?**
A: No, the system prevents this for safety.

---

## Need Help?

This system is designed to be simple and secure. All permission checks are in `src/lib/permissions.ts` - that's your single source of truth for who can do what!
