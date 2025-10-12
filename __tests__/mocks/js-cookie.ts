// Mock for js-cookie library
const mockCookies: Record<string, string> = {}

export const Cookies = {
  get: jest.fn((name: string) => mockCookies[name]),
  set: jest.fn((name: string, value: string, options?: any) => {
    mockCookies[name] = value
  }),
  remove: jest.fn((name: string) => {
    delete mockCookies[name]
  }),
  
  // Test utilities
  _getMockCookies: () => ({ ...mockCookies }),
  _setMockCookies: (cookies: Record<string, string>) => {
    Object.keys(mockCookies).forEach(key => delete mockCookies[key])
    Object.assign(mockCookies, cookies)
  },
  _clearMockCookies: () => {
    Object.keys(mockCookies).forEach(key => delete mockCookies[key])
  },
}

// Default export
export default Cookies

// Mock the entire module
jest.mock('js-cookie', () => Cookies)