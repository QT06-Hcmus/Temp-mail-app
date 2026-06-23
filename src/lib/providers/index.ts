import { TempMailProvider } from './types';
import { MailTmProvider } from './mailtm';
import { OneSecMailProvider } from './onesecmail';
import { TempMailPlusProvider } from './tempmailplus';

export function getProvider(name?: string): TempMailProvider {
  const providerName = name || process.env.TEMP_MAIL_PROVIDER || 'tempmailplus';
  switch (providerName) {
    case 'mailtm':
      return new MailTmProvider();
    case 'onesecmail':
      return new OneSecMailProvider();
    case 'tempmailplus':
      return new TempMailPlusProvider();
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
