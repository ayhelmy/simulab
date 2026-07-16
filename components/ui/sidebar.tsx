'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { PanelLeft } from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Utilities ─────────────────────────────────────────────────────────────────

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Mobile detection ──────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SIDEBAR_COOKIE_NAME = 'sidebar:state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3.5rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

// ── Context ───────────────────────────────────────────────────────────────────

type SidebarContextType = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider.');
  return context;
}

// ── SidebarProvider ───────────────────────────────────────────────────────────

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;

    const setOpen = React.useCallback(
      (value: boolean | ((v: boolean) => boolean)) => {
        const next = typeof value === 'function' ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(next);
        } else {
          _setOpen(next);
        }
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open],
    );

    const toggleSidebar = React.useCallback(
      () => (isMobile ? setOpenMobile((v) => !v) : setOpen((v) => !v)),
      [isMobile, setOpen],
    );

    React.useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [toggleSidebar]);

    const state = open ? 'expanded' : 'collapsed';

    const ctx = React.useMemo<SidebarContextType>(
      () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
      [state, open, setOpen, isMobile, openMobile, toggleSidebar],
    );

    return (
      <SidebarContext.Provider value={ctx}>
        <TooltipPrimitive.Provider delayDuration={0}>
          <div
            ref={ref}
            style={
              {
                '--sidebar-width': SIDEBAR_WIDTH,
                '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
                /* Brand sidebar palette (dark navy) */
                '--sidebar-background': '222 38% 12%',
                '--sidebar-foreground': '215 20% 88%',
                '--sidebar-primary': '33 91% 55%',
                '--sidebar-primary-foreground': '0 0% 100%',
                '--sidebar-accent': '222 30% 20%',
                '--sidebar-accent-foreground': '0 0% 100%',
                '--sidebar-border': '222 25% 22%',
                '--sidebar-ring': '33 91% 55%',
                '--background': '0 0% 98%',
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              'group/sidebar-wrapper flex min-h-screen w-full',
              className,
            )}
            {...props}
          >
            {children}
          </div>
        </TooltipPrimitive.Provider>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = 'SidebarProvider';

// ── Sidebar ───────────────────────────────────────────────────────────────────

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'sidebar' | 'floating' | 'inset';
    collapsible?: 'offcanvas' | 'icon' | 'none';
  }
>(
  (
    {
      side = 'left',
      variant = 'sidebar',
      collapsible = 'offcanvas',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === 'none') {
      return (
        <div
          className={cn(
            'flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground',
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <>
          {openMobile && (
            <div
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setOpenMobile(false)}
            />
          )}
          <div
            data-sidebar="sidebar"
            data-mobile="true"
            style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
            className={cn(
              'fixed inset-y-0 z-50 flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300',
              side === 'left' ? 'left-0' : 'right-0',
              openMobile
                ? 'translate-x-0'
                : side === 'left'
                ? '-translate-x-full'
                : 'translate-x-full',
              className,
            )}
            {...props}
          >
            {children}
          </div>
        </>
      );
    }

    return (
      <div
        ref={ref}
        className="group peer hidden text-sidebar-foreground md:block"
        data-state={state}
        data-collapsible={state === 'collapsed' ? collapsible : ''}
        data-variant={variant}
        data-side={side}
      >
        {/* Width-reserving spacer */}
        <div
          className={cn(
            'relative h-screen w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear',
            'group-data-[collapsible=offcanvas]:w-0',
            variant === 'floating' || variant === 'inset'
              ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)]'
              : 'group-data-[collapsible=icon]:w-[--sidebar-width-icon]',
          )}
        />
        {/* Fixed panel */}
        <div
          className={cn(
            'fixed inset-y-0 z-10 hidden h-screen w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex',
            side === 'left'
              ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
              : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
            variant === 'floating' || variant === 'inset'
              ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem+2px)]'
              : 'group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l',
            'border-sidebar-border',
            className,
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className="flex h-full w-full flex-col bg-sidebar"
          >
            {children}
          </div>
        </div>
      </div>
    );
  },
);
Sidebar.displayName = 'Sidebar';

// ── SidebarTrigger ────────────────────────────────────────────────────────────

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      ref={ref}
      data-sidebar="trigger"
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100 transition-colors',
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
});
SidebarTrigger.displayName = 'SidebarTrigger';

// ── SidebarRail ───────────────────────────────────────────────────────────────

export const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'>
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear',
        'after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border',
        'group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex',
        '[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar',
        '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
        '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        className,
      )}
      {...props}
    />
  );
});
SidebarRail.displayName = 'SidebarRail';

// ── SidebarInset ──────────────────────────────────────────────────────────────

