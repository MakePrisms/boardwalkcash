import { cn } from '~/lib/utils';

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Page({ children, className, ...props }: PageProps) {
  return (
    <div
      className={cn(
        'mx-auto h-full w-full px-4 py-4 sm:w-2/3 sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageHeader({ children, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2 p-2', className)} {...props}>
      {children}
    </div>
  );
}

interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageContent({
  children,
  className,
  ...props
}: PageContentProps) {
  return (
    <div className={cn('flex flex-col gap-2 p-2', className)} {...props}>
      {children}
    </div>
  );
}

interface PageFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageFooter({ children, className, ...props }: PageFooterProps) {
  return (
    <div className={cn('flex flex-col gap-2 p-2', className)} {...props}>
      {children}
    </div>
  );
}
