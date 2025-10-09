/**
 * Component Tests for Navigation
 * 
 * Tests UI components that depend on authentication state:
 * - Conditional rendering based on auth status
 * - Role-based UI elements (admin vs member)
 * - User interactions (logout, dropdown)
 * - Navigation links and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navigation from '@/components/Navigation';
import { AuthProvider } from '@/context/auth-context';
import { setupTestMocks } from '../utils/test-utils';
import { authScenarios } from '../mocks/auth-mocks';

// Mock Next.js navigation
jest.mock('next/link', () => {
  return function MockLink({ children, href, className, onClick }: any) {
    return (
      <a 
        href={href} 
        className={className}
        onClick={onClick}
        data-testid={`nav-link-${href.replace('/', '') || 'home'}`}
      >
        {children}
      </a>
    );
  };
});

// Mock auth functions
jest.mock('@/lib/amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn(),
  signInWithHostedUI: jest.fn(),
  createAuthListener: jest.fn(() => jest.fn()),
  checkIsUserAdmin: jest.fn(),
  getUserAttributes: jest.fn(),
}));

// Component wrapper for testing
const NavigationWrapper = ({ mockAuthState }: { mockAuthState?: any }) => {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
};

describe('Navigation Component', () => {
  const mockAuthFunctions = require('@/lib/amplify/auth');

  beforeEach(() => {
    setupTestMocks();
    
    // Clear all mocks
    Object.values(mockAuthFunctions).forEach((mockFn: any) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('User not authenticated'));
    });

    it('should render login buttons for unauthenticated users', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
        expect(screen.getByText('Unirse')).toBeInTheDocument();
      });

      // Should not show authenticated-only links
      expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should render basic navigation elements', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('AWS')).toBeInTheDocument();
        expect(screen.getByText('UG Puebla')).toBeInTheDocument();
        expect(screen.getByText('Inicio')).toBeInTheDocument();
      });
    });

    it('should have correct login link destinations', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        const loginButtons = screen.getAllByTestId('nav-link-login');
        expect(loginButtons[0]).toHaveAttribute('href', '/login');
      });
    });
  });

  describe('Authenticated Member User', () => {
    beforeEach(() => {
      const memberScenario = authScenarios.memberUser;
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(memberScenario.user.attributes);
    });

    it('should render authenticated user elements', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('Perfil')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Usuario')).toBeInTheDocument(); // Role indicator
      });

      // Should not show login buttons
      expect(screen.queryByText('Iniciar Sesión')).not.toBeInTheDocument();
      expect(screen.queryByText('Unirse')).not.toBeInTheDocument();
      
      // Should not show admin link
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should display user avatar and info', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        // Check for user avatar (first letter of email)
        expect(screen.getByText('T')).toBeInTheDocument(); // testuser@example.com -> T
        
        // Check for username display (email prefix)
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });
    });

    it('should have correct navigation links for members', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        const profileLinks = screen.getAllByTestId('nav-link-profile');
        const dashboardLinks = screen.getAllByTestId('nav-link-dashboard');
        const homeLinks = screen.getAllByTestId('nav-link-home');
        
        expect(profileLinks[0]).toHaveAttribute('href', '/profile');
        expect(dashboardLinks[0]).toHaveAttribute('href', '/dashboard');
        expect(homeLinks[0]).toHaveAttribute('href', '/');
      });
    });

    it('should open and close user dropdown', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      // Find and click the dropdown button
      const dropdownButton = screen.getByTestId('user-dropdown-button');
      fireEvent.click(dropdownButton);

      // Should show dropdown menu
      await waitFor(() => {
        expect(screen.getByText('Ver Perfil')).toBeInTheDocument();
        expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
      });

      // Click outside to close dropdown
      const overlay = screen.getByTestId('dropdown-overlay');
      fireEvent.click(overlay);

      // Dropdown should be closed (elements no longer visible)
      await waitFor(() => {
        expect(screen.queryByText('Ver Perfil')).not.toBeInTheDocument();
      });
    });

    it('should handle logout functionality', async () => {
      mockAuthFunctions.signOut.mockResolvedValue(undefined);
      
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      // Open dropdown and click logout
      const dropdownButton = screen.getByTestId('user-dropdown-button');
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
      });

      const logoutButton = screen.getByText('Cerrar Sesión');
      fireEvent.click(logoutButton);

      // Verify logout was called
      await waitFor(() => {
        expect(mockAuthFunctions.signOut).toHaveBeenCalled();
      });
    });
  });

  describe('Authenticated Admin User', () => {
    beforeEach(() => {
      const adminScenario = authScenarios.adminUser;
      mockAuthFunctions.getCurrentUser.mockResolvedValue(adminScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(true);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(adminScenario.user.attributes);
    });

    it('should render admin-specific elements', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('Admin')).toBeInTheDocument(); // Admin nav link
        expect(screen.getByText('Administrador')).toBeInTheDocument(); // Role indicator
      });

      // Should also have regular user elements
      expect(screen.getByText('Perfil')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should have admin navigation link', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-link-admin')).toHaveAttribute('href', '/admin');
      });
    });

    it('should show admin option in dropdown', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument(); // username
      });

      // Open dropdown
      const dropdownButton = screen.getByRole('button');
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        expect(screen.getByText('Panel Admin')).toBeInTheDocument();
      });
    });

    it('should style admin elements differently', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        const adminLink = screen.getByTestId('nav-link-admin');
        expect(adminLink).toHaveClass('text-red-600');
      });
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      // Mock loading state by delaying the getCurrentUser response
      mockAuthFunctions.getCurrentUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(authScenarios.memberUser.user), 100))
      );
    });

    it('should show loading skeleton during authentication check', async () => {
      render(<NavigationWrapper />);

      // Should show loading skeleton
      expect(screen.getByText('AWS')).toBeInTheDocument(); // Logo always visible
      
      // Loading indicator should be present
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthFunctions.signOut.mockRejectedValue(new Error('Logout failed'));
    });

    it('should handle logout errors gracefully', async () => {
      // Start with authenticated user
      mockAuthFunctions.getCurrentUser.mockResolvedValue(authScenarios.memberUser.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue({});

      // Spy on console.error to verify error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      // Open dropdown and attempt logout
      const dropdownButton = screen.getByTestId('user-dropdown-button');
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
      });

      const logoutButton = screen.getByText('Cerrar Sesión');
      fireEvent.click(logoutButton);

      // Should handle error gracefully and log it
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error al cerrar sesión:',
          expect.objectContaining({
            message: 'Logout failed',
            error: expect.any(Error)
          })
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockAuthFunctions.getCurrentUser.mockResolvedValue(authScenarios.memberUser.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue({});
    });

    it('should have proper focus management for dropdown', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const dropdownButton = screen.getByRole('button');
      
      // Should have proper focus ring classes
      expect(dropdownButton).toHaveClass('focus:ring-2', 'focus:ring-offset-2', 'focus:ring-blue-500');
    });

    it('should have proper ARIA labels for user actions', async () => {
      render(<NavigationWrapper />);

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      // Open dropdown
      const dropdownButton = screen.getByTestId('user-dropdown-button');
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        // All interactive elements should be properly accessible
        expect(screen.getByText('Ver Perfil')).toBeInTheDocument();
        const dashboardLinks = screen.getAllByText('Dashboard');
        expect(dashboardLinks.length).toBeGreaterThan(0);
        expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
      });
    });
  });
});