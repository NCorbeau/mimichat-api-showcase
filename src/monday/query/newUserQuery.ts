export const newUserQuery = `query {
  me {
    id name email country_code current_language is_verified
    photo_original photo_small time_zone_identifier url
    account { id name }
  }
  workspaces { id }
}`;

export interface MondayNewUserData {
  me: {
    id: string;
    name: string;
    email: string;
    country_code: string;
    current_language: string;
    is_verified: boolean;
    photo_original: string;
    photo_small: string;
    time_zone_identifier: string;
    url: string;
    account: { id: string; name: string };
  };
  workspaces: { id: string }[];
}
