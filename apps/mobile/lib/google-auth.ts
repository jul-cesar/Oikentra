import { googleAndroidClientId, googleIosClientId, googleWebClientId } from '@/lib/auth-client';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

export class GoogleAuthError extends Error {
  readonly recoverable: boolean;
  readonly code?: string;

  constructor(message: string, options: { recoverable: boolean; code?: string }) {
    super(message);
    this.name = 'GoogleAuthError';
    this.recoverable = options.recoverable;
    this.code = options.code;
  }
}

function isConfigured() {
  return Boolean(googleWebClientId);
}

export function configureGoogleSignIn() {
  if (Platform.OS === 'web') {
    return;
  }

  if (!isConfigured()) {
    return;
  }

  GoogleSignin.configure({
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId,
    scopes: ['openid', 'profile', 'email'],
  });
}

export async function signOutGoogle(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  await GoogleSignin.signOut();
}

export interface GoogleAuthResult {
  idToken: string;
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  if (Platform.OS === 'web') {
    throw new GoogleAuthError('Native Google Sign-In is not available on web.', {
      recoverable: false,
      code: 'NOT_AVAILABLE_ON_WEB',
    });
  }

  if (!isConfigured()) {
    throw new GoogleAuthError(
      'Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
      { recoverable: false, code: 'NOT_CONFIGURED' }
    );
  }

  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new GoogleAuthError('Google Sign-In was not completed.', {
        recoverable: true,
        code: 'INCOMPLETE',
      });
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new GoogleAuthError('Google Sign-In did not return an ID token.', {
        recoverable: false,
        code: 'MISSING_ID_TOKEN',
      });
    }

    return { idToken };
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      throw error;
    }

    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new GoogleAuthError('Google Sign-In was cancelled.', {
          recoverable: true,
          code: error.code,
        });
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new GoogleAuthError('Google Sign-In is already in progress.', {
          recoverable: true,
          code: error.code,
        });
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleAuthError('Google Play Services are not available.', {
          recoverable: true,
          code: error.code,
        });
      }
      throw new GoogleAuthError(error.message ?? 'Google Sign-In failed.', {
        recoverable: true,
        code: error.code,
      });
    }

    throw new GoogleAuthError('Google Sign-In failed.', { recoverable: true });
  }
}
