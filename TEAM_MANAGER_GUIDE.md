# 🏆 Team Manager System - Complete Guide

## 📋 Overview

The Team Manager allows users to edit team data (roster, progress, info) based on their rank. This is **separate** from the Account Manager, which handles team creation/deletion and name changes.

---

## 🎯 Key Concepts

### **What's the Difference?**

| Feature | Team Manager | Account Manager |
|---------|-------------|-----------------|
| **Purpose** | Edit team DATA | Manage teams themselves |
| **Edits** | Roster, Progress, Team Info | Name, Description, Create/Delete |
| **Access** | Rank-based per team | Guild Master only |
| **Location** | `/team-manager/:teamId` | `/account-manager` |

**Why separate?**
- **Security**: Team names are critical identifiers - only admins should change them
- **Permissions**: Team Leads can manage their team's data, not the team itself
- **Safety**: Changes to team data never affect other teams

---

## 🛡️ Permission System

### **Guild Master & Council**
- ✅ Can access ANY team
- ✅ Can edit ALL team data
- ✅ See all teams in the teams list

### **Team Lead**
- ✅ Can access ONLY their assigned team
- ✅ Can edit ONLY their team's data
- ❌ Cannot see other teams
- ❌ Cannot change team name

### **How It Works**

```javascript
// Frontend checks (for UI only)
if (user.rank === 'TEAM_LEAD') {
  // Show only their team
} else if (user.rank === 'GUILD_MASTER' || user.rank === 'COUNCIL') {
  // Show all teams
}

// Backend ENFORCES permissions (the real security)
if (!canEditTeam(user, teamId)) {
  return 403 Forbidden
}
```

---

## 💾 Database Schema

### **Teams Table**

```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,      -- Read-only in Team Manager
  description TEXT,                -- Read-only in Team Manager
  roster TEXT DEFAULT '[]',        -- Editable: JSON array
  progress TEXT DEFAULT '{}',      -- Editable: JSON object
  team_info TEXT DEFAULT '{}',     -- Editable: JSON object
  created_at TEXT,
  updated_at TEXT
)
```

### **Data Structure Examples**

**roster** (JSON array):
```json
[
  {
    "name": "Player1",
    "role": "Tank",
    "status": "Active"
  },
  {
    "name": "Player2",
    "role": "Healer",
    "status": "Inactive"
  }
]
```

**progress** (JSON object):
```json
{
  "status": "On Track",
  "completion": 75,
  "notes": "Completed phase 1, starting phase 2"
}
```

**teamInfo** (JSON object):
```json
{
  "description": "Our elite raid team",
  "goals": "Clear all content by end of month",
  "meeting_schedule": "Every Monday at 7:00 PM"
}
```

---

## 🔐 API Endpoints

### **GET /api/teams/[id]/data**

Get team data for editing.

**Security:**
- Checks if user can access this team
- GUILD_MASTER/COUNCIL: Any team
- TEAM_LEAD: Only their team

**Request:**
```bash
GET /api/teams/1/data
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alpha Team",
    "description": "Main raid team",
    "roster": [...],
    "progress": {...},
    "teamInfo": {...},
    "updated_at": "2026-01-26T12:00:00Z"
  }
}
```

**Error Cases:**
- `401`: Not logged in
- `403`: Don't have permission to access this team
- `404`: Team not found

---

### **PATCH /api/teams/[id]/data**

Update team data ONLY (not name or description).

**Security:**
- Same permission checks as GET
- Updates ONLY this team (never affects others)
- Validates JSON format

**Request:**
```bash
PATCH /api/teams/1/data
Authorization: Bearer <token>
Content-Type: application/json

{
  "roster": [
    {"name": "Player1", "role": "Tank", "status": "Active"}
  ],
  "progress": {
    "status": "On Track",
    "completion": 80,
    "notes": "Great progress!"
  },
  "teamInfo": {
    "description": "Updated description",
    "goals": "New goals",
    "meeting_schedule": "Tuesday 8PM"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alpha Team",
    "roster": [...],
    "progress": {...},
    "teamInfo": {...},
    "updated_at": "2026-01-26T12:30:00Z"
  }
}
```

