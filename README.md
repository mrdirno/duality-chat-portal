# DUALITY Chat Portal

Secure chat access portal with Google Sign-In authentication, hosted on GitHub Pages.

## Live URL

https://mrdirno.github.io/duality-chat-portal/

## Features

- Google Sign-In (Firebase Authentication)
- Email whitelist restriction
- Chat session viewer with search
- Import/export chat data (JSON)
- Responsive design

## Firebase Setup (Required)

### 1. Enable Google Sign-In

1. Go to [Firebase Console](https://console.firebase.google.com/project/gen-lang-client-0863290025/authentication/providers)
2. Click **Google** under Sign-in providers
3. Toggle **Enable**
4. Set support email
5. Save

### 2. Add Authorized Domain

1. Go to [Authentication Settings](https://console.firebase.google.com/project/gen-lang-client-0863290025/authentication/settings)
2. Under **Authorized domains**, click **Add domain**
3. Add: `mrdirno.github.io`
4. Save

## Configuration

Edit `js/config.js` to change:

```javascript
CONFIG = {
    FIREBASE: {
        apiKey: "...",
        authDomain: "gen-lang-client-0863290025.firebaseapp.com",
        projectId: "gen-lang-client-0863290025"
    },
    AUTHORIZED_EMAILS: [
        'drinoman@gmail.com'  // Add authorized emails here
    ]
}
```

## File Structure

```
chat-portal/
├── index.html          # Main page
├── css/style.css       # Styles
├── js/
│   ├── config.js       # Firebase & auth config
│   ├── auth-firebase.js # Authentication logic
│   ├── portal.js       # Chat viewer
│   └── app-firebase.js # Main app
└── data/
    └── chats.json      # Sample chat data
```

## Security

- Only whitelisted emails can access
- Uses Google's authentication infrastructure
- Session persists until logout
- No passwords stored locally

## Local Development

```bash
# Serve locally
python3 -m http.server 8000
# Open http://localhost:8000
```

Note: Google Sign-In requires `localhost` to be added as an authorized domain for local testing.
