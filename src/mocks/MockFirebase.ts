import { MimiChatUser, MimiChatUserDb } from "../auth/MimiChatUser";

export interface FirebaseService {
  getUser(uid: string): Promise<MimiChatUser | undefined>;
  createUser(user: MimiChatUser, profile: MimiChatUserDb): Promise<MimiChatUser>;
  updateProfilePhoto(accountId: string, uid: string, small: string, original: string): Promise<void>;
  createCustomToken(uid: string, claims: Record<string, string>): Promise<string>;
}

/** In-memory Auth/Firestore stand-in. The emitted token is a public demo marker, not a JWT. */
export class MockFirebase implements FirebaseService {
  private readonly users = new Map<string, MimiChatUser>();
  private readonly profiles = new Map<string, MimiChatUserDb>();

  async getUser(uid: string): Promise<MimiChatUser | undefined> {
    return this.users.get(uid);
  }

  async createUser(user: MimiChatUser, profile: MimiChatUserDb): Promise<MimiChatUser> {
    this.users.set(user.uid, user);
    this.profiles.set(user.uid, profile);
    return user;
  }

  async updateProfilePhoto(_accountId: string, uid: string, small: string, original: string): Promise<void> {
    const profile = this.profiles.get(uid);
    if (profile) this.profiles.set(uid, { ...profile, photoSmall: small, photoOriginal: original });
  }

  async createCustomToken(uid: string, _claims: Record<string, string>): Promise<string> {
    return `mock-firebase-token:${uid}`;
  }
}