**Important:**
- You can update any combination of roster, progress, teamInfo
- Missing fields are not changed
- Changes only affect this team

---

## 🎨 Frontend Pages

### **1. Teams List (`/teams`)**

Shows all teams user can access.

**Features:**
- Lists teams with access indicators
- "Can Edit" badge for accessible teams
- "No Access" badge for inaccessible teams
- Link to Team Manager for accessible teams

**Permission Logic:**
```javascript
const canEdit = canAccessTeam(user, team.id)
// Shows different UI based on access
```

---

### **2. Team Manager (`/team-manager/:teamId`)**

Edit team data fields.

**Features:**
- **Roster Section**: Add/remove members, set roles and status
- **Progress Section**: Track status, completion %, notes
- **Team Info Section**: Description, goals, meeting schedule
- Save/Reset buttons
- Real-time success/error messages

**Security:**
- Permission checked on page load
- If no access → shows error and redirects
- Server validates every save request

---

## 🔒 Security Architecture

### **Frontend (UI Only)**

```javascript
// Step 1: Check permission in UI
if (!canAccessTeam(user, teamId)) {
  // Hide team or show "No Access"
}

// Step 2: Make API call
const response = await fetch(`/api/teams/${teamId}/data`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### **Backend (Real Security)**

```javascript
// Step 1: Verify user is logged in
const user = requireAuth(request)

// Step 2: Check if user can access this team
if (!canEditTeam(user, teamId)) {
  return 403 Forbidden
}

// Step 3: Load/update data for THIS team only
const team = await db.query('SELECT * FROM teams WHERE id = ?', [teamId])
```

**Why Both?**
- Frontend: Better user experience (no wasted clicks)
- Backend: Real security (can't be bypassed)

---

## 📊 Data Flow

### **Loading Team Data**

```
User clicks "Manage Team"
         ↓
Frontend: Check canAccessTeam() → Show UI or error
         ↓
Frontend: GET /api/teams/:id/data
         ↓
Backend: Verify JWT token
         ↓
Backend: Check canEditTeam(user, teamId)
         ↓
Backend: Load team from database
         ↓
Backend: Parse JSON fields
         ↓
Backend: Return data
         ↓
Frontend: Display in form
```

### **Saving Team Data**

```
User clicks "Save Changes"
         ↓
Frontend: Collect form data
         ↓
Frontend: PATCH /api/teams/:id/data
         ↓
Backend: Verify JWT token
         ↓
Backend: Check canEditTeam(user, teamId)
         ↓
Backend: Validate JSON format
         ↓
Backend: UPDATE teams SET ... WHERE id = ?
         ↓
Backend: Return updated data
         ↓
Frontend: Show success message
```

**Important:** The `WHERE id = ?` ensures ONLY this team is affected!

---

## 🧪 Testing

### **Test as Guild Master**

1. Login as Guild Master
2. Go to Account Manager → Create 2 teams
3. Go to My Teams → Should see both teams
4. Click "Manage Team" on Team 1
5. Edit roster, progress, info
6. Click "Save Changes"
7. Verify changes saved
8. Go back and manage Team 2
9. Verify Team 1 data unchanged

### **Test as Team Lead**

1. Login as Guild Master
2. Create a Team Lead assigned to Team 1
3. Logout → Login as Team Lead
4. Go to My Teams → Should see ONLY Team 1
5. Click "Manage Team"
6. Edit and save
7. Try visiting `/team-manager/2` directly
8. Should get "No permission" error
9. Try API: `GET /api/teams/2/data`
10. Should get 403 Forbidden

### **Test as Council**

1. Create a Council member
2. Login as Council
3. Go to My Teams → Should see all teams
4. Can edit any team
5. Cannot access Account Manager

---

## 🐛 Common Issues

### **"Team data not loading"**
- Check console for errors
- Verify backend is running
- Check token in localStorage
- Verify user has permission

### **"403 Forbidden"**
- Team Lead trying to access wrong team
- Check `user.team_id` matches `teamId`
- Verify rank is correct

### **"Changes don't save"**
- Check console for validation errors
- Verify JSON format is correct
- Check server logs for errors

### **"Team name changed accidentally"**
- Impossible! Team Manager doesn't allow name changes
- Name can only be changed in Account Manager

---

## 📚 Code Examples

### **Frontend: Check Permission**

```javascript
import { getCurrentUser, canAccessTeam } from '../utils/auth'

