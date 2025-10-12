import { setupTestMocks } from './utils/test-utils'

describe('Test Setup Verification', () => {
  beforeEach(() => {
    setupTestMocks()
  })

  it('should have Jest configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should have testing environment setup', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
  })

  it('should have mocks available', () => {
    expect(jest).toBeDefined()
    expect(jest.fn).toBeDefined()
  })

  it('should mock Next.js router', () => {
    const { useRouter } = require('next/navigation')
    const router = useRouter()
    expect(router.push).toBeDefined()
    expect(typeof router.push).toBe('function')
  })

  it('should mock AWS Amplify', () => {
    const { getCurrentUser } = require('aws-amplify/auth')
    expect(getCurrentUser).toBeDefined()
    expect(jest.isMockFunction(getCurrentUser)).toBe(true)
  })
})