import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export async function saveAuthSession(token: string, refreshToken: string): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

export async function getAuthSession(): Promise<{ token: string; refreshToken: string } | null> {
  const results = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  const token = results[0][1];
  const refreshToken = results[1][1];

  if (!token || !refreshToken) {
    return null;
  }

  return { token, refreshToken };
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}
