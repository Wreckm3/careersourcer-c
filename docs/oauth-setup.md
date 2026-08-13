# Google OAuth setup

CareerSourcer uses Supabase Auth's OAuth flow. The browser only contains the
Supabase URL and publishable key; the Google client ID and client secret stay
in Supabase and Google Cloud.

1. In Google Cloud Console, create an OAuth **Web application** client.
2. Add the Supabase callback URL shown in **Supabase Dashboard → Authentication
   → Providers → Google** to Google Cloud's Authorized redirect URIs. Do not
   substitute a guessed project URL.
3. In Supabase Dashboard → Authentication → Providers → Google, enable Google
   and enter the client ID and client secret there.
4. In Supabase Dashboard → Authentication → URL Configuration, add every real
   deployed callback URL in this form: `https://<your-domain>/auth/callback`.
   Add the local development callback only if it is actually used.
5. For an existing email/password account, have the signed-in learner link the
   Google identity through Supabase's account-linking flow before using Google
   as a sign-in method. This preserves the same `auth.users.id`, so the existing
   profile, subscription, progress, Atlas memory, and portfolio records remain
   attached. Do not merge users by email in client code.

The app deliberately does not carry a Google client secret or provider
configuration. Supabase validates OAuth state and exchanges the PKCE code on
the callback route.
