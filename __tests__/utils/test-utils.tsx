import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/context/auth-context'

// Custom render function with AuthContext provider
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Test utilities for async operations
export const waitForAuth = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock localStorage
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

// Mock window.location
export const mockLocation = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}

// Setup function for tests that need clean mocks
export function setupTestMocks() {
  // Reset all mocks
  jest.clearAllMocks()
  
  // Reset mock implementations
  mockLocalStorage.getItem.mockClear()
  mockLocalStorage.setItem.mockClear()
  mockLocalStorage.removeItem.mockClear()
  mockLocalStorage.clear.mockClear()
}

// Helper to mock Amplify Auth functions
export function mockAmplifyAuth(scenario: 'authenticated' | 'unauthenticated' | 'admin' | 'speaker' = 'unauthenticated') {
  const { getCurrentUser, fetchAuthSession } = require('aws-amplify/auth')
  
  if (scenario === 'unauthenticated') {
    getCurrentUser.mockRejectedValue(new Error('User not authenticated'))
    fetchAuthSession.mockResolvedValue({ tokens: null })
  } else {
    const { authScenarios } = require('../mocks/auth-mocks')
    const authData = authScenarios[`${scenario}User`] || authScenarios.memberUser
    
    getCurrentUser.mockResolvedValue(authData.user)
    fetchAuthSession.mockResolvedValue(authData.session)
  }
}