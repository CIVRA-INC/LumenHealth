import axios from "axios";
import { toast } from "react-toastify";
import { getFromLocalStorage } from "@/utils/storageUtils";
import { BASE_URL } from "@/constants/apiConstants";

// Keep track of interceptors to remove them before adding new ones
let requestInterceptorId: number | null = null;
let responseInterceptorId: number | null = null;

export function configureAxios() {
  // First, remove any existing interceptors
  if (requestInterceptorId !== null) {
    axios.interceptors.request.eject(requestInterceptorId);
  }
  
  if (responseInterceptorId !== null) {
    axios.interceptors.response.eject(responseInterceptorId);
  }

  axios.defaults.baseURL = BASE_URL;
  axios.defaults.headers.post["Content-Type"] = "application/json";

  requestInterceptorId = axios.interceptors.request.use(
    (config) => {
      const token = getFromLocalStorage("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  responseInterceptorId = axios.interceptors.response.use(
    (response) => {
      if (response.data.message) {
        toast.dismiss(); // Dismiss any existing toasts
        toast.success(response.data.message);
      }
      return response;
    },
    (error) => {
      if (error.response?.data?.message) {
        toast.dismiss(); // Dismiss any existing toasts
        toast.error(error.response.data.message);
      }
      return Promise.reject(error);
    },
  );
}
