import { fetchWithRetry } from '../api-client';
import {
  TempMailProvider,
  ProviderMailbox,
  ProviderMessage,
  ProviderMessageDetail,
} from './types';

const BASE_URL = 'https://api.mail.tm';

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;

  // Ensure at least one of each type
  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < 16; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export class MailTmProvider implements TempMailProvider {
  readonly name = 'mailtm';
  readonly supportsDelete = true;
  readonly supportsMessageDelete = true;

  async createMailbox(): Promise<ProviderMailbox> {
    // Step 1: Get available domains
    const domainsRes = await fetchWithRetry(`${BASE_URL}/domains`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!domainsRes.ok) {
      throw new Error(`Failed to fetch domains: ${domainsRes.status} ${domainsRes.statusText}`);
    }

    const domainsData = await domainsRes.json();
    const domains = domainsData['hydra:member'] || domainsData.member || domainsData;

    if (!Array.isArray(domains) || domains.length === 0) {
      throw new Error('No domains available from mail.tm');
    }

    const domain = domains[0].domain;

    // Step 2: Generate random username and password
    const usernameLength = 8 + Math.floor(Math.random() * 5); // 8-12 chars
    const username = generateRandomString(usernameLength);
    const address = `${username}@${domain}`;
    const password = generatePassword();

    // Step 3: Create account
    const accountRes = await fetchWithRetry(`${BASE_URL}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    });

    if (!accountRes.ok) {
      const errorBody = await accountRes.text();
      throw new Error(
        `Failed to create mail.tm account: ${accountRes.status} ${accountRes.statusText} - ${errorBody}`
      );
    }

    const accountData = await accountRes.json();
    const providerAccountId = accountData.id || accountData['@id']?.split('/').pop();

    // Step 4: Get auth token
    const tokenRes = await fetchWithRetry(`${BASE_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Failed to get mail.tm token: ${tokenRes.status} ${tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();

    return {
      email: address,
      providerAccountId: providerAccountId || '',
      token: tokenData.token,
      password,
      provider: this.name,
    };
  }

  async getMessages(mailbox: ProviderMailbox): Promise<ProviderMessage[]> {
    if (!mailbox.token) {
      throw new Error('No auth token available for mail.tm mailbox');
    }

    try {
      const res = await fetchWithRetry(`${BASE_URL}/messages?page=1`, {
        headers: authHeaders(mailbox.token),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch messages: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const messages = data['hydra:member'] || data.member || data || [];

      if (!Array.isArray(messages)) {
        return [];
      }

      return messages.map((msg: Record<string, unknown>) => ({
        id: String(msg.id || ''),
        from: {
          name: String(
            (msg.from as Record<string, unknown>)?.name || ''
          ),
          address: String(
            (msg.from as Record<string, unknown>)?.address || ''
          ),
        },
        subject: String(msg.subject || '(No Subject)'),
        intro: String(msg.intro || ''),
        createdAt: String(msg.createdAt || new Date().toISOString()),
        seen: Boolean(msg.seen),
        hasAttachments: Boolean(msg.hasAttachments),
      }));
    } catch (error) {
      console.error('[MailTmProvider] Error fetching messages:', error);
      throw error;
    }
  }

  async getMessage(
    mailbox: ProviderMailbox,
    messageId: string
  ): Promise<ProviderMessageDetail> {
    if (!mailbox.token) {
      throw new Error('No auth token available for mail.tm mailbox');
    }

    const res = await fetchWithRetry(`${BASE_URL}/messages/${messageId}`, {
      headers: authHeaders(mailbox.token),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch message ${messageId}: ${res.status} ${res.statusText}`
      );
    }

    const msg = await res.json();

    // html field can be an array in mail.tm responses
    let htmlContent = '';
    if (Array.isArray(msg.html)) {
      htmlContent = msg.html.join('');
    } else if (typeof msg.html === 'string') {
      htmlContent = msg.html;
    }

    return {
      id: String(msg.id || messageId),
      from: {
        name: String(msg.from?.name || ''),
        address: String(msg.from?.address || ''),
      },
      subject: String(msg.subject || '(No Subject)'),
      intro: String(msg.intro || ''),
      text: String(msg.text || ''),
      html: htmlContent,
      createdAt: String(msg.createdAt || new Date().toISOString()),
      seen: Boolean(msg.seen),
      hasAttachments: Boolean(msg.hasAttachments),
    };
  }

  async deleteMessage(
    mailbox: ProviderMailbox,
    messageId: string
  ): Promise<boolean> {
    if (!mailbox.token) {
      return false;
    }

    try {
      const res = await fetchWithRetry(`${BASE_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: authHeaders(mailbox.token),
      });
      return res.status === 204 || res.ok;
    } catch (error) {
      console.error('[MailTmProvider] Error deleting message:', error);
      return false;
    }
  }

  async deleteMailbox(mailbox: ProviderMailbox): Promise<boolean> {
    if (!mailbox.token || !mailbox.providerAccountId) {
      return false;
    }

    try {
      const res = await fetchWithRetry(
        `${BASE_URL}/accounts/${mailbox.providerAccountId}`,
        {
          method: 'DELETE',
          headers: authHeaders(mailbox.token),
        }
      );
      return res.status === 204 || res.ok;
    } catch (error) {
      console.error('[MailTmProvider] Error deleting mailbox:', error);
      return false;
    }
  }
}
