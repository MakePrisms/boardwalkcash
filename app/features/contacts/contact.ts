export type Contact = {
  id: string;
  createdAt: string;
  /** Id of the user that this contact belongs to */
  ownerId: string;
  /** Username of the user within this app that this contact references */
  username: string;
};
