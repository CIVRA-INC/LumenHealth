import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const session = await getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (session?.accessToken) {
    // @ts-ignore
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${API_URL}${url}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'API request failed');
  }
  
  // Handle responses with no content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
}

// Staff API functions
export const getStaff = () => fetchWithAuth('/staff');
export const createStaff = (data: any) => fetchWithAuth('/staff', { method: 'POST', body: JSON.stringify(data) });
export const updateStaff = (id: string, data: any) => fetchWithAuth(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const toggleStaffStatus = (id: string) => fetchWithAuth(`/staff/${id}/status`, { method: 'PATCH' });