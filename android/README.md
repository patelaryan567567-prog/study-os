Android platform notes for StudyOS (Capacitor)

Steps to prepare Android build:

1. Install Capacitor and Android platform:

   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init
   npx cap add android

2. Build web assets and copy to Android project:

   npm run build
   npx cap copy android

3. Open Android Studio:

   npx cap open android

4. Configure manifest permissions for notifications, background sync, and widgets as needed.

5. Configure work manager or native code for widgets and background sync if required.

Notes:

- Widgets and advanced notifications require native Android coding and cannot be fully implemented from web-only code.
- Offline sync can use Capacitor Storage and Background Sync APIs, but heavy syncing should be implemented in native code or via a plugin.
