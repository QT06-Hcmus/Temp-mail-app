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

interface TempMailPlusMessage {
  id?: string | number;
  mail_id?: string | number;
  from?: string;
  from_mail?: string;
  from_name?: string;
  subject?: string;
  date?: string;
  time?: string;
  is_seen?: boolean;
  is_new?: boolean;
  attachments?: unknown;
  attachment_count?: number;
}

interface TempMailPlusMessageDetail extends TempMailPlusMessage {
  html?: string;
  text?: string;
}

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getMailboxAddress(mailbox: ProviderMailbox): string {
  return mailbox.email || mailbox.providerAccountId;
}

function getMessageId(msg: TempMailPlusMessage): string {
  return String(msg.mail_id ?? msg.id ?? '');
}

function getMessageDate(msg: TempMailPlusMessage): string {
  return String(msg.date ?? msg.time ?? new Date().toISOString());
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
      providerAccountId: email,
      provider: this.name,
    };
  }

  async getMessages(mailbox: ProviderMailbox): Promise<ProviderMessage[]> {
    const email = getMailboxAddress(mailbox);

    try {
      const res = await fetchWithRetry(
        `${BASE_URL}/mails?email=${encodeURIComponent(email)}&limit=20&page=1`,
        { headers: DEFAULT_HEADERS }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch messages: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as { mail_list?: TempMailPlusMessage[] };
      const mailList = data.mail_list || [];

      if (!Array.isArray(mailList)) {
        return [];
      }

      return mailList.map((msg) => ({
        id: getMessageId(msg),
        from: {
          name: String(msg.from_name || ''),
          address: String(msg.from_mail || msg.from || ''),
        },
        subject: String(msg.subject || '(No Subject)'),
        intro: String(msg.subject || ''),
        createdAt: getMessageDate(msg),
        seen: typeof msg.is_seen === 'boolean' ? msg.is_seen : !Boolean(msg.is_new),
        hasAttachments:
          Boolean(msg.attachments) || Number(msg.attachment_count || 0) > 0,
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
    const email = getMailboxAddress(mailbox);
    const res = await fetchWithRetry(
      `${BASE_URL}/mails/${messageId}?email=${encodeURIComponent(email)}`,
      { headers: DEFAULT_HEADERS }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch message ${messageId}: ${res.status} ${res.statusText}`);
    }

    const msg = (await res.json()) as TempMailPlusMessageDetail;

    return {
      id: getMessageId(msg) || messageId,
      from: {
        name: String(msg.from_name || ''),
        address: String(msg.from_mail || msg.from || ''),
      },
      subject: String(msg.subject || '(No Subject)'),
      intro: String(msg.subject || ''),
      text: String(msg.text || ''),
      html: String(msg.html || msg.text || ''),
      createdAt: getMessageDate(msg),
      seen: typeof msg.is_seen === 'boolean' ? msg.is_seen : !Boolean(msg.is_new),
      hasAttachments:
        (Array.isArray(msg.attachments) && msg.attachments.length > 0) ||
        Number(msg.attachment_count || 0) > 0,
    };
  }

  async deleteMessage(
    mailbox: ProviderMailbox,
    messageId: string
  ): Promise<boolean> {
    const email = getMailboxAddress(mailbox);

    try {
      const res = await fetchWithRetry(
        `${BASE_URL}/mails/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: new URLSearchParams({ email, epin: '' }).toString(),
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
