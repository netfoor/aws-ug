// src/lib/amplify/server-utils.ts

/**
 * Server-side utilities for AWS Amplify
 * Provides secure server-side context for authentication operations
 */

import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import config from '@/../amplify_outputs.json';

/**
 * Server runner for Amplify operations in Next.js server components and API routes
 * This provides a secure way to access Amplify APIs on the server without exposing tokens
 */
export const { runWithAmplifyServerContext } = createServerRunner({
  config
});
