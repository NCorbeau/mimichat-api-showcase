/** The original account-scoped Monday identity format, retained from the 2024 service. */
export class MimiChatUserIdGenerator {
  static generateUserId(accountId: string, mondayUserId: string): string {
    return `monday@${accountId}@${mondayUserId}`;
  }
}