const user = getCurrentUser()
const teamId = 1

if (canAccessTeam(user, teamId)) {
  // Show "Manage Team" button
} else {
  // Show "No Access" message
}
```

### **Frontend: Load Team Data**

```javascript
const loadTeam = async (teamId) => {
  const token = localStorage.getItem('token')
  const response = await fetch(`http://localhost:3001/api/teams/${teamId}/data`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  const data = await response.json()
  
  if (data.success) {
    setTeamData(data.data)
  } else {
    setError(data.message)
  }
}
```

### **Frontend: Save Team Data**

```javascript
const saveTeam = async (teamId, roster, progress, teamInfo) => {
  const token = localStorage.getItem('token')
  const response = await fetch(`http://localhost:3001/api/teams/${teamId}/data`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ roster, progress, teamInfo })
  })
  
  const data = await response.json()
  
  if (data.success) {
    alert('Saved!')
  } else {
    alert('Error: ' + data.message)
  }
}
```

### **Backend: Permission Check**

```typescript
export function canEditTeam(user: JWTPayload | null, teamId: number): boolean {
  if (!user) return false

  // Guild Master and Council can edit any team
  if (user.rank === 'GUILD_MASTER' || user.rank === 'COUNCIL') {
    return true
  }

  // Team Lead can only edit their assigned team
  if (user.rank === 'TEAM_LEAD') {
    return user.teamId === teamId
  }

  return false
}
```

---

## 🎓 Beginner's Explanation

### **What is Team Manager?**

Think of your guild as a company:
- **Account Manager** = HR Department (hires, fires, sets up teams)
- **Team Manager** = Team Lead's Dashboard (manages team's daily work)

### **Why can't Team Leads change team names?**

Imagine if every teacher could rename their classroom:
- Chaos! No one would know where to go
- Only the principal (Guild Master) should rename classrooms
- Teachers manage what happens IN the classroom

### **How does permission checking work?**

Like a nightclub bouncer:
1. **Frontend Bouncer** (nice guy): "Hey, you probably can't go in there"
2. **Backend Bouncer** (enforcer): "Show me your ID, let me verify you're on the list"

The real security is always the backend bouncer!

### **Why store data as JSON?**

JSON is like a flexible storage box:
- You can put anything in it
- Easy to add new fields later
- Keeps database simple

Instead of:
```sql
CREATE TABLE roster (id, name, role, status...)
```

We do:
```sql
roster TEXT  -- Store as JSON
```

Pros: Flexible, easy to change
Cons: Can't search inside JSON easily (but that's okay for our use case)

---

## 🚀 Summary

✅ **Security First:**
- All permission checks on backend
- Frontend just makes UI nicer
- Can't trick the system by modifying frontend

✅ **Separation of Concerns:**
- Team Manager = Edit team data
- Account Manager = Manage teams themselves
- Never mix the two

✅ **Rank-Based Access:**
- Guild Master & Council: All teams
- Team Lead: Only their team
- Enforced server-side

✅ **Data Isolation:**
- Each team's data is independent
- Changes to Team 1 never affect Team 2
- Guaranteed by SQL `WHERE id = ?`

---

Your Team Manager is complete and production-ready! 🎉
