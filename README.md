# TempMail Manager 📧

A modern, full-featured temporary email management web application. Create real temporary email addresses, receive actual emails, view your inbox, and automatically detect OTP/verification codes.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![SQLite](https://img.shields.io/badge/SQLite-Prisma-003B57?style=flat-square&logo=sqlite)

## ✨ Features

- **Real Temporary Emails** — Create actual temporary email addresses via mail.tm or 1secmail APIs
- **Live Inbox** — Receive and read real emails with auto-refresh (every 5-10 seconds)
- **OTP/Code Detection** — Automatically detect and highlight verification codes, OTPs, and security codes
- **One-Click Copy** — Copy email addresses and detected codes instantly
- **HTML Email Rendering** — Safely render HTML emails with XSS protection
- **Provider Adapter Pattern** — Easily switch between email providers
- **Local Persistence** — SQLite database stores your mailboxes across sessions
- **Modern Dark UI** — Beautiful, responsive dark-themed interface
- **Windows One-Click Launch** — Double-click `run.bat` to start

## 🚀 Quick Start

### Option 1: Double-Click Launch (Windows)

1. Double-click `run.bat`
2. The script will automatically:
   - Check Node.js installation
   - Install dependencies (first run only)
   - Set up the database
   - Start the dev server
   - Open your browser at http://localhost:3000

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (optional - defaults work out of the box)
cp .env.example .env

# 3. Generate Prisma client and create database
npx prisma generate
npx prisma db push

# 4. Start development server
npm run dev
```

Then open http://localhost:3000 in your browser.

## ⚙️ Configuration

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite database path |
| `TEMP_MAIL_PROVIDER` | `mailtm` | Provider: `mailtm` or `onesecmail` |

### Email Providers

| Provider | Auth | Delete Support | Reliability |
|----------|------|----------------|-------------|
| **mail.tm** (default) | JWT token | ✅ Messages & Account | ⭐⭐⭐⭐ |
| **1secmail** (fallback) | None | ❌ Not supported | ⭐⭐⭐ |

To switch providers, update `TEMP_MAIL_PROVIDER` in `.env`:

```env
TEMP_MAIL_PROVIDER="onesecmail"
```

## 📁 Project Structure

```
temp-mail-app/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── mailboxes/     # API routes
│   │   ├── mailbox/
│   │   │   └── [id]/          # Mailbox detail & message pages
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Dashboard
│   ├── components/
│   │   ├── CodeBadge.tsx      # OTP code badge with copy
│   │   ├── EmptyState.tsx     # Empty state component
│   │   ├── LoadingSpinner.tsx  # Loading indicator
│   │   └── ToastProvider.tsx  # Toast notifications
│   └── lib/
│       ├── providers/
│       │   ├── types.ts       # Provider interface
│       │   ├── mailtm.ts      # mail.tm implementation
│       │   ├── onesecmail.ts  # 1secmail implementation
│       │   └── index.ts       # Provider factory
│       ├── api-client.ts      # HTTP client with retry
│       ├── otp-detector.ts    # OTP/code detection
│       └── prisma.ts          # Prisma singleton
├── .env.example               # Environment template
├── run.bat                    # Windows one-click launcher
└── README.md                  # This file
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/mailboxes` | List all mailboxes |
| `POST` | `/api/mailboxes` | Create new temp mail |
| `GET` | `/api/mailboxes/:id` | Get mailbox details |
| `DELETE` | `/api/mailboxes/:id` | Delete mailbox |
| `GET` | `/api/mailboxes/:id/messages` | Fetch inbox messages |
| `GET` | `/api/mailboxes/:id/messages/:msgId` | Read full email |
| `DELETE` | `/api/mailboxes/:id/messages/:msgId` | Delete email |

## 🔍 OTP/Code Detection

The app automatically detects these patterns in incoming emails:

- **Numeric codes**: 4-8 digit numbers (e.g., `123456`, `8472`)
- **Alphanumeric codes**: 4-10 character mixed codes (e.g., `A8K2P9`, `XYZ123`)
- **Keyword proximity**: Codes near keywords like "OTP", "verification code", "mã xác minh", "mã bảo mật"

Detected codes are displayed as highlighted badges with one-click copy functionality.

## ⚠️ Legal Disclaimer

> **This application is for legitimate testing and development purposes only.**
>
> - ✅ Testing email verification flows during development
> - ✅ QA testing of email-sending features
> - ✅ Personal temporary email needs
> - ❌ **DO NOT** use for spam, phishing, or unauthorized access
> - ❌ **DO NOT** use to bypass service terms or security measures
> - ❌ **DO NOT** use for any illegal or malicious activities
>
> Users are responsible for complying with all applicable laws and the terms of service of the email providers used.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: SQLite via Prisma ORM
- **Email APIs**: mail.tm, 1secmail
- **Sanitization**: DOMPurify (HTML email XSS protection)

## 📝 License

MIT — Use responsibly.
