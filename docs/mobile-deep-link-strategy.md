# Mobile Deep-Link Strategy

## URL Scheme

**Custom URL Scheme:** `lumenhealth://`

**Universal Links Domain:** `app.lumenhealth.com`

## Deep Link Routes

| Deep Link URL | Screen / Route | Description |
|---|---|---|
| `lumenhealth://artist/:id` | `ArtistProfile` | Opens the profile page for a given artist by ID |
| `lumenhealth://session/:id` | `SessionDetail` | Opens a specific session by ID |
| `lumenhealth://auth/callback` | `AuthCallback` | Handles OAuth/SSO authentication callbacks |

## Implementation Notes

### react-navigation Linking Config

Configure the `linking` prop on `NavigationContainer` to map deep link URLs to screens:

```ts
const linking = {
  prefixes: ['lumenhealth://', 'https://app.lumenhealth.com'],
  config: {
    screens: {
      ArtistProfile: 'artist/:id',
      SessionDetail: 'session/:id',
      AuthCallback: 'auth/callback',
    },
  },
};
```

Pass `linking` to `NavigationContainer`:

```tsx
<NavigationContainer linking={linking}>
  {/* ... */}
</NavigationContainer>
```

### Universal Links (iOS) / App Links (Android)

- **iOS:** Add the `applinks:app.lumenhealth.com` entitlement and host an `apple-app-site-association` file at `https://app.lumenhealth.com/.well-known/apple-app-site-association`.
- **Android:** Add `intent-filter` entries in `AndroidManifest.xml` referencing `app.lumenhealth.com` and host a `assetlinks.json` file at `https://app.lumenhealth.com/.well-known/assetlinks.json`.

## Fallback Behavior

- Any unrecognised deep link route (`lumenhealth://unknown`) navigates the user to the **Home** screen by default.
- If the app is not installed, Universal Links fall back to the web URL `https://app.lumenhealth.com` in the browser.
- Authentication callback URLs are validated against an allowlist before processing to prevent open-redirect attacks.
