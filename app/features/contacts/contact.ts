import type { User } from '../user/user';

export type Contact = {
  id: string;
  createdAt: string;
  ownerId: string;
  username: string;
};

// TODO: move these to where they are used

export type ContactWithDetails = Contact & {
  user: User;
};

export type CreateContact = {
  username: string;
};
