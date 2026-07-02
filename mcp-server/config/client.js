import { CLIENT_CONFIG } from '../client.js';

export const CLIENT_CONFIG = {
  clientId: "bajaj-finance",
  name: "bajaj Finance",
  domain: "bajajfinserv.in",
  channels: ["claude"],
  auth: {
    method: "oauth",
    sandboxOtp: "123456",
    oauthDomain: "auth.bajajfinserv.in",
    tokenTtl: 3600
  },
  branding: {
    primaryColour: "#6366f1"
  }
};