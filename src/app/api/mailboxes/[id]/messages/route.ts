import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/providers';
import { ProviderMailbox } from '@/lib/providers/types';
import { detectCodes } from '@/lib/otp-detector';

// GET /api/mailboxes/[id]/messages — Fetch and sync messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mailbox = await prisma.tempMailbox.findUnique({
      where: { id },
    });

    if (!mailbox) {
      return NextResponse.json(
        { error: 'Mailbox not found' },
        { status: 404 }
      );
    }

    const providerMailbox: ProviderMailbox = {
      email: mailbox.email,
      providerAccountId: mailbox.providerAccountId || '',
      token: mailbox.token || undefined,
      password: mailbox.password || undefined,
      provider: mailbox.provider,
    };

    // Try to fetch fresh messages from provider
    let providerError: string | null = null;

    try {
      const provider = getProvider(mailbox.provider);
      const providerMessages = await provider.getMessages(providerMailbox);

      // Upsert each new message into the database
      for (const msg of providerMessages) {
        const textForDetection = msg.intro || msg.subject || '';
        const codes = detectCodes(textForDetection);

        await prisma.receivedMail.upsert({
          where: {
            mailboxId_providerMessageId: {
              mailboxId: mailbox.id,
              providerMessageId: msg.id,
            },
          },
          create: {
            mailboxId: mailbox.id,
            providerMessageId: msg.id,
            fromAddress: msg.from.address,
            fromName: msg.from.name,
            subject: msg.subject || '(No Subject)',
            preview: msg.intro || '',
            receivedAt: new Date(msg.createdAt),
            detectedCodes: JSON.stringify(codes),
            isRead: msg.seen,
          },
          update: {
            // Update read status if changed on provider side
            isRead: msg.seen,
          },
        });
      }
    } catch (error) {
      console.error(
        '[GET /api/mailboxes/[id]/messages] Provider error:',
        error
      );
      providerError =
        error instanceof Error
          ? error.message
          : 'Failed to fetch from provider';
    }

    // Return all messages from DB (includes both fresh and cached)
    const messages = await prisma.receivedMail.findMany({
      where: { mailboxId: id },
      orderBy: { receivedAt: 'desc' },
    });

    // Parse detectedCodes from JSON string
    const messagesWithParsedCodes = messages.map((msg) => ({
      ...msg,
      detectedCodes: JSON.parse(msg.detectedCodes || '[]'),
    }));

    return NextResponse.json({
      messages: messagesWithParsedCodes,
      ...(providerError ? { warning: providerError } : {}),
    });
  } catch (error) {
    console.error('[GET /api/mailboxes/[id]/messages] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
