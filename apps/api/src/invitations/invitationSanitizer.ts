export function sanitizeInvitation(inv: any) { delete inv.acceptToken; return inv; }
