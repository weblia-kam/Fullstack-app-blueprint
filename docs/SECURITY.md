Security baseline: Helmet on API, CSP on web, cookies HttpOnly+Secure+SameSite (web), tokens in secure storage (mobile), rate limiting, DTO validation.

### Mobile token handling

- Access tokens hold short-lived session state and are only stored in memory inside the Flutter client. They are cleared on logout and app restart.
- Refresh tokens are written exclusively to the platform secure storage (Android Keystore/iOS Keychain) via `flutter_secure_storage` and rotated on every refresh call.
- API calls attach the in-memory access token. A dedicated interceptor transparently retries once after a 401 by exchanging the stored refresh token at `/auth/refresh`.
- Failed refresh attempts immediately wipe all local credentials, raise an `AuthExpiredException`, surface “Session expired, please log in again” to the user, and force navigation back to the login screen.
