import { adminFetch } from './auth';
import { machineMutationPayload } from './machine-payload';
import type {
  Machine,
  Standard,
  MediaAsset,
  MediaCreateInput,
  NewsEvent,
  Contact,
  User,
  Redirect,
  EmailSettings,
  UpdateEmailSettingsPayload,
  SendTestEmailResponse,
} from '../types';

// Helper UUID validation
export function isValidUuid(id?: string | null): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// HTTP request helper with strict error propagation and 204 handling
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await adminFetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Lỗi kết nối mạng tới máy chủ.';
    throw new ApiError(message, 0);
  }

  if (!res.ok) {
    let errorMsg = `Yêu cầu thất bại (HTTP ${res.status})`;
    let errorData: unknown = undefined;
    try {
      const body = await res.json();
      errorData = body;
      if (body && typeof body === 'object') {
        if (typeof body.message === 'string') {
          errorMsg = body.message;
        } else if (Array.isArray(body.message) && typeof body.message[0] === 'string') {
          errorMsg = body.message.join(', ');
        } else if (typeof body.error === 'string') {
          errorMsg = body.error;
        }
      }
    } catch {
      if (res.statusText) {
        errorMsg = `${errorMsg}: ${res.statusText}`;
      }
    }
    throw new ApiError(errorMsg, res.status, errorData);
  }

  // Handle 204 No Content or empty responses as successful
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  if (!text || !text.trim()) {
    return undefined as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Phản hồi từ máy chủ không hợp lệ.', 502);
  }
}

async function apiListRequest<T>(endpoint: string): Promise<T[]> {
  const value = await apiRequest<unknown>(endpoint);
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ApiError('Danh sách từ máy chủ không hợp lệ.', 502);
  return value as T[];
}

