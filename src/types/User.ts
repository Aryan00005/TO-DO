export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  userId?: string;
  user_id?: string;
  account_status?: string;
  avatarUrl?: string;
  organization?: {
    name: string;
    type: string;
  };
}