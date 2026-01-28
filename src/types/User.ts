export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  userId?: string;
  avatarUrl?: string;
  organization?: {
    name: string;
    type: string;
  };
}