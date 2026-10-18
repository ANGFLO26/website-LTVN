/* oxlint-disable unicorn/no-thenable */
import { compare, hashSync } from 'bcryptjs';
import { createHash } from 'node:crypto';
import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { users } from '../../database/schema.js';
import { AuthService } from './auth.service.js';


const defaultPassword = 'CorrectPassword#123';
const defaultPasswordHash = hashSync(defaultPassword, 10);

function createMockContext(initialUserOverrides: Record<string, unknown> = {}) {
  let currentUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@ltvietnam.com.vn',
    fullName: 'Admin User',
    role: 'admin',
    status: 'active',
    deletedAt: null,
    passwordHash: defaultPasswordHash,
    tokenVersion: 0,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    lastLoginAt: null as Date | null,
    updatedAt: new Date(),
    ...initialUserOverrides,
  };

  const updateCalls: Array<Record<string, unknown>> = [];

  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn().mockImplementation(async () => currentUser),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((updates: Record<string, unknown>) => {
        updateCalls.push(updates);
        const now = new Date();
        let newAttempts = currentUser.failedLoginAttempts;
        let newLockedUntil = currentUser.lockedUntil;

        if ('failedLoginAttempts' in updates) {
          if (updates.failedLoginAttempts === 0) {
            newAttempts = 0;
          } else if (currentUser.lockedUntil !== null && currentUser.lockedUntil > now) {
            newAttempts = currentUser.failedLoginAttempts;
          } else if (currentUser.lockedUntil !== null && currentUser.lockedUntil <= now) {
            newAttempts = 1;
          } else {
            newAttempts = (currentUser.failedLoginAttempts ?? 0) + 1;
          }
        }

        if ('lockedUntil' in updates) {
          if (updates.lockedUntil === null) {
            newLockedUntil = null;
          } else if (currentUser.lockedUntil !== null && currentUser.lockedUntil > now) {
            newLockedUntil = currentUser.lockedUntil;
          } else if (newAttempts >= 5) {
            newLockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
          } else {
            newLockedUntil = null;
          }
        }

        currentUser = {
          ...currentUser,
          failedLoginAttempts: newAttempts,
          lockedUntil: newLockedUntil,
          ...(updates.passwordHash ? { passwordHash: updates.passwordHash as string } : {}),
          ...('tokenVersion' in updates ? { tokenVersion: currentUser.tokenVersion + 1 } : {}),
          ...(updates.lastLoginAt ? { lastLoginAt: updates.lastLoginAt as Date } : {}),
          updatedAt: now,
        };
        const result = Promise.resolve([{ ...currentUser }]);
        return { where: vi.fn().mockReturnValue(Object.assign(result, { returning: () => result })) };
      }),
    }),
  };

  const mockJwt = {
    signAsync: vi.fn().mockResolvedValue('jwt_mock_token_123'),
    decode: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 }),
    verifyAsync: vi.fn().mockResolvedValue({ sub: currentUser.id, exp: Math.floor(Date.now() / 1000) + 900 }),
  };

  const service = new AuthService(mockDb as any, mockJwt as any);

  return {
    service,
    mockDb,
    mockJwt,
    getCurrentUser: () => currentUser,
    getUpdateCalls: () => updateCalls,
  };
}

