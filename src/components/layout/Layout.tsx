import React from 'react';
import { cn } from '../../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  navigation?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  navigation,
  header,
  className
}) => {
  return (
    <div
      className={cn("min-h-screen flex flex-col font-inter bg-cover bg-top bg-no-repeat bg-fixed relative", className)}
      style={{
        backgroundImage: "url('/images/background.png')",
      }}
    >
      {/* Overlay dla lepszej czytelności */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Area (Sticky on top or just regular top bar) */}
        {navigation && (
          <div className="sticky top-0 z-40 w-full">
            {navigation}
          </div>
        )}

        {/* Main Header Area (Logo, Global Controls) */}
        {header && (
          <header className="w-full">
            {header}
          </header>
        )}

        {/* Main Content Area */}
        <div className="flex-1 w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export const LayoutSection: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = ({ children, className, title }) => {
  return (
    <section className={cn("mb-8", className)}>
      {title && (
        <h2 className="text-xl font-bold mb-4 text-foreground font-adlam tracking-wide">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
};

