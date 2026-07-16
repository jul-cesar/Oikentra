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
    throw new GoogleAuthError('El inicio de sesión con Google no está disponible en la web.', {
      recoverable: false,
      code: 'NOT_AVAILABLE_ON_WEB',
    });
  }

  if (!isConfigured()) {
    throw new GoogleAuthError('El inicio de sesión con Google no está configurado.', {
      recoverable: false,
      code: 'NOT_CONFIGURED',
    });
  }

  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new GoogleAuthError('No se completó el inicio de sesión con Google.', {
        recoverable: true,
        code: 'INCOMPLETE',
      });
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new GoogleAuthError('Google no devolvió una credencial válida.', {
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
        throw new GoogleAuthError('Se canceló el inicio de sesión con Google.', {
          recoverable: true,
          code: error.code,
        });
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new GoogleAuthError('Ya hay un inicio de sesión con Google en curso.', {
          recoverable: true,
          code: error.code,
        });
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleAuthError('Google Play Services no está disponible.', {
          recoverable: true,
          code: error.code,
        });
      }
      throw new GoogleAuthError(error.message ?? 'No pudimos iniciar sesión con Google.', {
        recoverable: true,
        code: error.code,
      });
    }

    throw new GoogleAuthError('No pudimos iniciar sesión con Google.', { recoverable: true });
  }
}
