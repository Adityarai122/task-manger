// Mirror of backend UserView (user.service.ts).
export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];      // ['Admin'] or ['User']
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RoleName = 'Admin' | 'User';

export interface InviteUserDto {
  email: string;
  name: string;
  password: string;
  role: RoleName;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateSelfDto {
  name?: string;
  password?: string;
}
