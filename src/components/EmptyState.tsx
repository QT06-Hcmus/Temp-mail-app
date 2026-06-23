'use client';

interface EmptyStateProps {
  icon?: 'mail' | 'inbox' | 'search';
  title: string;
  description?: string;
  children?: React.ReactNode;
}

function MailIcon() {
  return (
    <svg
      className="w-16 h-16 text-zinc-600"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      className="w-16 h-16 text-zinc-600"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v6.75m-19.5 0v4.5A2.25 2.25 0 004.5 19.5h15a2.25 2.25 0 002.25-2.25v-4.5"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="w-16 h-16 text-zinc-600"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

const iconMap = {
  mail: MailIcon,
  inbox: InboxIcon,
  search: SearchIcon,
};

export default function EmptyState({ icon = 'inbox', title, description, children }: EmptyStateProps) {
  const IconComponent = iconMap[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="p-6 rounded-full bg-zinc-900/50 border border-zinc-800 mb-6">
        <IconComponent />
      </div>
      <h3 className="text-xl font-semibold text-zinc-300 mb-2">{title}</h3>
      {description && (
        <p className="text-zinc-500 text-center max-w-md mb-6">{description}</p>
      )}
      {children}
    </div>
  );
}
