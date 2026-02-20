# Security Policy

This document defines security and authentication requirements for the application.

## 1. Authentication Flows

### 1.1 Login Requirements
- Users must authenticate with valid email and password
- Authentication state persists via session/cookies
- Failed attempts display clear error messages without revealing which field was incorrect

### 1.2 Registration Requirements
- New users must provide name, email, and password
- Email addresses must be unique
- Successful registration automatically authenticates the user

## 2. Authorization

### 2.1 Protected Routes
- Cart and checkout pages require authentication
- Anonymous/guest access is permitted for browsing products
- VIP status is determined by user tenure (> 2 years)

### 2.2 VIP Tier
- Users with tenure > 2 years are granted VIP status
- VIP badge displayed in cart and checkout
- VIPs receive 5% discount on eligible purchases

## 3. Session Management

### 3.1 Session Persistence
- Sessions persist across page refreshes
- Cart state is maintained via localStorage
- User state is maintained via server-side session

### 3.2 Logout
- Logout clears session and cart (optional)
- Returns user to login or home page
