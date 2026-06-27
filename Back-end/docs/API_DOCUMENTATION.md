# Backend API Documentation

This document describes the currently implemented and functional API endpoints for the Hamilul-Quran Backend application.

## Base URL Configuration
All endpoints are prefixed with the configuration from `settings.api_prefix`, which is typically `/api/v1`.

---

## 1. Health Endpoints

### `GET /health`
Returns the operational status of the API, the Database, and Redis.

- **Requires Authentication**: No
- **Response Structure** (200 OK):
  ```json
  {
      "status": "ok",
      "services": {
          "database": "ok",
          "redis": "ok"
      }
  }
  ```

---

## 2. Authentication Endpoints

These endpoints manage user authentication via JWT (JSON Web Tokens).

### `POST /auth/login`
Authenticate with email/password and receive JWT access + refresh tokens.

- **Requires Authentication**: No
- **Request Body**:
  ```json
  {
      "email": "user@test.io",
      "password": "Password@123"
  }
  ```
- **Response Structure** (200 OK):
  ```json
  {
      "access_token": "eyJhbGciOiJIUz...",
      "refresh_token": "eyJhbGciOiJIUz...",
      "expires_in": 3600,
      "token_type": "bearer"
  }
  ```

### `POST /auth/refresh`
Exchange a valid refresh token for a new access token.

- **Requires Authentication**: No
- **Request Body**:
  ```json
  {
      "refresh_token": "eyJhbGciOiJIUz..."
  }
  ```
- **Response Structure** (200 OK): Same as `/auth/login`.

### `POST /auth/logout`
Revoke a refresh token (deletes it from the Redis store). The access token will expire naturally.

- **Requires Authentication**: Yes (Bearer Token)
- **Request Body**:
  ```json
  {
      "refresh_token": "eyJhbGciOiJIUz..."
  }
  ```
- **Response Structure** (204 No Content)

### `GET /auth/me`
Get the current authenticated user's profile based on the Bearer token.

- **Requires Authentication**: Yes
- **Response Structure** (200 OK):
  ```json
  {
      "id": "uuid-string",
      "email": "user@test.io",
      "role": "ADMIN",
      "is_active": True
  }
  ```

---

## 3. User Management Endpoints

Endpoints for managing system users. Most endpoints require Admin privileges.

### `GET /users`
List all users.

- **Requires Authentication**: Yes
- **Role Required**: `ADMIN`
- **Query Parameters**:
  - `limit` (int): Number of items to return (1-100, default 20)
  - `offset` (int): Offset for pagination (default 0)
  - `search` (str, optional): Filter users by email
- **Response Structure** (200 OK):
  ```json
  {
      "items": [
          { "id": "uuid", "email": "user@test.io", "username": "user", "role": "STUDENT", "status": "ACTIVE", ... }
      ],
      "total": 1,
      "limit": 20,
      "offset": 0
  }
  ```

### `POST /users`
Create a new user.

- **Requires Authentication**: Yes
- **Role Required**: `ADMIN`
- **Request Body**:
  ```json
  {
      "email": "newuser@test.io",
      "username": "newuser",
      "password": "Password123!",
      "first_name": "New",
      "last_name": "User"
  }
  ```
- **Response Structure** (201 Created): Returns the created User object (without password hash).

### `GET /users/me`
Get the profile of the current authenticated user.

- **Requires Authentication**: Yes
- **Role Required**: Any
- **Response Structure** (200 OK): Returns the current User object.

### `GET /users/{user_id}`
Retrieve a user by ID.

- **Requires Authentication**: Yes
- **Role Required**: `ADMIN`
- **Response Structure** (200 OK): Returns the specific User object.

### `PATCH /users/{user_id}`
Update user fields.

- **Requires Authentication**: Yes
- **Role Required**: `ADMIN`
- **Request Body**: Partial User object (e.g., `{"first_name": "Updated"}`)
- **Response Structure** (200 OK): Returns the updated User object.

### `DELETE /users/{user_id}`
Deactivate a user.

- **Requires Authentication**: Yes
- **Role Required**: `ADMIN`
- **Response Structure** (204 No Content)
