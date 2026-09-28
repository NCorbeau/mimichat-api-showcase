export const verifyUserQuery = `query {
  me {
    id
    email
    photo_original
    photo_small
    account { id }
  }
}`;

export interface MondayVerifyUserData {
  me: {
    id: string;
    email: string;
    photo_original: string;
    photo_small: string;
    account: { id: string };
  };
}