// Data Store Service connecting Admin Portal to NestJS Backend & Neon PostgreSQL
export const api = {
  // Check backend health
  async checkBackend(): Promise<boolean> {
    try {
      const res = await adminFetch('/api', { method: 'GET', signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Machines
  async getMachines(): Promise<Machine[]> {
    return apiListRequest<Machine>('/api/admin/machines');
  },

  async saveMachine(machine: Machine): Promise<Machine> {
    const isExisting = Boolean(machine.id && isValidUuid(machine.id));
    const payload = machineMutationPayload(machine);

    let saved: Machine;
    if (isExisting) {
      saved = await apiRequest<Machine>(`/api/machines/${machine.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      saved = await apiRequest<Machine>('/api/machines', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    return saved;
  },

  async deleteMachine(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID máy không hợp lệ.', 400);
    }
    await apiRequest(`/api/machines/${id}`, { method: 'DELETE' });

  },

  // Standards
  async getStandards(): Promise<Standard[]> {
    return apiListRequest<Standard>('/api/standards');
  },

  async saveStandard(standard: Standard): Promise<Standard> {
    const isExisting = Boolean(standard.id && isValidUuid(standard.id));
    const payload = {
      code: standard.code,
      organization: standard.organization,
      year: standard.year,
      title: standard.title,
      description: standard.description,
    };

    let saved: Standard;
    if (isExisting) {
      saved = await apiRequest<Standard>(`/api/standards/${standard.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      saved = await apiRequest<Standard>('/api/standards', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    return saved;
  },

  async deleteStandard(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID tiêu chuẩn không hợp lệ.', 400);
    }
    await apiRequest(`/api/standards/${id}`, { method: 'DELETE' });

  },

  // Media
  async getMedia(): Promise<MediaAsset[]> {
    return apiListRequest<MediaAsset>('/api/media');
  },

  async saveMedia(asset: MediaCreateInput & Partial<Pick<MediaAsset, 'id' | 'createdAt'>>): Promise<MediaAsset> {
    const payload: MediaCreateInput = {
      fileName: asset.fileName,
      storageKey: asset.storageKey,
      publicUrl: asset.publicUrl,
      altText: asset.altText,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
    };
    const saved = await apiRequest<MediaAsset>('/api/media', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return saved;
  },

  async deleteMedia(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID media không hợp lệ.', 400);
    }
    await apiRequest(`/api/media/${id}`, { method: 'DELETE' });

  },

  // News Events
  async getNewsEvents(): Promise<NewsEvent[]> {
    return apiListRequest<NewsEvent>('/api/admin/news-events');
  },

  async saveNewsEvent(item: NewsEvent): Promise<NewsEvent> {
    const isExisting = Boolean(item.id && isValidUuid(item.id));
    const payload: Record<string, any> = {
      type: item.type,
      title: item.title,
      slug: item.slug,
      shortDescription: item.shortDescription,
      thumbnailImageId: item.thumbnailImageId === undefined ? undefined : item.thumbnailImageId?.trim() || null,
      status: item.status,
      content: item.content,
      location: item.location,
      eventStartAt: item.eventStartAt,
      eventEndAt: item.eventEndAt,
    };

    if (item.translations) {
      const transPayload: Record<string, any> = {};
      if (item.translations.vi) {
        transPayload.vi = item.translations.vi;
      }
      if (item.translations.en && item.translations.en.title && item.translations.en.title.trim()) {
        transPayload.en = item.translations.en;
      }
      if (Object.keys(transPayload).length > 0) {
        payload.translations = transPayload;
      }
    }

    let saved: NewsEvent;
    if (isExisting) {
      saved = await apiRequest<NewsEvent>(`/api/news-events/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      saved = await apiRequest<NewsEvent>('/api/news-events', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    return saved;
  },

  async deleteNewsEvent(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID bài viết không hợp lệ.', 400);
    }
    await apiRequest(`/api/news-events/${id}`, { method: 'DELETE' });

  },

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return apiListRequest<Contact>('/api/contacts');
  },

  async updateContactStatus(
    id: string,
    status: Contact['status'],
    note?: string,
    assignedTo?: string | null,
  ): Promise<void> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID liên hệ không hợp lệ.', 400);
    }
    const payload: Record<string, unknown> = { status, adminNote: note };
    if (assignedTo !== undefined) {
      payload.assignedTo = assignedTo;
    }
    await apiRequest<Contact>(`/api/contacts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteContact(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID liên hệ không hợp lệ.', 400);
    }
    await apiRequest(`/api/contacts/${id}`, { method: 'DELETE' });

  },

  // Users
  async getUsers(): Promise<User[]> {
    return apiListRequest<User>('/api/users');
  },

  async saveUser(user: User): Promise<User> {
    const isExisting = Boolean(user.id && isValidUuid(user.id));
    const payload = {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    };

    let saved: User;
    if (isExisting) {
      saved = await apiRequest<User>(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      saved = await apiRequest<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    return saved;
  },

  async deleteUser(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID tài khoản không hợp lệ.', 400);
    }
    await apiRequest(`/api/users/${id}`, { method: 'DELETE' });

  },

  // Email Settings & Test
  async getEmailSettings(): Promise<EmailSettings> {
    return apiRequest<EmailSettings>('/api/settings/email');
  },

  async updateEmailSettings(payload: UpdateEmailSettingsPayload): Promise<EmailSettings> {
    return apiRequest<EmailSettings>('/api/settings/email', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async sendTestEmail(payload?: { recipient?: string }): Promise<SendTestEmailResponse> {
    return apiRequest<SendTestEmailResponse>('/api/settings/email/test', {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : JSON.stringify({}),
    });
  },

  // 301 Redirects API (PR-12B)
  async getRedirects(): Promise<Redirect[]> {
    return apiListRequest<Redirect>('/api/redirects');
  },

  async saveRedirect(redirect: Partial<Redirect> & { sourcePath: string; destinationPath: string }): Promise<Redirect> {
    const isExisting = Boolean(redirect.id && isValidUuid(redirect.id));
    const payload = {
      sourcePath: redirect.sourcePath,
      destinationPath: redirect.destinationPath,
      isActive: redirect.isActive !== undefined ? redirect.isActive : true,
      notes: redirect.notes ?? undefined,
    };

    let saved: Redirect;
    if (isExisting) {
      saved = await apiRequest<Redirect>(`/api/redirects/${redirect.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      saved = await apiRequest<Redirect>('/api/redirects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    return saved;
  },

  async toggleRedirect(id: string): Promise<Redirect> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID chuyển hướng không hợp lệ.', 400);
    }
    return apiRequest<Redirect>(`/api/redirects/${id}/toggle`, { method: 'PATCH' });
  },

  async deleteRedirect(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw new ApiError('ID chuyển hướng không hợp lệ.', 400);
    }
    await apiRequest(`/api/redirects/${id}`, { method: 'DELETE' });

  },
};
