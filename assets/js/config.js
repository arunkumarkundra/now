// ============================================================================
//  OBSERVER — SETTINGS YOU CAN EDIT
//  (See docs/SETUP.md, Part 3, for step-by-step instructions.)
// ============================================================================

// 1) Sign-in and cloud sync (optional).
//    Leave as null and the app works fully, saving everything on the device only.
//    To turn on Google / Apple sign-in, replace null with the "firebaseConfig"
//    block that Firebase shows you. It looks like this:
//
//    export const FIREBASE_CONFIG = {
//      apiKey: "AIza....",
//      authDomain: "your-project.firebaseapp.com",
//      projectId: "your-project",
//      storageBucket: "your-project.appspot.com",
//      messagingSenderId: "1234567890",
//      appId: "1:1234567890:web:abc123",
//    };

export const FIREBASE_CONFIG = null;

// 2) Which sign-in buttons to show (only matters when FIREBASE_CONFIG is filled in).
//    Apple sign-in needs a paid Apple Developer account — keep it false until set up.
export const SIGN_IN_WITH = {
  google: true,
  apple: false,
};

// 3) Leave true. It makes sign-in work reliably on iPhone "home screen" apps
//    by routing the sign-in page through your own website address.
export const SAME_DOMAIN_SIGN_IN = true;
