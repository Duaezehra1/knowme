import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bandage,
  Bird,
  BookOpen,
  Bus,
  Camera,
  Cat,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  CloudRain,
  Dog,
  Download,
  Ear,
  Fish,
  Flower2,
  HandHeart,
  Heart,
  HeartHandshake,
  House,
  IdCard,
  Layers,
  Leaf,
  Lock,
  MessageCircle,
  MessageCircleQuestionMark,
  Music,
  PenLine,
  Pencil,
  Phone,
  Plus,
  Printer,
  QrCode,
  Rabbit,
  Rainbow,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  Smile,
  Sparkles,
  Squirrel,
  Star,
  Stethoscope,
  Sun,
  Thermometer,
  Toilet,
  TrainFront,
  Trash,
  TriangleAlert,
  Turtle,
  Upload,
  Users,
  Utensils,
  Volume2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * One consistent icon set (Lucide) instead of emoji. Names match the "icon" fields
 * in shared/knowme.json, which the Android app maps to its own icons.
 */
const ICONS: Record<string, LucideIcon> = {
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  bandage: Bandage,
  bird: Bird,
  'book-open': BookOpen,
  bus: Bus,
  camera: Camera,
  cat: Cat,
  check: Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  clock: Clock,
  cloud: Cloud,
  'cloud-rain': CloudRain,
  dog: Dog,
  download: Download,
  ear: Ear,
  fish: Fish,
  flower: Flower2,
  'hand-heart': HandHeart,
  heart: Heart,
  'heart-handshake': HeartHandshake,
  house: House,
  'id-card': IdCard,
  layers: Layers,
  leaf: Leaf,
  lock: Lock,
  'message-circle': MessageCircle,
  'message-circle-question': MessageCircleQuestionMark,
  music: Music,
  'pen-line': PenLine,
  pencil: Pencil,
  phone: Phone,
  plus: Plus,
  printer: Printer,
  'qr-code': QrCode,
  rabbit: Rabbit,
  rainbow: Rainbow,
  refresh: RefreshCw,
  rocket: Rocket,
  'rotate-ccw': RotateCcw,
  search: Search,
  settings: Settings,
  'shield-check': ShieldCheck,
  siren: Siren,
  smile: Smile,
  sparkles: Sparkles,
  squirrel: Squirrel,
  star: Star,
  stethoscope: Stethoscope,
  sun: Sun,
  thermometer: Thermometer,
  toilet: Toilet,
  train: TrainFront,
  trash: Trash,
  alert: TriangleAlert,
  turtle: Turtle,
  upload: Upload,
  users: Users,
  utensils: Utensils,
  volume: Volume2,
  x: X,
  zap: Zap,
}

export function Icon({ name, size = 20, strokeWidth = 2, className }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const Component = ICONS[name] ?? Sparkles
  return <Component size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" focusable="false" />
}

/** An icon in a soft tinted circle: the visual language for sections and situations. */
export function IconBadge({ name, tone, size = 44 }: { name: string; tone: string; size?: number }) {
  return (
    <span className={`icon-badge tone-${tone}`} style={{ width: size, height: size }}>
      <Icon name={name} size={Math.round(size * 0.5)} strokeWidth={2.1} />
    </span>
  )
}

/** Illustrated avatars for families who'd rather not add a photo. Stored as "icon:colour". */
export const AVATAR_ICONS = ['smile', 'rabbit', 'cat', 'dog', 'bird', 'fish', 'turtle', 'squirrel', 'bus', 'train', 'rocket', 'rainbow', 'sun', 'star', 'flower', 'music']
export const AVATAR_COLOURS = ['teal', 'coral', 'sky', 'violet', 'gold', 'rose']

export function avatarParts(avatar: string | undefined, seed: string): { icon: string | null; colour: string } {
  const [icon, colour] = (avatar ?? '').split(':')
  const fallbackColour = AVATAR_COLOURS[(seed.charCodeAt(0) || 0) % AVATAR_COLOURS.length]
  return {
    icon: AVATAR_ICONS.includes(icon) ? icon : null,
    colour: AVATAR_COLOURS.includes(colour) ? colour : fallbackColour,
  }
}
