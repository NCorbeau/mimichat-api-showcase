import { MondayNewUserData } from "../monday/query/newUserQuery";
import { MondayVerifyUserData } from "../monday/query/verifyUserQuery";

export interface MondayService {
  exchangeCode(code: string, redirectUri: string): Promise<string>;
  verifyUser(token: string): Promise<MondayVerifyUserData>;
  getCreateUserData(token: string): Promise<MondayNewUserData>;
}

export class AuthenticationError extends Error {}

/** Fixed public fixtures. These strings are not credentials and reach no Monday endpoint. */
export class MockMonday implements MondayService {
  async exchangeCode(code: string, _redirectUri: string): Promise<string> {
    if (code !== "demo-valid-code") throw new AuthenticationError("Code rejected");
    return "demo-monday-token";
  }

  async verifyUser(token: string): Promise<MondayVerifyUserData> {
    if (token !== "demo-monday-token") throw new AuthenticationError("Token rejected");
    return {
      me: {
        id: "42", email: "demo@example.test",
        photo_original: "https://example.test/avatar-large.png",
        photo_small: "https://example.test/avatar-small.png",
        account: { id: "7" }
      }
    };
  }

  async getCreateUserData(token: string): Promise<MondayNewUserData> {
    await this.verifyUser(token);
    return {
      me: {
        id: "42", name: "Demo User", email: "demo@example.test",
        country_code: "PL", current_language: "en", is_verified: true,
        photo_original: "https://example.test/avatar-large.png",
        photo_small: "https://example.test/avatar-small.png",
        time_zone_identifier: "Europe/Warsaw",
        url: "https://example.test/demo-user",
        account: { id: "7", name: "Demo Account" }
      },
      workspaces: [{ id: "99" }]
    };
  }
}
