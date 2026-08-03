# Project Rules — Lily Charm (Flower Art)

## Post-Deployment Guidelines
- **Brevo SMTP IP Restriction**: When deploying to production cloud hosts (Render, Vercel, Railway), ensure IP restrictions in Brevo Dashboard (Transactional ➔ SMTP & API ➔ Authorized IPs) are disabled/unrestricted so cloud dynamic IPs can send transactional emails.
- **Environment Variables**: Use dynamic `process.env` configuration (`CLIENT_URL`, `ADMIN_CLIENT_URL`, `SERVER_URL`, `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`) across all environments without hardcoding localhost or static IP addresses in production code.
