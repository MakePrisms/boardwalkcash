import { ChevronLeft, X } from 'lucide-react';
import React, { useEffect } from 'react';
import {
  LinkWithViewTransition,
  type ViewTransitionLinkProps,
} from '~/lib/transitions';
import { cn } from '~/lib/utils';

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Page({ children, className, ...props }: PageProps) {
  // vh-100 includes the space behind the search bar on mobile browsers.
  // This sets the vh to be only the visible view port height.
  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  return (
    <div
      className={cn(
        'mx-auto flex h-[var(--vh)] w-full flex-col p-4 font-primary sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ClosePageButtonProps extends ViewTransitionLinkProps {}

export function ClosePageButton({ className, ...props }: ClosePageButtonProps) {
  return (
    <LinkWithViewTransition {...props}>
      <X />
    </LinkWithViewTransition>
  );
}

export interface PageBackButtonProps extends ViewTransitionLinkProps {}

export function PageBackButton({ className, ...props }: PageBackButtonProps) {
  return (
    <LinkWithViewTransition {...props}>
      <ChevronLeft />
    </LinkWithViewTransition>
  );
}

interface PageHeaderTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageHeaderTitle({
  children,
  className,
  ...props
}: PageHeaderTitleProps) {
  return (
    <h1
      className={cn('flex items-center justify-start text-xl', className)}
      {...props}
    >
      {children}
    </h1>
  );
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageHeader({ children, className, ...props }: PageHeaderProps) {
  const hasCloseButton = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === ClosePageButton,
  );
  const hasBackButton = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === PageBackButton,
  );

  if (hasCloseButton && hasBackButton) {
    throw new Error(
      'PageHeader cannot have both ClosePageButton and BackButton',
    );
  }

  return (
    <header
      className={cn('mb-4 flex w-full items-center justify-between', className)}
      {...props}
    >
      {/* Close/back button - always on the left */}
      <div>
        {React.Children.toArray(children).find(
          (child) =>
            React.isValidElement(child) &&
            (child.type === ClosePageButton || child.type === PageBackButton),
        )}
      </div>

      {/* Title - always in the center */}
      <div className="-translate-x-1/2 absolute left-1/2 transform">
        {React.Children.toArray(children).find(
          (child) =>
            React.isValidElement(child) && child.type === PageHeaderTitle,
        )}
      </div>

      {/* Other elements - on the right */}
      <div className="flex items-center justify-end gap-2">
        {React.Children.toArray(children).filter(
          (child) =>
            !React.isValidElement(child) ||
            (child.type !== PageHeaderTitle &&
              child.type !== ClosePageButton &&
              child.type !== PageBackButton),
        )}
      </div>
    </header>
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
    <main
      className={cn('flex flex-grow flex-col gap-2 p-2', className)}
      {...props}
    >
      {children}
    </main>
  );
}

interface PageFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageFooter({ children, className, ...props }: PageFooterProps) {
  return (
    <footer className={cn('flex flex-col gap-2 p-2', className)} {...props}>
      {children}
    </footer>
  );
}
