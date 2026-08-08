import type * as React from 'react';

declare module '@radix-ui/react-dropdown-menu' {
  interface DropdownMenuSubTriggerProps
    extends React.HTMLAttributes<HTMLDivElement> {
    disabled?: boolean;
    textValue?: string;
  }

  interface DropdownMenuSubContentProps
    extends React.HTMLAttributes<HTMLDivElement> {}

  interface DropdownMenuItemProps
    extends React.HTMLAttributes<HTMLDivElement> {
    disabled?: boolean;
    textValue?: string;
    onSelect?: (event: Event) => void;
  }

  interface DropdownMenuCheckboxItemProps
    extends DropdownMenuItemProps {
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (checked: boolean) => void;
  }

  interface DropdownMenuRadioItemProps
    extends DropdownMenuItemProps {
    value: string;
  }

  interface DropdownMenuLabelProps
    extends React.HTMLAttributes<HTMLDivElement> {}

  interface DropdownMenuSeparatorProps
    extends React.HTMLAttributes<HTMLDivElement> {}
}

export {};
