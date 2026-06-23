import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/providers';

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

    try {
      const body = await request.json();
      providerName = body?.provider;
    } catch {
      // No body or invalid JSON — use default provider
    }

    const provider = getProvider(providerName);
    const mailboxData = await provider.createMailbox();

    const mailbox = await prisma.tempMailbox.create({
      data: {
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
