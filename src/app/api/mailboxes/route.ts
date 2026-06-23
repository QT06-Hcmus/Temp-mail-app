import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProviderFallbacks, ProviderMailbox } from '@/lib/providers';

function normalizeMailboxName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 80);
}

// GET /api/mailboxes — List all mailboxes
export async function GET() {
  try {
    const mailboxes = await prisma.tempMailbox.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(mailboxes);
  } catch (error) {
    console.error('[GET /api/mailboxes] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mailboxes' },
      { status: 500 }
    );
  }
}

// POST /api/mailboxes — Create a new mailbox
export async function POST(request: NextRequest) {
  try {
    let providerName: string | undefined;
    let mailboxName = '';

    try {
      const body = await request.json();
      providerName = body?.provider;
      mailboxName = normalizeMailboxName(body?.name);
    } catch {
      // No body or invalid JSON — use default provider
    }

    const errors: string[] = [];
    let mailboxData: ProviderMailbox | undefined;

    for (const provider of getProviderFallbacks(providerName)) {
      try {
        mailboxData = await provider.createMailbox();
        break;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown provider error';
        errors.push(`${provider.name}: ${message}`);
        console.warn(
          `[POST /api/mailboxes] Provider ${provider.name} failed, trying next fallback:`,
          error
        );
      }
    }

    if (!mailboxData) {
      throw new Error(`All temp-mail providers failed: ${errors.join(' | ')}`);
    }

    const mailbox = await prisma.tempMailbox.create({
      data: {
        name: mailboxName,
        email: mailboxData.email,
        provider: mailboxData.provider,
        providerAccountId: mailboxData.providerAccountId || null,
        token: mailboxData.token || null,
        password: mailboxData.password || null,
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(mailbox, { status: 201 });
  } catch (error) {
    console.error('[POST /api/mailboxes] Error:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create mailbox';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
