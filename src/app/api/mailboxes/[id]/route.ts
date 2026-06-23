import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/providers';
import { ProviderMailbox } from '@/lib/providers/types';

function normalizeMailboxName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 80);
}

// GET /api/mailboxes/[id] — Get a single mailbox
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mailbox = await prisma.tempMailbox.findUnique({
      where: { id },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!mailbox) {
      return NextResponse.json(
        { error: 'Mailbox not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(mailbox);
  } catch (error) {
    console.error('[GET /api/mailboxes/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mailbox' },
      { status: 500 }
    );
  }
}

// PATCH /api/mailboxes/[id] — Update mailbox metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = normalizeMailboxName(body?.name);

    const mailbox = await prisma.tempMailbox.update({
      where: { id },
      data: { name },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(mailbox);
  } catch (error) {
    console.error('[PATCH /api/mailboxes/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update mailbox' },
      { status: 500 }
    );
  }
}

// DELETE /api/mailboxes/[id] — Delete a mailbox
export async function DELETE(
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

    // Try to delete from provider if supported
    try {
      const provider = getProvider(mailbox.provider);
      if (provider.supportsDelete) {
        const providerMailbox: ProviderMailbox = {
          email: mailbox.email,
          providerAccountId: mailbox.providerAccountId || '',
          token: mailbox.token || undefined,
          password: mailbox.password || undefined,
          provider: mailbox.provider,
        };
        await provider.deleteMailbox(providerMailbox);
      }
    } catch (providerError) {
      // Log but don't fail — still delete from DB
      console.warn(
        '[DELETE /api/mailboxes/[id]] Provider deletion failed:',
        providerError
      );
    }

    // Delete from DB (cascade deletes messages)
    await prisma.tempMailbox.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Mailbox deleted' });
  } catch (error) {
    console.error('[DELETE /api/mailboxes/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete mailbox' },
      { status: 500 }
    );
  }
}
