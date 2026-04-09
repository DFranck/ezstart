// Composed level — components using 1-3 other UI components

// Data Display
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../data-display/accordion.js'
export {
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
} from '../data-display/data-table.js'
export type {
  DataTableProps,
  DataTableColumnHeaderProps,
  DataTablePaginationProps,
} from '../data-display/data-table.js'
export { type ColumnDef, type SortingState, type ColumnFiltersState } from '@tanstack/react-table'

// Effects
export { ACarousel } from '../effects/aceternity-carousel.js'
export type { SlideData } from '../effects/aceternity-carousel.js'
export { Hero } from '../effects/hero.js'
export type { HeroProps } from '../effects/hero.js'
export { LampDemo, LampContainer } from '../effects/lamp.js'
export {
  MacbookScroll,
  Lid,
  Trackpad,
  Keypad,
  KBtn,
  SpeakerGrid,
  OptionKey,
} from '../effects/macbook-scroll.js'

// Feedback
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../feedback/alert-dialog.js'

// Forms
export { Checkbox } from '../forms/checkbox.js'
export type { CheckboxProps } from '../forms/checkbox.js'
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '../forms/form.js'
export { PasswordInput } from '../forms/password-input.js'
export type { PasswordRequirement, PasswordInputProps } from '../forms/password-input.js'

// Landing
export { CTA } from '../landing/cta.js'
export type { CTAProps } from '../landing/cta.js'

// Layout
export { Footer } from '../layout/footer.js'
export { Header } from '../layout/header.js'
export { MobileNavbar } from '../layout/mobile-navbar.js'
export { MobileNavMenu } from '../layout/mobile-nav-menu.js'
export { SplitSection, SplitSectionItem, splitSectionVariants } from '../layout/split-section.js'
export type { SplitSectionProps, SplitSectionItemProps } from '../layout/split-section.js'

// Media
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '../media/carousel.js'
export { IconGallery } from '../media/icon-gallery.js'
export type { IconGalleryItem } from '../media/icon-gallery.js'

// Navigation
export { BackButton } from '../navigation/back-button.js'
export type { BackButtonProps } from '../navigation/back-button.js'
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '../navigation/command.js'
export type { CommandGroupProps } from '../navigation/command.js'
export { Dropdown } from '../navigation/dropdown.js'
export type { DropdownItem, DropdownProps } from '../navigation/dropdown.js'

// Overlay
export {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelTitle,
  FloatingPanelDescription,
  FloatingPanelFooter,
} from '../overlay/floating-panel.js'
export type { FloatingPanelProps } from '../overlay/floating-panel.js'
export { WelcomeModal } from '../overlay/welcome-modal.js'
export type { WelcomeFeature, WelcomeModalProps } from '../overlay/welcome-modal.js'

// Root-level
export { Burger } from '../burger.js'

// Thread
export { ConversationItem } from '../thread/ConversationItem.js'
export { ThreadComposer } from '../thread/ThreadComposer.js'
export { ThreadMessage } from '../thread/ThreadMessage.js'
export { ThreadMessages } from '../thread/ThreadMessages.js'
export { ThreadSidebarToggle } from '../thread/ThreadSidebarToggle.js'

// Utility
export { LocaleSwitcher } from '../utility/locale-switcher.js'
export { PWAInstallPrompt } from '../utility/pwa-install-prompt.js'
export { ReadMoreText } from '../utility/read-more-text.js'
export { VersionSwitch } from '../utility/version-switch.js'
export type { VersionSwitchProps } from '../utility/version-switch.js'
