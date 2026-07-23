import { google } from 'googleapis';

// The OAuth2 client type as googleapis itself exposes it. Importing OAuth2Client
// from 'google-auth-library' directly resolves to a second, incompatible copy in
// node_modules (googleapis bundles its own), so we derive the type here to keep
// every call site consistent.
export type GoogleClient = InstanceType<typeof google.auth.OAuth2>;
