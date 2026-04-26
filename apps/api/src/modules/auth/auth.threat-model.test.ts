import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../auth/token.service";

const MOCK_USER = { userId: "user-1", role: "doctor", clinicId: "clinic-1" };

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

// Brute force / invalid token handling
function testInvalidTokenRejected() {
  const result = verifyAccessToken("not.a.real.token");
  assert(result === null, "Invalid access token returns null");
}

// Tampered token rejected
function testTamperedTokenRejected() {
  const token = signAccessToken(MOCK_USER);
  const tampered = token.slice(0, -5) + "XXXXX";
  assert(verifyAccessToken(tampered) === null, "Tampered access token is rejected");
}

// Refresh token cannot be used as access token
function testRefreshTokenNotAcceptedAsAccess() {
  const refresh = signRefreshToken(MOCK_USER);
  assert(verifyAccessToken(refresh) === null, "Refresh token rejected as access token");
}

// Access token cannot be used as refresh token
function testAccessTokenNotAcceptedAsRefresh() {
  const access = signAccessToken(MOCK_USER);
  assert(verifyRefreshToken(access) === null, "Access token rejected as refresh token");
}

// Valid tokens decode correctly
function testValidTokenDecodes() {
  const access = signAccessToken(MOCK_USER);
  const decoded = verifyAccessToken(access);
  assert(decoded?.userId === MOCK_USER.userId, "Valid access token decodes userId");
  assert(decoded?.role === MOCK_USER.role, "Valid access token decodes role");
}

// Empty string rejected
function testEmptyTokenRejected() {
  assert(verifyAccessToken("") === null, "Empty string rejected as access token");
}

[
  testInvalidTokenRejected,
  testTamperedTokenRejected,
  testRefreshTokenNotAcceptedAsAccess,
  testAccessTokenNotAcceptedAsRefresh,
  testValidTokenDecodes,
  testEmptyTokenRejected,
].forEach((fn) => fn());
