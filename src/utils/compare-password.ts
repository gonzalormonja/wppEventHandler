import * as bcrypt from 'bcrypt';

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
