import { TempMailProvider } from './types';
import { MailTmProvider } from './mailtm';
import { OneSecMailProvider } from './onesecmail';
import { TempMailPlusProvider } from './tempmailplus';

const DEFAULT_PROVIDER = 'tempmailplus';
const FALLBACK_PROVIDER_ORDER = ['tempmailplus', 'mailtm', 'onesecmail'] as const;

type ProviderName = (typeof FALLBACK_PROVIDER_ORDER)[number];

function isProviderName(name: string): name is ProviderName {
  return FALLBACK_PROVIDER_ORDER.includes(name as ProviderName);
}

function resolveProviderName(name?: string): ProviderName {
  const providerName = name || process.env.TEMP_MAIL_PROVIDER || DEFAULT_PROVIDER;

  if (!isProviderName(providerName)) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  return providerName;
}

export function getProvider(name?: string): TempMailProvider {
  const providerName = resolveProviderName(name);

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

export function getProviderFallbacks(name?: string): TempMailProvider[] {
  const preferredProvider = resolveProviderName(name);
  const providerNames = [
    preferredProvider,
    ...FALLBACK_PROVIDER_ORDER.filter((providerName) => providerName !== preferredProvider),
  ];

  return providerNames.map((providerName) => getProvider(providerName));
}

export type {
  TempMailProvider,
  ProviderMailbox,
  ProviderMessage,
  ProviderMessageDetail,
} from './types';
