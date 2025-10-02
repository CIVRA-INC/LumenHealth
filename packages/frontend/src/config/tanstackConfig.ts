/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  QueryClient,
  QueryFunctionContext,
  QueryKey,
} from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

const serverContext = process.env.NODE_ENV;

// Type definitions for better type safety
export type ApiResponse<T = any> = {
  data: T;
  message?: string;
  status: number;
  success: boolean;
};

export type ApiError = AxiosError<{
  message: string;
  status: number;
  success: false;
}>;

// Create a new QueryClient with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default options for queries
      queryFn: async ({ queryKey }: QueryFunctionContext) => {
        const { data } = await axios.get(`${queryKey[0]}`);
        return data.data;
      },
      retry: (count: number, error: any): boolean =>
        !error.response && count < 3 ? true : false,
      refetchOnWindowFocus: serverContext === "production",
      retryDelay: 5,
      staleTime: 3 * 60 * 1000, // 3 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      // Default options for mutations
      retry: (count: number, error: any): boolean =>
        !error.response && count < 3 ? true : false,
      retryDelay: 5,
      onMutate: async (variables) => {
        console.log("Mutation started with variables:", variables);
        // Optionally implement optimistic updates here
      },
      onError: (error) => {
        console.error("Mutation failed:", error.message);
      },
      onSuccess: (data) => {
        console.log("Mutation succeeded:", data);
      },
    },
  },
});

// Helper function to create query keys
export const createQueryKey = (
  endpoint: string,
  params?: Record<string, any>
): QueryKey => {
  return params ? [endpoint, params] : [endpoint];
};
