export interface ProviderMailbox {
  email: string;
  providerAccountId: string;
  token?: string;
  password?: string;
  provider: string;
}

export interface ProviderMessage {
  id: string;
  from: { name: string; address: string };
  subject: string;
  intro: string;
  createdAt: string;
  seen: boolean;
  hasAttachments: boolean;
}

export interface ProviderMessageDetail extends ProviderMessage {
  text: string;
  html: string;
}

export interface TempMailProvider {
  readonly name: string;
  createMailbox(): Promise<ProviderMailbox>;
  getMessages(mailbox: ProviderMailbox): Promise<ProviderMessage[]>;
  getMessage(mailbox: ProviderMailbox, messageId: string): Promise<ProviderMessageDetail>;
  deleteMessage(mailbox: ProviderMailbox, messageId: string): Promise<boolean>;
  deleteMailbox(mailbox: ProviderMailbox): Promise<boolean>;
  supportsDelete: boolean;
  supportsMessageDelete: boolean;
}
