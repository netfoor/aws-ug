/**
 * Utility to fix existing registrations with incorrect QR tokens
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { QRTokenUtils } from './qr-config';

const client = generateClient<Schema>();

export class RegistrationFixer {
  /**
   * Fix QR tokens for all registrations in an event
   */
  static async fixEventRegistrations(eventId: string): Promise<{ fixed: number; errors: number }> {
    let fixed = 0;
    let errors = 0;

    try {
      // Get all registrations for the event
      const { data: registrations } = await client.models.EventRegistration.registrationsByEvent({
        eventId: eventId,
      });

      if (!registrations) {
        console.log('No registrations found for event:', eventId);
        return { fixed: 0, errors: 0 };
      }

      console.log(`Found ${registrations.length} registrations to check`);

      for (const registration of registrations) {
        try {
          if (!registration.qrCodeToken || !registration.id || !registration.userId) {
            console.log('Skipping registration with missing data:', registration.id);
            continue;
          }

          // Try to parse the existing token
          const existingToken = QRTokenUtils.parseToken(registration.qrCodeToken);
          
          if (!existingToken) {
            console.log('Invalid token found for registration:', registration.id);
            // Generate new token
            const newToken = QRTokenUtils.generateToken({
              eventId: registration.eventId,
              userId: registration.userId,
              registrationId: registration.id,
            });

            await client.models.EventRegistration.update({
              id: registration.id,
              qrCodeToken: newToken,
            });

            console.log('Fixed registration:', registration.id);
            fixed++;
            continue;
          }

          // Check if the token has the correct registration ID
          if (existingToken.registrationId !== registration.id) {
            console.log(`Token mismatch for registration ${registration.id}: token has ${existingToken.registrationId}`);
            
            // Generate new token with correct ID
            const newToken = QRTokenUtils.generateToken({
              eventId: registration.eventId,
              userId: registration.userId,
              registrationId: registration.id,
            });

            await client.models.EventRegistration.update({
              id: registration.id,
              qrCodeToken: newToken,
            });

            console.log('Fixed registration ID mismatch:', registration.id);
            fixed++;
          }

        } catch (error) {
          console.error('Error fixing registration:', registration.id, error);
          errors++;
        }
      }

      console.log(`Registration fix complete: ${fixed} fixed, ${errors} errors`);
      return { fixed, errors };

    } catch (error) {
      console.error('Error fixing event registrations:', error);
      return { fixed, errors: errors + 1 };
    }
  }

  /**
   * Fix a single registration
   */
  static async fixSingleRegistration(registrationId: string): Promise<boolean> {
    try {
      const { data: registration } = await client.models.EventRegistration.get({
        id: registrationId
      });

      if (!registration || !registration.userId || !registration.eventId || !registration.id) {
        console.error('Registration not found or missing data:', registrationId);
        return false;
      }

      // Generate new token with correct ID
      const newToken = QRTokenUtils.generateToken({
        eventId: registration.eventId,
        userId: registration.userId,
        registrationId: registration.id, // Now we know it's not null
      });

      await client.models.EventRegistration.update({
        id: registration.id,
        qrCodeToken: newToken,
      });

      console.log('Fixed single registration:', registrationId);
      return true;

    } catch (error) {
      console.error('Error fixing single registration:', registrationId, error);
      return false;
    }
  }
}