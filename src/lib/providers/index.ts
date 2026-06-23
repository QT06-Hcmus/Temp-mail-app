import { TempMailProvider } from './types';
import { MailTmProvider } from './mailtm';
import { OneSecMailProvider } from './onesecmail';

export function getProvider(name?: string): TempMailProvider {
  const providerName = name || process.env.TEMP_MAIL_PROVIDER || 'mailtm';
  switch (providerName) {
    case 'mailtm':
      return new MailTmProvider();
    case 'onesecmail':
      return new OneSecMailProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

export type {
  TempMailProvider,
  ProviderMailbox,
  ProviderMessage,
  ProviderMessageDetail,
} from './types';
