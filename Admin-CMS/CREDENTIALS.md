# Admin Credentials

## Super Admin Account

Use these credentials to log in to the QV Admin Panel:

**Email:** `admin@qvhealth.com`  
**Password:** `Admin@123456`

**Role:** Super Admin  
**Name:** Ahmed Hassan

---

## Additional Admin Accounts (for testing)

### Content Admin 1
- **Email:** `layla@qvhealth.com`
- **Password:** `Content@123`
- **Role:** Content Admin
- **Name:** Layla Mohammed

### Content Admin 2
- **Email:** `omar@qvhealth.com`
- **Password:** `Content@456`
- **Role:** Content Admin
- **Name:** Omar Al-Fayed

### Viewer
- **Email:** `sara@qvhealth.com`
- **Password:** `Viewer@789`
- **Role:** Viewer (Read-only)
- **Name:** Sara Abdullah

---

## Important Notes

1. **Admins are NOT Users**: The admin accounts above are separate from regular platform users
2. **Authentication**: Login at the root URL (http://localhost:3000 after `npm run dev`)
3. **2FA Disabled**: Two-factor authentication is disabled for easy testing
4. **Mock Data**: These are mock credentials for development only
5. **Production**: In production, use proper authentication with hashed passwords and secure sessions

## What Each Role Can Do

- **Super Admin**: Full access to all features and settings
- **Content Admin**: Manage content (articles, quizzes, webinars, stories, products)
- **Viewer**: Read-only access to view data and reports

---

**Security Note:** These are development credentials only. Never use these in production!
