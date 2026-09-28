import { FirebaseService } from "../mocks/MockFirebase";
import { MondayService } from "../mocks/MockMonday";
import { MimiChatUserCreator } from "./MimiChatUserCreator";
import { MimiChatUserIdGenerator } from "./MimiChatUserIdGenerator";
import { MimiChatUser } from "./MimiChatUser";

export interface MimiChatAuthData {
  userId: string;
  mimiToken: string;
}

/** Original verify / account-scoped UID / create-or-update / custom-token flow. */
export class MimiChatAuthorizer {
  constructor(private readonly monday: MondayService, private readonly firebase: FirebaseService) {}

  async authorize(mondayToken: string): Promise<MimiChatAuthData> {
    const verified = await this.monday.verifyUser(mondayToken);
    const uid = MimiChatUserIdGenerator.generateUserId(verified.me.account.id, verified.me.id);
    let user = await this.firebase.getUser(uid);

    if (!user) {
      user = await new MimiChatUserCreator(this.monday, this.firebase).createUser(uid, mondayToken);
    } else {
      await this.firebase.updateProfilePhoto(
        verified.me.account.id, uid, verified.me.photo_small, verified.me.photo_original
      );
    }

    const mimiToken = await this.firebase.createCustomToken(uid, this.customTokenClaimsFromUser(user, verified.me.id));
    return { userId: uid, mimiToken };
  }

  private customTokenClaimsFromUser(user: MimiChatUser, mondayId: string): Record<string, string> {
    return {
      monday_id: mondayId,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }
}
