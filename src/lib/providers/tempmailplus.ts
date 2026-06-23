import { fetchWithRetry } from '../api-client';
import {
  TempMailProvider,
  ProviderMailbox,
  ProviderMessage,
  ProviderMessageDetail,
} from './types';

const BASE_URL = 'https://tempmail.plus/api';

const TEMP_MAIL_DOMAINS = [
  'mailto.plus',
  'fexpost.com',
  'fexbox.org',
  'mailbox.in.ua',
  'rover.info',
  'chitthi.in',
  'fextemp.com',
  'any.pink',
  'merepost.com',
];

const DEFAULT_HEADERS = {
  'sec-ch-ua-platform': '"macOS"',
  'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
  'sec-ch-ua-mobile': '?0',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'DNT': '1',
};

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class TempMailPlusProvider implements TempMailProvider {
  readonly name = 'tempmailplus';
  readonly supportsDelete = false;
  readonly supportsMessageDelete = true;

  async createMailbox(): Promise<ProviderMailbox> {
    const username = generateRandomString(10);
    const domain = TEMP_MAIL_DOMAINS[Math.floor(Math.random() * TEMP_MAIL_DOMAINS.length)];
    const email = `${username}@${domain}`;

    return {
      email,
      providerAccountId: username,
      provider: this.name,
    };
  }

  async getMessages(mailbox: ProviderMailbox): Promise<ProviderMessage[]> {
    const username = mailbox.providerAccountId || mailbox.email.split('@')[0];
    try {
      const res = await fetchWithRetry(
        `${BASE_URL}/mails?email=${encodeURIComponent(username)}&limit=20&page=1`,
        { headers: DEFAULT_HEADERS }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch messages: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const mailList = data.mail_list || [];

      if (!Array.isArray(mailList)) {
        return [];
      }

      return mailList.map((msg: any) => ({
        id: String(msg.id || ''),
        from: {
          name: '',
          address: String(msg.from || ''),
        },
        subject: String(msg.subject || '(No Subject)'),
        intro: String(msg.subject || ''),
        createdAt: String(msg.date || new Date().toISOString()),
        seen: Boolean(msg.is_seen),
        hasAttachments: Boolean(msg.attachments),
      }));
    } catch (error) {
      console.error('[TempMailPlusProvider] Error fetching messages:', error);
      throw error;
    }
  }

  async getMessage(
    mailbox: ProviderMailbox,
    messageId: string
  ): Promise<ProviderMessageDetail> {
    const username = mailbox.providerAccountId || mailbox.email.split('@')[0];
    const res = await fetchWithRetry(
      `${BASE_URL}/mails/${messageId}?email=${encodeURIComponent(username)}`,
      { headers: DEFAULT_HEADERS }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch message ${messageId}: ${res.status} ${res.statusText}`);
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
      text: String(msg.text || ''),
      html: String(msg.html || msg.text || ''),
      createdAt: String(msg.date || new Date().toISOString()),
      seen: Boolean(msg.is_seen),
      hasAttachments: Array.isArray(msg.attachments) && msg.attachments.length > 0,
    };
  }

  async deleteMessage(
    mailbox: ProviderMailbox,
    messageId: string
  ): Promise<boolean> {
    const username = mailbox.providerAccountId || mailbox.email.split('@')[0];
    try {
      const res = await fetchWithRetry(
        `${BASE_URL}/mails/${messageId}?email=${encodeURIComponent(username)}`,
        {
          method: 'DELETE',
          headers: DEFAULT_HEADERS,
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.result);
    } catch (error) {
      console.error('[TempMailPlusProvider] Error deleting message:', error);
      return false;
    }
  }

  async deleteMailbox(_mailbox: ProviderMailbox): Promise<boolean> {
    return true; // Stateless
  }
}
