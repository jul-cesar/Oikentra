import type { ExpoConfig } from 'expo/config';

const IOS_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

function getReversedIosClientId(): string | undefined {
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  if (!iosClientId) {
    return undefined;
  }

  if (!iosClientId.endsWith(IOS_CLIENT_ID_SUFFIX)) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID debe terminar en ' +
        IOS_CLIENT_ID_SUFFIX,
    );
  }

  const clientIdentifier = iosClientId.slice(
    0,
    -IOS_CLIENT_ID_SUFFIX.length,
  );

  return `com.googleusercontent.apps.${clientIdentifier}`;
}

const iosUrlScheme = getReversedIosClientId();

const googleSignInPlugins: NonNullable<ExpoConfig['plugins']> =
  iosUrlScheme
    ? [
        [
          '@react-native-google-signin/google-signin',
          {
            iosUrlScheme,
          },
        ],
      ]
    : [];

const config: ExpoConfig = {
  name: 'Oikentra',
  slug: 'oikentra',

  // Cuenta de Expo donde se creó el proyecto.
  owner: 'jultergest',

  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'oikentra',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.oikentra.app',
  },

  android: {
    package: 'com.oikentra.app',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },

  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-status-bar',
    ...googleSignInPlugins,
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    eas: {
      projectId: 'efdd7d3a-579c-482b-8a57-a962df2f6e8a',
    },
  },
};

export default config;