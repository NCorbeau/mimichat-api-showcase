import { FirebaseService } from "../mocks/MockFirebase";
import { MondayService } from "../mocks/MockMonday";
import { MimiChatUser, MimiChatUserDb } from "./MimiChatUser";

/** Retains the original Monday-profile to Firebase-user mapping. */
export class MimiChatUserCreator {
  constructor(private readonly monday: MondayService, private readonly firebase: FirebaseService) {}

  async createUser(uid: string, mondayToken: string): Promise<MimiChatUser> {
    const data = await this.monday.getCreateUserData(mondayToken);
    const user: MimiChatUser = {
      uid,
      email: data.me.email,
      emailVerified: data.me.is_verified,
      displayName: data.me.name,
      photoURL: data.me.photo_original
    };
    const profile: MimiChatUserDb = {
      uid,
      mondayId: data.me.id,
      mondayProfileUrl: data.me.url,
      email: data.me.email,
      name: data.me.name,
      countryCode: data.me.country_code,
      currentLanguage: data.me.current_language,
      photoOriginal: data.me.photo_original,
      photoSmall: data.me.photo_small,
      timeZoneIdentifier: data.me.time_zone_identifier,
      workspaceIds: data.workspaces.map((workspace) => workspace.id),
      accountId: data.me.account.id,
      accountName: data.me.account.name
    };
    return this.firebase.createUser(user, profile);
  }
}
