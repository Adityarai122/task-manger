// Mirrors backend AccessTokenPayload + AuthResult shape.
// See backend/src/core/utils/jwt.ts and auth.service.ts.

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];       // ['Admin'] or ['User']
  permissions: string[];
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginDto {
  email: string;
  password: string;
}

// Decoded JWT payload
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}
