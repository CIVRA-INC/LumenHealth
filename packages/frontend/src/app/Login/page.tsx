import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Heart } from 'lucide-react';

// Types
interface LoginFormData {
  email: string;
  password: string;
}

interface AuthResponse {
  status: string;
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    clinicId: string;
  };
}

// Simulated API client
const apiClient = {
  post: async (url: string, data: LoginFormData): Promise<AuthResponse> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Demo credentials for testing
    if (data.email === 'demo@lumenhealth.com' && data.password === 'demo123') {
      return {
        status: 'success',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123',
          email: 'demo@lumenhealth.com',
          firstName: 'Demo',
          lastName: 'User',
          role: 'doctor',
          clinicId: 'clinic-001'
        }
      };
    }
    throw new Error('Invalid email or password');
  }
};

// Auth state management (simplified - in production use Context/Redux)
const authState = {
  saveAuth: (token: string, user: AuthResponse['user']) => {
    // Note: In production, use secure storage methods
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('user', JSON.stringify(user));
  },
  
  redirectToDashboard: (userRole: string) => {
    // In production, use react-router navigation
    const dashboardRoutes: Record<string, string> = {
      doctor: '/dashboard/doctor',
      nurse: '/dashboard/nurse',
      admin: '/dashboard/admin',
      receptionist: '/dashboard/receptionist'
    };
    
    const route = dashboardRoutes[userRole] || '/dashboard';
    console.log(`Redirecting to: ${route}`);
    alert(`Login successful! Redirecting to ${route}...`);
  }
};

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    mode: 'onBlur'
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/auth/login', data);
      
      // Save auth state
      authState.saveAuth(response.token, response.user);
      
      // Redirect to appropriate dashboard
      authState.redirectToDashboard(response.user.role);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LumenHealth</h1>
          <p className="text-gray-600 mt-2">Healthcare Management Platform</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@lumenhealth.com"
                  disabled={isLoading}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  className={errors.email ? 'border-red-500' : ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(onSubmit)();
                    }
                  }}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 1,
                      message: 'Password cannot be empty'
                    }
                  })}
                  className={errors.password ? 'border-red-500' : ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(onSubmit)();
                    }
                  }}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                className="w-full"
                disabled={isLoading}
                onClick={handleSubmit(onSubmit)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>

            {/* Demo Credentials Helper */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">Demo Credentials:</p>
              <p className="text-xs text-blue-700">Email: demo@lumenhealth.com</p>
              <p className="text-xs text-blue-700">Password: demo123</p>
            </div>

            {/* Footer Links */}
            <div className="mt-6 text-center text-sm text-gray-600">
              <button 
                onClick={() => alert('Password reset feature coming soon!')}
                className="text-indigo-600 hover:underline bg-transparent border-0 cursor-pointer"
              >
                Forgot your password?
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-8">
          © 2024 LumenHealth. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;