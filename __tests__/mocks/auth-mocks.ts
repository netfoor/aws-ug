// Mock implementations for AWS Amplify Auth
export const mockAuthUser = {
  userId: 'test-user-123',
  username: 'testuser@example.com',
  signInDetails: {
    loginId: 'testuser@example.com'
  },
  attributes: {
    email: 'testuser@example.com',
    given_name: 'Test',
    family_name: 'User',
  },
}

export const mockAuthSession = {
  tokens: {
    accessToken: {
      payload: {
        'cognito:groups': ['MEMBERS'],
        sub: 'test-user-123',
        email: 'testuser@example.com',
      },
    },
    idToken: {
      payload: {
        'cognito:groups': ['MEMBERS'],
        sub: 'test-user-123',
        email: 'testuser@example.com',
        given_name: 'Test',
        family_name: 'User',
      },
    },
  },
  credentials: {
    accessKeyId: 'mock-access-key',
    secretAccessKey: 'mock-secret-key',
  },
}

export const mockAdminAuthSession = {
  tokens: {
    accessToken: {
      payload: {
        'cognito:groups': ['ADMINS'],
        sub: 'admin-user-123',
        email: 'admin@example.com',
      },
    },
    idToken: {
      payload: {
        'cognito:groups': ['ADMINS'],
        sub: 'admin-user-123',
        email: 'admin@example.com',
        given_name: 'Admin',
        family_name: 'User',
      },
    },
  },
  credentials: {
    accessKeyId: 'mock-access-key',
    secretAccessKey: 'mock-secret-key',
  },
}

export const mockSpeakerAuthSession = {
  tokens: {
    accessToken: {
      payload: {
        'cognito:groups': ['SPEAKERS'],
        sub: 'speaker-user-123',
        email: 'speaker@example.com',
      },
    },
    idToken: {
      payload: {
        'cognito:groups': ['SPEAKERS'],
        sub: 'speaker-user-123',
        email: 'speaker@example.com',
        given_name: 'Speaker',
        family_name: 'User',
      },
    },
  },
  credentials: {
    accessKeyId: 'mock-access-key',
    secretAccessKey: 'mock-secret-key',
  },
}

// Mock Hub events
export const mockHubEvents = {
  signedIn: {
    channel: 'auth',
    payload: {
      event: 'signedIn',
      data: mockAuthUser,
    },
  },
  signedOut: {
    channel: 'auth',
    payload: {
      event: 'signedOut',
    },
  },
}

// Auth state scenarios
export const authScenarios = {
  unauthenticated: {
    user: null,
    session: null,
  },
  memberUser: {
    user: mockAuthUser,
    session: mockAuthSession,
  },
  adminUser: {
    user: {
      ...mockAuthUser,
      userId: 'admin-user-123',
      username: 'admin@example.com',
      signInDetails: {
        loginId: 'admin@example.com'
      },
      attributes: {
        email: 'admin@example.com',
        given_name: 'Admin',
        family_name: 'User',
      },
    },
    session: mockAdminAuthSession,
  },
  speakerUser: {
    user: {
      ...mockAuthUser,
      userId: 'speaker-user-123',
      username: 'speaker@example.com',
      attributes: {
        email: 'speaker@example.com',
        given_name: 'Speaker',
        family_name: 'User',
      },
    },
    session: mockSpeakerAuthSession,
  },
}