import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/providers';
import { ProviderMailbox } from '@/lib/providers/types';
import { detectCodes } from '@/lib/otp-detector';

// GET /api/mailboxes/[id]/messages/[messageId] — Get full message detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;

    const message = await prisma.receivedMail.findFirst({
      where: {
        id: messageId,
        mailboxId: id,
      },
      include: {
        mailbox: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // If body content is empty, fetch full detail from provider
    const needsFullContent = !message.textBody && !message.htmlBody;

    if (needsFullContent) {
      try {
        const provider = getProvider(message.mailbox.provider);
        const providerMailbox: ProviderMailbox = {
          email: message.mailbox.email,
          providerAccountId: message.mailbox.providerAccountId || '',
          token: message.mailbox.token || undefined,
          password: message.mailbox.password || undefined,
          provider: message.mailbox.provider,
        };

        const fullMessage = await provider.getMessage(
          providerMailbox,
          message.providerMessageId
        );

        // Run OTP detection on the full text content
        const textContent = fullMessage.text || '';
        const codes = detectCodes(textContent);

        // Update DB with full content and detected codes
        await prisma.receivedMail.update({
          where: { id: messageId },
          data: {
            textBody: fullMessage.text || '',
            htmlBody: fullMessage.html || '',
            detectedCodes: JSON.stringify(codes),
            isRead: true,
          },
        });

        // Return the enriched message
        const { mailbox: _mailbox, ...messageData } = message;
        return NextResponse.json({
          ...messageData,
          textBody: fullMessage.text || '',
          htmlBody: fullMessage.html || '',
          detectedCodes: codes,
          isRead: true,
        });
      } catch (error) {
        console.error(
          '[GET /api/mailboxes/[id]/messages/[messageId]] Provider error:',
          error
        );
        // Fall through and return what we have from DB
      }
    }

    // Mark as read
    if (!message.isRead) {
      await prisma.receivedMail.update({
        where: { id: messageId },
        data: { isRead: true },
      });
    }

    const { mailbox: _mailbox, ...messageData } = message;
    return NextResponse.json({
      ...messageData,
      detectedCodes: JSON.parse(message.detectedCodes || '[]'),
      isRead: true,
    });
  } catch (error) {
    console.error(
      '[GET /api/mailboxes/[id]/messages/[messageId]] Error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch message' },
      { status: 500 }
    );
  }
}

// DELETE /api/mailboxes/[id]/messages/[messageId] — Delete a message
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;

    const message = await prisma.receivedMail.findFirst({
      where: {
        id: messageId,
        mailboxId: id,
      },
      include: {
        mailbox: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Try to delete from provider
    try {
      const provider = getProvider(message.mailbox.provider);
      if (provider.supportsMessageDelete) {
        const providerMailbox: ProviderMailbox = {
          email: message.mailbox.email,
          providerAccountId: message.mailbox.providerAccountId || '',
          token: message.mailbox.token || undefined,
          password: message.mailbox.password || undefined,
          provider: message.mailbox.provider,
        };
        await provider.deleteMessage(providerMailbox, message.providerMessageId);
      }
    } catch (providerError) {
      console.warn(
        '[DELETE /api/mailboxes/[id]/messages/[messageId]] Provider deletion failed:',
        providerError
      );
    }

    // Delete from DB
    await prisma.receivedMail.delete({
      where: { id: messageId },
    });

    return NextResponse.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    console.error(
      '[DELETE /api/mailboxes/[id]/messages/[messageId]] Error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
