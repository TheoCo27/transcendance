// Ce type represente le payload minimal embarque dans le JWT applicatif.
export type AuthPayload = {
  sub: number;
  email: string;
  username: string | null;
};