describe('AuthService - PR-04A Account Lockout Matrix', () => {
  const password = defaultPassword;

  // Case 1: correct password on clean account -> success
  it('Case 1: correct password on clean account -> success', async () => {
    const { service, getCurrentUser, getUpdateCalls } = createMockContext();
    const res = await service.login({ email: 'admin@ltvietnam.com.vn', password });

    expect(res.accessToken).toBe('jwt_mock_token_123');
    expect(res.user.email).toBe('admin@ltvietnam.com.vn');
    expect(getCurrentUser().failedLoginAttempts).toBe(0);
    expect(getCurrentUser().lockedUntil).toBeNull();
    expect(getUpdateCalls().length).toBe(1);
    expect(getUpdateCalls()[0]).toHaveProperty('lastLoginAt');
  });

  // Case 2: first wrong password -> attempts 1
  it('Case 2: first wrong password -> attempts 1', async () => {
    const { service, getCurrentUser, getUpdateCalls } = createMockContext();
    await expect(service.login({ email: 'admin@ltvietnam.com.vn', password: 'WrongPassword' })).rejects.toThrow(UnauthorizedException);

    expect(getCurrentUser().failedLoginAttempts).toBe(1);
    expect(getCurrentUser().lockedUntil).toBeNull();
    expect(getUpdateCalls().length).toBe(1);
    expect(getUpdateCalls()[0]).toHaveProperty('failedLoginAttempts');
    expect(getUpdateCalls()[0]).toHaveProperty('lockedUntil');
  });

  // Case 3: repeated wrong passwords below threshold -> no lock
  it('Case 3: repeated wrong passwords below threshold -> no lock', async () => {
    const { service, getCurrentUser } = createMockContext();
    for (let i = 1; i <= 4; i++) {
      await expect(service.login({ email: 'admin@ltvietnam.com.vn', password: 'WrongPassword' })).rejects.toThrow(UnauthorizedException);
      expect(getCurrentUser().failedLoginAttempts).toBe(i);
      expect(getCurrentUser().lockedUntil).toBeNull();
    }
  });

  // Case 4: threshold failure -> lockedUntil set
  it('Case 4: threshold failure -> lockedUntil set to future timestamp', async () => {
    const { service, getCurrentUser } = createMockContext({ failedLoginAttempts: 4 });
    await expect(service.login({ email: 'admin@ltvietnam.com.vn', password: 'WrongPassword' })).rejects.toThrow(UnauthorizedException);

    expect(getCurrentUser().failedLoginAttempts).toBe(5);
    expect(getCurrentUser().lockedUntil).toBeInstanceOf(Date);
    expect(getCurrentUser().lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  // Case 5: correct password during lock -> denied
  it('Case 5: correct password during lock -> denied', async () => {
    const futureLock = new Date(Date.now() + 15 * 60 * 1000);
    const { service, getCurrentUser, getUpdateCalls } = createMockContext({
      failedLoginAttempts: 5,
      lockedUntil: futureLock,
    });

    await expect(service.login({ email: 'admin@ltvietnam.com.vn', password })).rejects.toThrow(
      'Account is temporarily locked due to failed login attempts.',
    );
    expect(getCurrentUser().failedLoginAttempts).toBe(5);
    expect(getCurrentUser().lockedUntil).toBe(futureLock);
    expect(getUpdateCalls().length).toBe(0); // Counter is not incremented, lock not reset
  });

  // Case 6: wrong password during lock -> still locked, counter not incremented
  it('Case 6: wrong password during lock -> still locked', async () => {
    const futureLock = new Date(Date.now() + 15 * 60 * 1000);
    const { service, getCurrentUser, getUpdateCalls } = createMockContext({
      failedLoginAttempts: 5,
      lockedUntil: futureLock,
    });

    await expect(service.login({ email: 'admin@ltvietnam.com.vn', password: 'WrongPassword' })).rejects.toThrow(
      'Account is temporarily locked due to failed login attempts.',
    );
    expect(getCurrentUser().failedLoginAttempts).toBe(5);
    expect(getUpdateCalls().length).toBe(0);
  });

  // Case 7: expired lock + correct password -> success + reset
  it('Case 7: expired lock + correct password -> success + reset', async () => {
    const pastLock = new Date(Date.now() - 60 * 1000);
    const { service, getCurrentUser, getUpdateCalls } = createMockContext({
      failedLoginAttempts: 5,
      lockedUntil: pastLock,
    });

    const res = await service.login({ email: 'admin@ltvietnam.com.vn', password });
    expect(res.accessToken).toBe('jwt_mock_token_123');
    expect(getCurrentUser().failedLoginAttempts).toBe(0);
    expect(getCurrentUser().lockedUntil).toBeNull();
    expect(getUpdateCalls()[0]).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
  });

  // Case 8: expired lock + wrong password -> new cycle starts at 1
  it('Case 8: expired lock + wrong password -> new cycle starts at 1', async () => {
    const pastLock = new Date(Date.now() - 60 * 1000);
    const { service, getCurrentUser, getUpdateCalls } = createMockContext({
      failedLoginAttempts: 5,
      lockedUntil: pastLock,
    });

    await expect(service.login({ email: 'admin@ltvietnam.com.vn', password: 'WrongPassword' })).rejects.toThrow(UnauthorizedException);
    expect(getCurrentUser().failedLoginAttempts).toBe(1);
    expect(getCurrentUser().lockedUntil).toBeNull();
    expect(getUpdateCalls()[0]).toHaveProperty('failedLoginAttempts');
    expect(getUpdateCalls()[0]).toHaveProperty('lockedUntil');
  });

  // Case 9: failures then successful login -> reset
  it('Case 9: failures then successful login -> reset', async () => {
    const { service, getCurrentUser } = createMockContext();
    await expect(service.login({ email: 'admin@ltvietnam.com.vn', password: 'Wrong1' })).rejects.toThrow(UnauthorizedException);
    await expect(service.login({ email: 'admin@ltvietnam.com.vn', password: 'Wrong2' })).rejects.toThrow(UnauthorizedException);
    expect(getCurrentUser().failedLoginAttempts).toBe(2);

    const res = await service.login({ email: 'admin@ltvietnam.com.vn', password });
    expect(res.accessToken).toBe('jwt_mock_token_123');
    expect(getCurrentUser().failedLoginAttempts).toBe(0);
    expect(getCurrentUser().lockedUntil).toBeNull();
  });

  // Case 10: unknown email -> generic failure, no mutation
  it('Case 10: unknown email -> generic failure, no mutation', async () => {
    const { service, mockDb, getUpdateCalls } = createMockContext();
    mockDb.query.users.findFirst.mockResolvedValueOnce(undefined);

    await expect(service.login({ email: 'unknown@example.com', password })).rejects.toThrow(UnauthorizedException);
    expect(getUpdateCalls().length).toBe(0);
  });

  // Case 11: passwordHash never exposed
  it('Case 11: passwordHash never exposed in login response', async () => {
    const { service } = createMockContext();
    const res = await service.login({ email: 'admin@ltvietnam.com.vn', password });

    expect(res).not.toHaveProperty('passwordHash');
    expect(res.user).not.toHaveProperty('passwordHash');
    expect(res.user).not.toHaveProperty('failedLoginAttempts');
    expect(res.user).not.toHaveProperty('lockedUntil');
    expect(Object.keys(res.user)).toEqual(['id', 'email', 'fullName', 'role']);
  });

  it('F05 signs the current token version and rejects missing or stale versions', async () => {
    const { service, mockJwt, getCurrentUser } = createMockContext({ tokenVersion: 0 });
    await service.login({ email: 'admin@ltvietnam.com.vn', password });
    expect(mockJwt.signAsync).toHaveBeenCalledWith({ sub: getCurrentUser().id, tokenVersion: 0 });

    mockJwt.verifyAsync.mockResolvedValue({ sub: getCurrentUser().id, exp: Math.floor(Date.now() / 1000) + 900 });
    await expect(service.authenticate('legacy-token')).rejects.toThrow(UnauthorizedException);
    mockJwt.verifyAsync.mockResolvedValue({ sub: getCurrentUser().id, exp: Math.floor(Date.now() / 1000) + 900, tokenVersion: 1 });
    await expect(service.authenticate('stale-token')).rejects.toThrow(UnauthorizedException);
    mockJwt.verifyAsync.mockResolvedValue({ sub: getCurrentUser().id, exp: Math.floor(Date.now() / 1000) + 900, tokenVersion: 0 });
    await expect(service.authenticate('current-token')).resolves.toMatchObject({ id: getCurrentUser().id });
  });
});

describe('AuthService - PR-10A Change Password Matrix', () => {
  const currentPassword = 'CurrentPassword#123';
  const newPassword = 'NewStrongPassword#2026';
  const userId = '11111111-1111-4111-8111-111111111111';

  // 1. correct current + strong new -> PASS
  it('1. correct current + strong new -> PASS', async () => {
    const { service, getCurrentUser } = createMockContext({
      passwordHash: hashSync(currentPassword, 10),
    });
    const res = await service.changePassword(userId, { currentPassword, newPassword });
    expect(res).toEqual({ message: 'Đổi mật khẩu thành công.' });
    expect(getCurrentUser().passwordHash).not.toBe(currentPassword);
  });

  // 2. wrong current -> reject, hash unchanged
  it('2. wrong current -> reject, hash unchanged', async () => {
    const originalHash = hashSync(currentPassword, 10);
    const { service, getCurrentUser } = createMockContext({ passwordHash: originalHash });
    await expect(
      service.changePassword(userId, { currentPassword: 'WrongCurrentPassword#999', newPassword }),
    ).rejects.toThrow(BadRequestException);
    expect(getCurrentUser().passwordHash).toBe(originalHash);
  });

  // 3. weak password: too short
  it('3. weak password: too short -> reject', async () => {
    const { service } = createMockContext({ passwordHash: hashSync(currentPassword, 10) });
    await expect(
      service.changePassword(userId, { currentPassword, newPassword: 'Short#1Aa' }),
    ).rejects.toThrow(BadRequestException);
  });

  // 4. weak password: no uppercase
  it('4. weak password: no uppercase -> reject', async () => {
    const { service } = createMockContext({ passwordHash: hashSync(currentPassword, 10) });
    await expect(
      service.changePassword(userId, { currentPassword, newPassword: 'nouppercase#123' }),
    ).rejects.toThrow(BadRequestException);
  });

  // 5. weak password: no lowercase
  it('5. weak password: no lowercase -> reject', async () => {
    const { service } = createMockContext({ passwordHash: hashSync(currentPassword, 10) });
    await expect(
      service.changePassword(userId, { currentPassword, newPassword: 'NOLOWERCASE#123' }),
    ).rejects.toThrow(BadRequestException);
  });

  // 6. weak password: no number
  it('6. weak password: no number -> reject', async () => {
    const { service } = createMockContext({ passwordHash: hashSync(currentPassword, 10) });
    await expect(
      service.changePassword(userId, { currentPassword, newPassword: 'NoNumberSpecial!' }),
    ).rejects.toThrow(BadRequestException);
  });

  // 7. weak password: no special
  it('7. weak password: no special -> reject', async () => {
    const { service } = createMockContext({ passwordHash: hashSync(currentPassword, 10) });
    await expect(
      service.changePassword(userId, { currentPassword, newPassword: 'NoSpecial12345' }),
    ).rejects.toThrow(BadRequestException);
  });

  // 8. new equals current -> reject
  it('8. new equals current -> reject', async () => {
    const { service } = createMockContext({ passwordHash: hashSync(currentPassword, 10) });
    await expect(
      service.changePassword(userId, { currentPassword, newPassword: currentPassword }),
    ).rejects.toThrow('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
  });

  // 9. successful password update uses bcrypt hash
  it('9. successful password update uses valid bcrypt hash', async () => {
    const { service, getCurrentUser } = createMockContext({ passwordHash: hashSync(currentPassword, 10) });
    await service.changePassword(userId, { currentPassword, newPassword });
    const updatedHash = getCurrentUser().passwordHash;
    expect(updatedHash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
    expect(updatedHash).not.toBe(newPassword);
  });

  // 10. response never exposes hash/password
  it('10. response never exposes hash/password', async () => {
    const { service } = createMockContext({ passwordHash: hashSync(currentPassword, 10) });
    const res = await service.changePassword(userId, { currentPassword, newPassword });
    expect(res).not.toHaveProperty('password');
    expect(res).not.toHaveProperty('passwordHash');
    expect(res).not.toHaveProperty('newPassword');
    expect(res).not.toHaveProperty('currentPassword');
    expect(Object.keys(res)).toEqual(['message']);
  });

  // 11. lockout fields reset if chosen contract
  it('11. lockout fields reset on successful change', async () => {
    const { service, getCurrentUser } = createMockContext({
      passwordHash: hashSync(currentPassword, 10),
      failedLoginAttempts: 3,
      lockedUntil: null,
    });
    await service.changePassword(userId, { currentPassword, newPassword });
    expect(getCurrentUser().failedLoginAttempts).toBe(0);
    expect(getCurrentUser().lockedUntil).toBeNull();
  });

  it('F05 increments token version only after a successful password change', async () => {
    const { service, getCurrentUser } = createMockContext({
      passwordHash: hashSync(currentPassword, 10), tokenVersion: 0,
    });
    await expect(service.changePassword(userId, {
      currentPassword: 'WrongPassword#123', newPassword,
    })).rejects.toThrow(BadRequestException);
    expect(getCurrentUser().tokenVersion).toBe(0);
    await service.changePassword(userId, { currentPassword, newPassword });
    expect(getCurrentUser().tokenVersion).toBe(1);
  });

  // 12. unknown/deleted authenticated user handled safely
  it('12. unknown/deleted authenticated user handled safely', async () => {
    const { service, mockDb } = createMockContext();
    mockDb.query.users.findFirst.mockResolvedValueOnce(undefined);
    await expect(
      service.changePassword(userId, { currentPassword, newPassword }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('PR-10B Password Recovery - 18 Security & Contract Requirements', () => {
  interface TokenRow {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
    createdAt: Date;
  }

  function extractStringParams(sqlObj: any, found: string[] = []): string[] {
    if (!sqlObj || typeof sqlObj !== 'object') return found;
    if ('value' in sqlObj && typeof sqlObj.value === 'string') {
      found.push(sqlObj.value);
    }
    if (Array.isArray(sqlObj.queryChunks)) {
      for (const chunk of sqlObj.queryChunks) {
        extractStringParams(chunk, found);
      }
    }
    return found;
  }

  function createRecoveryMockContext(initialUserOverrides: Record<string, unknown> = {}) {
    let currentUser: any = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'admin@ltvietnam.com.vn',
      fullName: 'Quản Trị Viên',
      role: 'admin',
      status: 'active',
      deletedAt: null,
      passwordHash: hashSync('OldValidPassword#123', 10),
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockedUntil: null as Date | null,
      lastLoginAt: null as Date | null,
      updatedAt: new Date(),
      ...initialUserOverrides,
    };

    const tokensTable: TokenRow[] = [];
    const sentEmails: any[] = [];
    let shouldSmtpFail = false;

    const mockEmailSender = {
      send: vi.fn().mockImplementation(async (opts: any) => {
        if (shouldSmtpFail) {
          throw new Error('secret=FAKE_SMTP_SECRET username=fake-user host=smtp.internal ip=10.0.0.1');
        }
        sentEmails.push(opts);
        return { messageId: 'msg-' + Math.random().toString(36).slice(2) };
      }),
    };

    let configuredAdminUrl: string | undefined = 'https://admin.example.com';
    const mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'ADMIN_PUBLIC_URL') return configuredAdminUrl;
        if (key === 'AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES') return 30;
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      }),
    };

    const mockDb: any = {
      query: {
        users: {
          findFirst: vi.fn().mockImplementation(async () => {
            if (currentUser && currentUser.status === 'active' && !currentUser.deletedAt && currentUser.role === 'admin') {
              return currentUser;
            }
            return undefined;
          }),
        },
      },
      transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx: any = {
          query: {
            users: {
              findFirst: vi.fn().mockImplementation(async () => currentUser),
            },
          },
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation(async (values: any) => {
              const row: TokenRow = {
                id: 'tok-id-' + (tokensTable.length + 1),
                userId: values.userId,
                tokenHash: values.tokenHash,
                expiresAt: values.expiresAt,
                consumedAt: null,
                createdAt: new Date(),
              };
              tokensTable.push(row);
              return [row];
            }),
          })),
          update: vi.fn().mockImplementation((table: any) => ({
            set: (updates: any) => ({
              where: (condition: any) => {
                // Table 1: users
                if (table === users) {
                  currentUser = {
                    ...currentUser,
                    ...updates,
                    ...('tokenVersion' in updates ? { tokenVersion: currentUser.tokenVersion + 1 } : {}),
                    updatedAt: new Date(),
                  };
                  const result = Promise.resolve([{ ...currentUser }]);
                  return Object.assign(result, { returning: () => result });
                }

                // Table 2: passwordResetTokens
                const params = extractStringParams(condition);

                return {
                  then: (resolve: (val: any) => void) => {
                    // Invalidation query in forgotPassword: marks unconsumed tokens as consumed
                    for (const t of tokensTable) {
                      if (t.userId === currentUser?.id && t.consumedAt === null) {
                        t.consumedAt = updates.consumedAt;
                      }
                    }
                    resolve([]);
                  },
                  returning: (_retFields?: any) => {
                    const now = new Date();
                    // Atomic consumption query in resetPassword
                    let matchedToken: TokenRow | undefined;
                    for (const t of tokensTable) {
                      if (params.includes(t.tokenHash) && t.consumedAt === null && t.expiresAt > now) {
                        matchedToken = t;
                        break;
                      }
                    }
                    if (matchedToken) {
                      matchedToken.consumedAt = updates.consumedAt;
                      return Promise.resolve([{ id: matchedToken.id, userId: matchedToken.userId }]);
                    }
                    return Promise.resolve([]);
                  },
                };
              },
            }),
          })),
        };
        return await cb(tx);
      }),
    };

    const mockJwt = {
      signAsync: vi.fn().mockResolvedValue('jwt_mock'),
      decode: vi.fn().mockReturnValue({ exp: 123 }),
      verifyAsync: vi.fn().mockResolvedValue({ sub: currentUser.id, exp: 123 }),
    };

    const service = new AuthService(
      mockDb as any,
      mockJwt as any,
      mockConfigService as any,
      mockEmailSender as any,
    );

    return {
      service,
      mockDb,
      mockJwt,
      mockEmailSender,
      mockConfigService,
      setSmtpFail: (fail: boolean) => { shouldSmtpFail = fail; },
      setAdminUrl: (url: string | undefined) => { configuredAdminUrl = url; },
      getCurrentUser: () => currentUser,
      getTokensTable: () => tokensTable,
      getSentEmails: () => sentEmails,
    };
  }

  // Helper to extract raw token from email resetLink
  function extractTokenFromEmail(sentEmails: any[]): string {
    const lastEmail = sentEmails[sentEmails.length - 1];
    expect(lastEmail).toBeDefined();
    const match = /token=([0-9a-fA-F]+)/.exec(lastEmail.text);
    expect(match).not.toBeNull();
    return match![1];
  }

  // 1. forgot endpoint existing account generic response
  it('1. forgot endpoint existing account generic response', async () => {
    const { service } = createRecoveryMockContext();
    const res = await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    expect(res).toEqual({
      message: 'Nếu tài khoản phù hợp tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi tới địa chỉ đã đăng ký.',
    });
  });

  // 2. forgot endpoint nonexistent account same response
  it('2. forgot endpoint nonexistent account same response', async () => {
    const { service, mockDb } = createRecoveryMockContext();
    mockDb.query.users.findFirst.mockResolvedValueOnce(undefined);
    const res = await service.forgotPassword({ email: 'nonexistent@example.com' });
    expect(res).toEqual({
      message: 'Nếu tài khoản phù hợp tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi tới địa chỉ đã đăng ký.',
    });
  });

  // 3. raw token never stored
  it('3. raw token never stored', async () => {
    const { service, getTokensTable, getSentEmails } = createRecoveryMockContext();
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());
    const tokens = getTokensTable();
    expect(tokens.length).toBe(1);
    expect(tokens[0].tokenHash).not.toBe(rawToken);
    expect(rawToken.length).toBe(64);
  });

  // 4. secure token hash stored
  it('4. secure token hash stored', async () => {
    const { service, getTokensTable, getSentEmails } = createRecoveryMockContext();
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());
    const tokens = getTokensTable();
    const expectedHash = createHash('sha256').update(rawToken).digest('hex');
    expect(tokens[0].tokenHash).toBe(expectedHash);
  });

  // 5. expiry enforced
  it('5. expiry enforced', async () => {
    const { service, getTokensTable, getSentEmails } = createRecoveryMockContext();
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());
    // Expire the token manually
    getTokensTable()[0].expiresAt = new Date(Date.now() - 60000);

    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'NewSecurePassword#2026' }),
    ).rejects.toThrow('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
  });

  // 6. single-use enforced
  it('6. single-use enforced', async () => {
    const { service, getSentEmails } = createRecoveryMockContext();
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());

    const first = await service.resetPassword({ token: rawToken, newPassword: 'NewSecurePassword#2026' });
    expect(first.message).toContain('Mật khẩu đã được cập nhật thành công');

    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'AnotherPassword#2026' }),
    ).rejects.toThrow('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
  });

  // 7. previous token invalidated by new request
  it('7. previous token invalidated by new request', async () => {
    const { service, getSentEmails } = createRecoveryMockContext();
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken1 = extractTokenFromEmail(getSentEmails());

    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken2 = extractTokenFromEmail(getSentEmails());

    expect(rawToken1).not.toBe(rawToken2);

    // Old token must fail
    await expect(
      service.resetPassword({ token: rawToken1, newPassword: 'NewSecurePassword#2026' }),
    ).rejects.toThrow('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');

    // New token must succeed
    const res = await service.resetPassword({ token: rawToken2, newPassword: 'NewSecurePassword#2026' });
    expect(res.message).toContain('Mật khẩu đã được cập nhật thành công');
  });

  // 8. password policy shared with PR-10A
  it('8. password policy shared with PR-10A', async () => {
    const { service, getSentEmails } = createRecoveryMockContext();
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());

    // Too short (< 12)
    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'Short1#' }),
    ).rejects.toThrow('12 ký tự');

    // Missing uppercase
    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'lowercase_only_123#' }),
    ).rejects.toThrow('in hoa');

    // Missing lowercase
    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'UPPERCASE_ONLY_123#' }),
    ).rejects.toThrow('chữ cái thường');

    // Missing digit
    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'NoDigitsHereSpecial#' }),
    ).rejects.toThrow('chữ số');

    // Missing special character
    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'NoSpecialChars1234' }),
    ).rejects.toThrow('ký tự đặc biệt');
  });

  // 9. successful reset changes bcrypt hash
  it('9. successful reset changes bcrypt hash', async () => {
    const { service, getCurrentUser, getSentEmails } = createRecoveryMockContext();
    const oldHash = getCurrentUser().passwordHash;
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());

    await service.resetPassword({ token: rawToken, newPassword: 'NewSecurePassword#2026' });
    const newHash = getCurrentUser().passwordHash;
    expect(newHash).not.toBe(oldHash);
    expect(newHash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
    expect(await compare('NewSecurePassword#2026', newHash)).toBe(true);
  });

  it('F05 increments token version atomically with reset and leaves it unchanged for invalid reset', async () => {
    const { service, getCurrentUser, getSentEmails } = createRecoveryMockContext({ tokenVersion: 0 });
    await expect(service.resetPassword({ token: 'invalid-token', newPassword: 'NewSecurePassword#2026' })).rejects.toThrow(BadRequestException);
    expect(getCurrentUser().tokenVersion).toBe(0);
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    await service.resetPassword({ token: extractTokenFromEmail(getSentEmails()), newPassword: 'NewSecurePassword#2026' });
    expect(getCurrentUser().tokenVersion).toBe(1);
  });

  it('F05 rejects authentication that started before a reset but reads the account after it commits', async () => {
    const { service, mockJwt, getCurrentUser, getSentEmails } = createRecoveryMockContext({ tokenVersion: 0 });
    let releaseVerification!: () => void;
    const verificationGate = new Promise<void>((resolve) => { releaseVerification = resolve; });
    mockJwt.verifyAsync.mockImplementationOnce(async () => {
      await verificationGate;
      return { sub: getCurrentUser().id, exp: Math.floor(Date.now() / 1000) + 900, tokenVersion: 0 };
    });

    const inFlightAuth = service.authenticate('pre-reset-jwt');
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    await service.resetPassword({ token: extractTokenFromEmail(getSentEmails()), newPassword: 'NewSecurePassword#2026' });
    releaseVerification();
    await expect(inFlightAuth).rejects.toThrow(UnauthorizedException);
  });

  // 10. successful reset resets lockout
  it('10. successful reset resets lockout', async () => {
    const { service, getCurrentUser, getSentEmails } = createRecoveryMockContext({
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 900000),
    });
    expect(getCurrentUser().failedLoginAttempts).toBe(5);
    expect(getCurrentUser().lockedUntil).not.toBeNull();

    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());

    await service.resetPassword({ token: rawToken, newPassword: 'NewSecurePassword#2026' });
    expect(getCurrentUser().failedLoginAttempts).toBe(0);
    expect(getCurrentUser().lockedUntil).toBeNull();
  });

  // 11. invalid token leaves password unchanged
  it('11. invalid token leaves password unchanged', async () => {
    const { service, getCurrentUser } = createRecoveryMockContext();
    const originalHash = getCurrentUser().passwordHash;

    await expect(
      service.resetPassword({ token: 'nonexistent_token_hex', newPassword: 'NewSecurePassword#2026' }),
    ).rejects.toThrow('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');

    expect(getCurrentUser().passwordHash).toBe(originalHash);
  });

  // 12. expired token leaves password unchanged
  it('12. expired token leaves password unchanged', async () => {
    const { service, getCurrentUser, getTokensTable, getSentEmails } = createRecoveryMockContext();
    const originalHash = getCurrentUser().passwordHash;

    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());
    getTokensTable()[0].expiresAt = new Date(Date.now() - 10000);

    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'NewSecurePassword#2026' }),
    ).rejects.toThrow('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');

    expect(getCurrentUser().passwordHash).toBe(originalHash);
  });

  // 13. consumed token leaves password unchanged
  it('13. consumed token leaves password unchanged', async () => {
    const { service, getCurrentUser, getSentEmails } = createRecoveryMockContext();
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());

    await service.resetPassword({ token: rawToken, newPassword: 'FirstNewPassword#2026' });
    const hashAfterFirst = getCurrentUser().passwordHash;

    await expect(
      service.resetPassword({ token: rawToken, newPassword: 'SecondNewPassword#2026' }),
    ).rejects.toThrow('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');

    expect(getCurrentUser().passwordHash).toBe(hashAfterFirst);
  });

  // 14. concurrent token use -> exactly one success
  it('14. concurrent token use -> exactly one success', async () => {
    const { service, getSentEmails } = createRecoveryMockContext();
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    const rawToken = extractTokenFromEmail(getSentEmails());

    const results = await Promise.allSettled([
      service.resetPassword({ token: rawToken, newPassword: 'NewSecurePassword#2026' }),
      service.resetPassword({ token: rawToken, newPassword: 'NewSecurePassword#2026' }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect((failures[0] as PromiseRejectedResult).reason.message).toContain(
      'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
    );
  });

  // 15. arbitrary client destination impossible
  it('15. arbitrary client destination impossible', async () => {
    const { service, getSentEmails } = createRecoveryMockContext();
    // Malicious caller tries to inject destination email
    await service.forgotPassword({
      email: 'admin@ltvietnam.com.vn',
      recipientEmail: 'attacker@evil.com',
      destination: 'attacker@evil.com',
    } as any);

    const emails = getSentEmails();
    expect(emails.length).toBe(1);
    expect(emails[0].to).toBe('admin@ltvietnam.com.vn');
    expect(emails[0].to).not.toContain('attacker@evil.com');
  });

  // 16. SMTP error sanitized
  it('16. SMTP error sanitized', async () => {
    const { service, setSmtpFail } = createRecoveryMockContext();
    setSmtpFail(true);
    const logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const res = await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    expect(res).toEqual({
      message: 'Nếu tài khoản phù hợp tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi tới địa chỉ đã đăng ký.',
    });
    const logs = JSON.stringify(logSpy.mock.calls);
    expect(logs).not.toContain('FAKE_SMTP_SECRET');
    expect(logs).not.toContain('fake-user');
    expect(logs).not.toContain('smtp.internal');
    expect(logs).not.toContain('10.0.0.1');
    logSpy.mockRestore();
  });

  // 17. recovery link uses configured Admin origin
  it('17. recovery link uses configured Admin origin', async () => {
    const { service, setAdminUrl, getSentEmails } = createRecoveryMockContext();
    setAdminUrl('https://my-admin.ltvietnam.vn');
    await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });

    const emails = getSentEmails();
    expect(emails[0].text).toContain('https://my-admin.ltvietnam.vn/reset-password?token=');
    expect(emails[0].html).toContain('https://my-admin.ltvietnam.vn/reset-password?token=');
  });

  // 18. raw token absent from logs/API responses
  it('18. raw token absent from logs/API responses', async () => {
    const { service, getSentEmails } = createRecoveryMockContext();
    const forgotRes = await service.forgotPassword({ email: 'admin@ltvietnam.com.vn' });
    expect(Object.keys(forgotRes)).toEqual(['message']);
    expect(JSON.stringify(forgotRes)).not.toContain('token');

    const rawToken = extractTokenFromEmail(getSentEmails());
    const resetRes = await service.resetPassword({ token: rawToken, newPassword: 'NewSecurePassword#2026' });
    expect(Object.keys(resetRes)).toEqual(['message']);
    expect(JSON.stringify(resetRes)).not.toContain('token');
    expect(JSON.stringify(resetRes)).not.toContain(rawToken);
  });
});
