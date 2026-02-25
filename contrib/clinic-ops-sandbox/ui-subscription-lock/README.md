# UI Subscription Lock (Standalone)

Standalone global subscription-lock UX components.

## Includes

- Sticky warning banner for expiring state (< 7 days).
- Sticky red banner for expired state with `Pay Now` button.
- Action-lock wrapper that visually and functionally disables primary actions when expired.
- Utility function for days-remaining calculation.

## Files

- `subscription-state.js` computes `active | expiring | expired`.
- `SubscriptionLockUI.jsx` exports `SubscriptionLayout` and `ActionLock`.
- `App.jsx` demo with state toggles.

## Usage

```jsx
<SubscriptionLayout expiryIso={expiryIso} nowIso={nowIso} onPayNow={handlePayNow}>
  <DashboardActions />
</SubscriptionLayout>
```
