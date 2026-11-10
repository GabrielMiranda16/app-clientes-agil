import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export const PainelLateral = ({ open, onOpenChange, title, children }) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="right"
      overlayClassName="bg-black/20"
      className="bg-white w-full sm:max-w-[480px] p-0 flex flex-col gap-0 overflow-hidden sm:rounded-l-[32px] border-l-0"
      style={{ fontFamily: "'DM Sans', sans-serif", '--background': '0 0% 100%' }}
    >
      <SheetHeader className="px-6 py-5 border-b border-gray-100 text-left space-y-0">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>
);

export const PainelCorpo = ({ className, children }) => (
  <div className={cn('flex-1 min-h-0 overflow-y-auto px-6 py-5', className)}>{children}</div>
);

export const PainelRodape = ({ className, children }) => (
  <div className={cn('flex justify-end gap-2 px-6 py-4 border-t border-gray-100', className)}>{children}</div>
);
