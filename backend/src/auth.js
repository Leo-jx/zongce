/**
 * 登录凭证处理：bcrypt 密码校验 + JWT 签发/校验（jose，兼容 Web Crypto）。
 */
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

function secretKey(env) {
  return encoder.encode(env.JWT_SECRET || 'zongce_jwt_secret_2024_prod');
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

/** 生成密码散列（修改密码 / 重置密码共用） */
export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export async function signToken(env, user) {
  return new SignJWT({ id: user.id, role: user.role, account: user.account, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey(env));
}

/** 从 Authorization: Bearer <token> 中解析用户，失败返回 null */
export async function getUserFromRequest(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), secretKey(env));
    return payload;
  } catch {
    return null;
  }
}
