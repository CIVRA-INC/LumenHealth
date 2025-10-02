"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  getFromLocalStorage,
  removeFromLocalStorage,
  saveToLocalStorage,
} from "@/utils/storageUtils";

// User types can be extended as needed
export type UserType = "patient" | "doctor" | "pharmacist";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  userType?: UserType;
  email_verified: boolean;
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  userType?: UserType;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  registerUser: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (otp: string, email: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (otp: string, password: string) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  switchUserType: (userType: UserType) => void;
  clearError: () => void;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  userType?: UserType;
  countryName?: string;
  phoneNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    userType: "patient", // Default user type
    isLoading: true,
    error: null,
  });

  const router = useRouter();
  const queryClient = useQueryClient();

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = getFromLocalStorage("token");
        const savedUser = getFromLocalStorage("user") as User | null;

        if (token && savedUser) {
          // Set auth headers for future requests
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          setAuthState({
            isAuthenticated: true,
            user: savedUser,
            // userType: savedUser.userType || "organizer",
            isLoading: false,
            error: null,
          });
        } else {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Auth status check failed:", error);
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkAuthStatus();
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const response = await axios.post("/auth/login", { email, password });
      return response.data.data;
    },
    onSuccess: (data) => {
      const { token, user } = data;

      // Store token and user data
      saveToLocalStorage("token", token);
      saveToLocalStorage("user", user);

      // Set auth headers for future requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setAuthState({
        isAuthenticated: true,
        user,
        // userType: user.userType || "buyer",
        isLoading: false,
        error: null,
      });

      toast.success("Login successful!");
      console.log(user);

      // Redirect based on user type and verification status
      if (!user.email_verified) {
        router.push("/verify-email");
      } else {
        router.push("/dashboard");
      }
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Login failed. Please try again.";
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: Partial<RegisterData>) => {
      const response = await axios.post("/auth/register", userData);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Registration successful! Please verify your email.");
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      router.push("/verify-email");
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Registration failed. Please try again.";
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // Verify email mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async ({ otp, email }: { otp: string; email: string }) => {
      const response = await axios.post("/auth/verify-email", { email, otp });
      return response.data;
    },
    onSuccess: () => {
      // Update user data with verified status
      if (authState.user) {
        const updatedUser = { ...authState.user, isEmailVerified: true };
        saveToLocalStorage("user", updatedUser);

        setAuthState((prev) => ({
          ...prev,
          user: updatedUser,
          isLoading: false,
        }));
      }

      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
      }));

      toast.success("Email verified successfully!");
      router.push("/login");
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to verify email. Please try again.";
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // Resend verification email mutation
  const resendVerificationEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await axios.post("/auth/resend-email-verification", {
        email,
      });
      return response.data;
    },
    onSuccess: () => {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to resend verification email. Please try again.";
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await axios.post("/auth/forgot-password", { email });

      sessionStorage.setItem("lumen_health_forgotPasswordEmail", email);
      return response.data;
    },
    onSuccess: () => {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      router.push("/reset-password");
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to process request. Please try again.";
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      otp,
      password,
    }: {
      otp: string;
      password: string;
    }) => {
      const email = sessionStorage.getItem("lumen_health_forgotPasswordEmail");

      if (!email) {
        throw new Error(
          "No email found. Please request a password reset again."
        );
      }

      const response = await axios.post("/auth/reset-password", {
        email,
        otp,
        password,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success(
        "Password reset successful! Please login with your new password."
      );
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
      }));
      sessionStorage.removeItem("lumen_health_forgotPasswordEmail");
      removeFromLocalStorage("token");
      removeFromLocalStorage("user");
      router.push("/login");
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Password reset failed. Please try again.";
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const response = await axios.put("/users/profile", userData);
      return response.data;
    },
    onSuccess: (data) => {
      // Update stored user data
      const updatedUser = { ...authState.user, ...data.user };
      saveToLocalStorage("user", updatedUser);

      setAuthState((prev) => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
      }));

      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again.";

      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({
      oldPassword,
      newPassword,
    }: {
      oldPassword: string;
      newPassword: string;
    }) => {
      const response = await axios.post("/users/change-password", {
        oldPassword,
        newPassword,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to change password. Please try again.";
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // Login function
  const login = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    await loginMutation.mutateAsync({ email, password });
  };

  // Register function
  const registerUser = async (userData: RegisterData) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    // Set default user type if not provided
    if (!userData.userType) {
      userData.userType = authState.userType;
    }

    // Extract confirmPassword from userData and create a new object without it
    // Confirm password can be handled on the frontend side for validation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...userDataWithoutConfirmPassword } = userData;

    // Send the payload without confirmPassword
    await registerMutation.mutateAsync(userDataWithoutConfirmPassword);
  };

  // Logout function
  const logout = () => {
    // Clear stored auth data
    removeFromLocalStorage("token");
    removeFromLocalStorage("user");

    // Clear auth headers
    delete axios.defaults.headers.common["Authorization"];

    // Reset auth state
    setAuthState({
      isAuthenticated: false,
      user: null,
      userType: "patient",
      isLoading: false,
      error: null,
    });

    // Clear related queries
    queryClient.clear();

    // Redirect to login
    router.push("/login");
    toast.info("You have been logged out.");
  };

  // Verify email function
  const verifyEmail = async (otp: string, email: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    await verifyEmailMutation.mutateAsync({ otp, email });
  };

  // Resend verification email function
  const resendVerificationEmail = async (email: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    await resendVerificationEmailMutation.mutateAsync(email);
  };

  // Forgot password function
  const forgotPassword = async (email: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    await forgotPasswordMutation.mutateAsync(email);
  };

  // Reset password function
  const resetPassword = async (otp: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    await resetPasswordMutation.mutateAsync({ otp, password });
  };

  // Update profile function
  const updateProfile = async (userData: Partial<User>) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    await updateProfileMutation.mutateAsync(userData);
  };

  // Change password function
  const changePassword = async (oldPassword: string, newPassword: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    await changePasswordMutation.mutateAsync({ oldPassword, newPassword });
  };

  // Switch user type function
  const switchUserType = (userType: UserType) => {
    setAuthState((prev) => ({
      ...prev,
      userType,
      user: prev.user ? { ...prev.user, userType } : null,
    }));

    // Update stored user data if authenticated
    if (authState.isAuthenticated && authState.user) {
      const updatedUser = { ...authState.user, userType };
      saveToLocalStorage("user", updatedUser);
    }

    // Redirect to appropriate dashboard based on user type
    if (authState.isAuthenticated) {
      router.push("/dashboard");
      queryClient.invalidateQueries();
    }
  };

  // Clear error function
  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  // Combine state and functions to provide context value
  const contextValue: AuthContextType = {
    ...authState,
    login,
    registerUser,
    logout,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    switchUserType,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export { AuthContext };
