import React, { useState } from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { setupTestMocks, mockAmplifyAuth } from '../utils/test-utils';
import { authScenarios } from '../mocks/auth-mocks';

// Mock the auth functions
jest.mock('@/lib/amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn(),
  signInWithHostedUI: jest.fn(),
  createAuthListener: jest.fn(() => jest.fn()),
  checkIsUserAdmin: jest.fn(),
  getUserAttributes: jest.fn(),
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isAdmin, 
    userAttributes, 
    error,
    login,
    logout,
    refreshUser 
  } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      // Login errors are handled by the context
      console.log('Login error caught in component:', err);
    }
  };

  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="isLoading">{isLoading.toString()}</div>
      <div data-testid="isAdmin">{isAdmin.toString()}</div>
      <div data-testid="userAttributes">{userAttributes ? JSON.stringify(userAttributes) : 'null'}</div>
      <div data-testid="error">{error ? error.message : 'null'}</div>
      <button onClick={handleLogin} data-testid="login-btn">Login</button>
      <button onClick={() => logout()} data-testid="logout-btn">Logout</button>
      <button onClick={() => refreshUser()} data-testid="refresh-btn">Refresh</button>
    </div>
  );
};

describe('AuthProvider', () => {
  const mockAuthFunctions = require('@/lib/amplify/auth');

  beforeEach(() => {
    setupTestMocks();
    // Reset all mocks
    Object.values(mockAuthFunctions).forEach((mockFn: any) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
    
    // Set default mock behavior (unauthenticated)
    // Tests can override this by calling mockResolvedValue/mockRejectedValue
    mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('User not authenticated'));
    mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
    mockAuthFunctions.getUserAttributes.mockResolvedValue({});
    mockAuthFunctions.signOut.mockResolvedValue(undefined);
    mockAuthFunctions.signInWithHostedUI.mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should render loading state initially', () => {
      // Mock unauthenticated user
      mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('User not authenticated'));
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('isLoading')).toHaveTextContent('true');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should handle unauthenticated state', async () => {
      mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('User not authenticated'));
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
      expect(screen.getByTestId('userAttributes')).toHaveTextContent('null');
    });
  });

  describe('Authenticated User States', () => {
    it('should handle member user authentication', async () => {
      const memberScenario = authScenarios.memberUser;
      
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue({
        email: 'testuser@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(memberScenario.user));
    });

    it('should handle admin user authentication', async () => {
      const adminScenario = authScenarios.adminUser;
      
      mockAuthFunctions.getCurrentUser.mockResolvedValue(adminScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(true);
      mockAuthFunctions.getUserAttributes.mockResolvedValue({
        email: 'admin@example.com',
        given_name: 'Admin',
        family_name: 'User',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(adminScenario.user));
    });

    it('should handle speaker user authentication', async () => {
      const speakerScenario = authScenarios.speakerUser;
      
      mockAuthFunctions.getCurrentUser.mockResolvedValue(speakerScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue({
        email: 'speaker@example.com',
        given_name: 'Speaker',
        family_name: 'User',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(speakerScenario.user));
    });
  });

  describe('Authentication Actions', () => {
    it('should handle login action for unauthenticated user', async () => {
      // Setup initial unauthenticated state
      mockAuthFunctions.getCurrentUser
        .mockRejectedValueOnce(new Error('User not authenticated'))  // Initial render
        .mockRejectedValueOnce(new Error('User not authenticated'))  // Focus event
        .mockRejectedValueOnce(new Error('User not authenticated')); // Login function check
      mockAuthFunctions.signInWithHostedUI.mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      const loginBtn = screen.getByTestId('login-btn');
      
      await act(async () => {
        loginBtn.click();
      });

      // Wait a bit for the login function to complete
      await waitFor(() => {
        expect(mockAuthFunctions.signInWithHostedUI).toHaveBeenCalledWith({
          redirectUri: 'http://localhost'
        });
      });
    });

    it('should not redirect if user is already authenticated', async () => {
      // Mock user already authenticated for both calls
      const memberScenario = authScenarios.memberUser;
      
      // Reset and configure mocks for this test
      mockAuthFunctions.getCurrentUser.mockReset().mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockReset().mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockReset().mockResolvedValue(memberScenario.user.attributes);
      mockAuthFunctions.signInWithHostedUI.mockReset().mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial authentication
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      // Try to login when already authenticated
      const loginBtn = screen.getByTestId('login-btn');
      await act(async () => {
        fireEvent.click(loginBtn);
      });

      // Should not call signInWithHostedUI since user is already authenticated
      expect(mockAuthFunctions.signInWithHostedUI).not.toHaveBeenCalled();
      
      // User should still be authenticated
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    it('should handle logout action', async () => {
      // Ensure we're using real timers (in case previous test left fake timers)
      jest.useRealTimers();
      
      const memberScenario = authScenarios.memberUser;
      
      // Setup mocks with reset to clear any previous test state
      mockAuthFunctions.getCurrentUser.mockReset().mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockReset().mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockReset().mockResolvedValue({});
      mockAuthFunctions.signOut.mockReset().mockResolvedValue(undefined);

      // Create a component that uses the auth context
      const LogoutTestComponent = () => {
        const { logout, isAuthenticated } = useAuth();
        const [loggedOut, setLoggedOut] = useState(false);
        
        const handleLogout = async () => {
          try {
            await logout();
            setLoggedOut(true);
          } catch (err) {
            console.error('Logout error:', err);
          }
        };
        
        return (
          <div>
            <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
            <div data-testid="logged-out">{loggedOut ? 'true' : 'false'}</div>
            <button data-testid="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      const logoutBtn = screen.getByTestId('logout-btn');
      
      // Click logout button
      await act(async () => {
        logoutBtn.click();
      });

      // Wait for logout to complete - verify signOut was called and component sees the result
      await waitFor(() => {
        expect(mockAuthFunctions.signOut).toHaveBeenCalled();
        expect(screen.getByTestId('logged-out')).toHaveTextContent('true');
      }, { timeout: 3000 });
    }, 10000); // Increase test timeout to 10 seconds

    it('should handle refresh user action', async () => {
      // Use fake timers for this test to control cache expiration
      jest.useFakeTimers();
      
      const memberScenario = authScenarios.memberUser;
      
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue({});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        jest.runAllTimers(); // Run initial mount
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      const refreshBtn = screen.getByTestId('refresh-btn');
      
      // Clear previous calls
      mockAuthFunctions.getCurrentUser.mockClear();
      
      // Advance time by more than CACHE_DURATION (5000ms) to force refresh
      act(() => {
        jest.advanceTimersByTime(6000);
      });
      
      await act(async () => {
        refreshBtn.click();
        jest.runAllTimers(); // Run the debounce timer
      });

      // Should call getCurrentUser again after cache expires
      expect(mockAuthFunctions.getCurrentUser).toHaveBeenCalled();
      
      // Restore real timers
      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      mockAuthFunctions.getCurrentUser.mockRejectedValue(authError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('Authentication failed');
    });

    it('should handle login errors', async () => {
      // Setup clean initial state (no error)
      mockAuthFunctions.getCurrentUser
        .mockRejectedValueOnce(new Error('User not authenticated'))  // Initial render
        .mockRejectedValueOnce(new Error('User not authenticated'))  // Focus event  
        .mockRejectedValueOnce(new Error('User not authenticated')); // Login function check
      mockAuthFunctions.signInWithHostedUI.mockRejectedValue(new Error('Login failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial state but don't check error yet
      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      const loginBtn = screen.getByTestId('login-btn');
      
      // The login function should throw the error
      await act(async () => {
        try {
          loginBtn.click();
          // Wait a bit for the async login to complete
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          // Expected error from login function
        }
      });

      // Wait for error state to be updated to login error
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
      }, { timeout: 2000 });
    });

    it('should handle logout errors', async () => {
      const memberScenario = authScenarios.memberUser;
      
      // Reset and configure mocks for this test
      mockAuthFunctions.getCurrentUser.mockReset().mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockReset().mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockReset().mockResolvedValue({});
      mockAuthFunctions.signOut.mockReset().mockRejectedValue(new Error('Logout failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      const logoutBtn = screen.getByTestId('logout-btn');
      
      await act(async () => {
        logoutBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Logout failed');
      });
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      let thrownError: Error | null = null;
      
      // Create an Error Boundary to catch React errors
      class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
        constructor(props: {children: React.ReactNode}) {
          super(props);
          this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error: Error) {
          thrownError = error;
          return { hasError: true, error };
        }

        render() {
          if (this.state.hasError) {
            return <div data-testid="error-boundary">Error caught</div>;
          }
          return this.props.children;
        }
      }

      const TestComponentOutsideProvider = () => {
        const auth = useAuth(); // This should throw
        return <div>Should not render: {auth ? JSON.stringify(auth) : 'null'}</div>;
      };

      // Render with Error Boundary
      render(
        <ErrorBoundary>
          <TestComponentOutsideProvider />
        </ErrorBoundary>
      );

      // Check that error boundary caught the error
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(thrownError).toBeInstanceOf(Error);
      if (thrownError) {
        expect(thrownError.message).toBe('useAuth debe ser usado dentro de un AuthProvider');
      }

      console.error = originalConsoleError;
    });
  });
});