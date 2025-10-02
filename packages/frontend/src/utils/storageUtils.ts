// Utility functions for localStorage and cookies with namespacing

export const getNamespacedKey = (key: string): string => {
  return `lumen_health_${key}`;
};

export const getFromLocalStorage = <T>(
  key: string,
  parseData: boolean = true
) => {
  const namespacedKey = getNamespacedKey(key);
  const data = localStorage.getItem(namespacedKey);
  if (data) {
    return parseData ? (JSON.parse(data) as T) : (data as T);
  }
  return data as T;
};

export const saveToLocalStorage = <T>(key: string, value: T) => {
  const namespacedKey = getNamespacedKey(key);
  if (localStorage.getItem(namespacedKey))
    localStorage.removeItem(namespacedKey);
  try {
    localStorage.setItem(namespacedKey, JSON.stringify(value));
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const removeFromLocalStorage = (key: string) => {
  const namespacedKey = getNamespacedKey(key);
  try {
    localStorage.removeItem(namespacedKey);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const setCookie = (
  key: string,
  value: string,
  days: number = 7
): void => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/`;
};

export const getCookie = (key: string): string | null => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${encodeURIComponent(key)}=`))
    ?.split("=")[1]
    ? decodeURIComponent(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${encodeURIComponent(key)}=`))
          ?.split("=")[1] || ""
      )
    : null;
};

export const deleteCookie = (key: string): void => {
  document.cookie = `${encodeURIComponent(
    key
  )}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};
