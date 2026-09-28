export interface MimiChatUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
}

export interface MimiChatUserDb {
  uid: string;
  mondayId: string;
  mondayProfileUrl: string;
  email: string;
  name: string;
  countryCode: string;
  currentLanguage: string;
  photoOriginal: string;
  photoSmall: string;
  timeZoneIdentifier: string;
  workspaceIds: string[];
  accountId: string;
  accountName: string;
}
