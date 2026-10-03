import { hashSync } from 'bcryptjs';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
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
          ...(updates.lastLoginAt ? { lastLoginAt: updates.lastLoginAt as Date } : {}),
          updatedAt: now,
        };
        return {
          where: vi.fn().mockResolvedValue([{ ...currentUser }]),
        };
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

  // 12. unknown/deleted authenticated user handled safely
  it('12. unknown/deleted authenticated user handled safely', async () => {
    const { service, mockDb } = createMockContext();
    mockDb.query.users.findFirst.mockResolvedValueOnce(undefined);
    await expect(
      service.changePassword(userId, { currentPassword, newPassword }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

