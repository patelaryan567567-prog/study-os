import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studyos.app",
  appName: "StudyOS",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    FirebaseAuthentication: {
      providers: ["google.com"],
      // The native account picker only obtains the Google credential. The
      // web Firebase SDK consumes it and supplies the auth state observed by
      // AuthProvider, so both layers must not keep separate sessions.
      skipNativeAuth: true,
    },
  },
};

export default config;