export const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'main'>
>(({ className, ...props }, ref) => (
  <main
    ref={ref as React.Ref<HTMLElement>}
    className={cn(
      'relative flex min-h-screen flex-1 flex-col bg-background',
      className,
    )}
    {...props}
  />
));
SidebarInset.displayName = 'SidebarInset';

// ── SidebarInput ──────────────────────────────────────────────────────────────

export const SidebarInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    data-sidebar="input"
    className={cn(
      'h-8 w-full rounded-md border border-sidebar-border bg-sidebar px-3 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus:ring-2 focus:ring-sidebar-ring',
      className,
    )}
    {...props}
  />
));
SidebarInput.displayName = 'SidebarInput';

// ── SidebarHeader ─────────────────────────────────────────────────────────────

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="header"
    className={cn('flex flex-col gap-2 p-2', className)}
    {...props}
  />
));
SidebarHeader.displayName = 'SidebarHeader';

// ── SidebarFooter ─────────────────────────────────────────────────────────────

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="footer"
    className={cn('flex flex-col gap-2 p-2', className)}
    {...props}
  />
));
SidebarFooter.displayName = 'SidebarFooter';

// ── SidebarSeparator ──────────────────────────────────────────────────────────

export const SidebarSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="separator"
    className={cn('mx-2 h-px bg-sidebar-border', className)}
    {...props}
  />
));
SidebarSeparator.displayName = 'SidebarSeparator';

// ── SidebarContent ────────────────────────────────────────────────────────────

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="content"
    className={cn(
      'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
      className,
    )}
    {...props}
  />
));
SidebarContent.displayName = 'SidebarContent';

// ── SidebarGroup ──────────────────────────────────────────────────────────────

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group"
    className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
    {...props}
  />
));
SidebarGroup.displayName = 'SidebarGroup';

// ── SidebarGroupLabel ─────────────────────────────────────────────────────────

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 transition-[margin,opacity] duration-200 ease-linear',
        'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

// ── SidebarGroupAction ────────────────────────────────────────────────────────

export const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        'absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  );
});
SidebarGroupAction.displayName = 'SidebarGroupAction';

// ── SidebarGroupContent ───────────────────────────────────────────────────────

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn('w-full text-sm', className)}
    {...props}
  />
));
SidebarGroupContent.displayName = 'SidebarGroupContent';

// ── SidebarMenu ───────────────────────────────────────────────────────────────

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}
    {...props}
  />
));
SidebarMenu.displayName = 'SidebarMenu';

// ── SidebarMenuItem ───────────────────────────────────────────────────────────

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn('group/menu-item relative', className)}
    {...props}
  />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

// ── SidebarMenuButton ─────────────────────────────────────────────────────────

const sidebarMenuButtonVariants = cva(
  [
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring',
    'transition-[width,height,padding] duration-150',
    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground',
    'disabled:pointer-events-none disabled:opacity-50',
    'data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary',
    'group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center',
    '[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-none',
    '[&>span:last-child]:truncate',
    '[&>.anticon]:size-4 [&>.anticon]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: '',
        outline:
          'bg-sidebar shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:!p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipPrimitive.Content>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = 'default',
      size = 'default',
      tooltip,
      className,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const { isMobile, state } = useSidebar();

    const btn = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    if (!tooltip) return btn;

    const tooltipProps =
      typeof tooltip === 'string' ? { children: tooltip } : tooltip;

    return (
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{btn}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            align="center"
            hidden={state !== 'collapsed' || isMobile}
            className="z-50 rounded-md bg-white px-3 py-1.5 text-xs text-gray-900 shadow-md border border-gray-100"
            {...tooltipProps}
          />
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  },
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

// ── SidebarMenuAction ─────────────────────────────────────────────────────────

export const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { asChild?: boolean; showOnHover?: boolean }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        'absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2',
        'peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        showOnHover &&
          'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0',
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = 'SidebarMenuAction';

// ── SidebarMenuBadge ──────────────────────────────────────────────────────────

export const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      'pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground',
      'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
      'peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5',
      'group-data-[collapsible=icon]:hidden',
      className,
    )}
    {...props}
  />
));
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

// ── SidebarMenuSub ────────────────────────────────────────────────────────────

export const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5',
      'group-data-[collapsible=icon]:hidden',
      className,
    )}
    {...props}
  />
));
SidebarMenuSub.displayName = 'SidebarMenuSub';

// ── SidebarMenuSubItem ────────────────────────────────────────────────────────

export const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ ...props }, ref) => <li ref={ref} {...props} />);
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem';

// ── SidebarMenuSubButton ──────────────────────────────────────────────────────

export const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<'a'> & {
    asChild?: boolean;
    size?: 'sm' | 'md';
    isActive?: boolean;
  }
>(({ asChild = false, size = 'md', isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';
