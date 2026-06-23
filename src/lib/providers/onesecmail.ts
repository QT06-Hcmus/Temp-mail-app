import { fetchWithRetry } from '../api-client';
import {
  TempMailProvider,
  ProviderMailbox,
  ProviderMessage,
  ProviderMessageDetail,
} from './types';

const BASE_URL = 'https://www.1secmail.com/api/v1/';

function splitEmail(email: string): { login: string; domain: string } {
  const [login, domain] = email.split('@');
  if (!login || !domain) {
    throw new Error(`Invalid email format: ${email}`);
  }
  return { login, domain };
}

export class OneSecMailProvider implements TempMailProvider {
  readonly name = 'onesecmail';
  readonly supportsDelete = false;
  readonly supportsMessageDelete = false;

  async createMailbox(): Promise<ProviderMailbox> {
    const res = await fetchWithRetry(
      `${BASE_URL}?action=genRandomMailbox&count=1`
    );

    if (!res.ok) {
      throw new Error(
        `Failed to generate mailbox: ${res.status} ${res.statusText}`
      );
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('1secmail returned no mailbox addresses');
    }

    const email = data[0];
    const { login } = splitEmail(email);

    return {
      email,
      providerAccountId: login,
      provider: this.name,
    };
  }

  async getMessages(mailbox: ProviderMailbox): Promise<ProviderMessage[]> {
    const { login, domain } = splitEmail(mailbox.email);

    try {
      const res = await fetchWithRetry(
        `${BASE_URL}?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`
      );

      if (!res.ok) {
        throw new Error(
          `Failed to fetch messages: ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((msg: Record<string, unknown>) => ({
        id: String(msg.id || ''),
        from: {
          name: '',
          address: String(msg.from || ''),
        },
        subject: String(msg.subject || '(No Subject)'),
        intro: String(msg.subject || ''),
        createdAt: String(msg.date || new Date().toISOString()),
        seen: false,
        hasAttachments: false,
      }));
    } catch (error) {
      console.error('[OneSecMailProvider] Error fetching messages:', error);
      throw error;
    }
  }

  async getMessage(
    mailbox: ProviderMailbox,
    messageId: string
  ): Promise<ProviderMessageDetail> {
    const { login, domain } = splitEmail(mailbox.email);

    const res = await fetchWithRetry(
      `${BASE_URL}?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(messageId)}`
    );

    if (!res.ok) {
      throw new Error(
        `Failed to fetch message ${messageId}: ${res.status} ${res.statusText}`
      );
    }

    const msg = await res.json();

    return {
      id: String(msg.id || messageId),
      from: {
        name: '',
        address: String(msg.from || ''),
      },
      subject: String(msg.subject || '(No Subject)'),
      intro: String(msg.subject || ''),
      text: String(msg.textBody || msg.body || ''),
      html: String(msg.htmlBody || msg.body || ''),
      createdAt: String(msg.date || new Date().toISOString()),
      seen: true,
      hasAttachments: Array.isArray(msg.attachments) && msg.attachments.length > 0,
    };
  }

  async deleteMessage(
    _mailbox: ProviderMailbox,
    _messageId: string
  ): Promise<boolean> {
    // 1secmail does not support message deletion
    return false;
  }

  async deleteMailbox(_mailbox: ProviderMailbox): Promise<boolean> {
    // 1secmail does not support mailbox deletion
    return false;
  }
}
