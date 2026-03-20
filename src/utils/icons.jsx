/**
 * Centralized icon system — powered by lucide-react.
 * Change an icon here once and it updates everywhere.
 */

import {
  Trash2,
  Pencil,
  X,
  ArrowLeft,
  ArrowRight,
  Send,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Plus,
  Minus,
  MoreVertical,
  Undo2,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Star,
  Flag,
  Camera,
  Image,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Link,
  Moon,
  Sun,
  Settings,
  Menu,
  User,
  LogOut,
  LogIn,
  Bell,
  Eye,
  EyeOff,
  Check,
  Clock,
  Calendar,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Smile,
  Flame,
  ThumbsUp,
  Mail,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Music,
  Upload,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// SEMANTIC ICON MAP
// ─────────────────────────────────────────────────────────────────

export const Icons = {
  // Actions
  delete: Trash2,
  edit: Pencil,
  close: X,
  back: ArrowLeft,
  forward: ArrowRight,
  send: Send,
  add: Plus,
  remove: Minus,
  menu: MoreVertical,
  undo: Undo2,
  shuffle: RefreshCw,

  // Status/Feedback
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
  question: HelpCircle,
  check: Check,

  // Engagement
  like: ThumbsUp,
  heart: Heart,
  comment: MessageCircle,
  share: Share2,
  bookmark: Bookmark,
  star: Star,
  flag: Flag,

  // Media
  camera: Camera,
  photo: Image,
  play: Play,
  pause: Pause,
  volumeUp: Volume2,
  volumeMute: VolumeX,
  download: Download,
  link: Link,

  // Theme/Settings
  moon: Moon,
  sun: Sun,
  settings: Settings,
  hamburger: Menu,

  // User/Auth
  user: User,
  logout: LogOut,
  login: LogIn,
  notification: Bell,
  message: Mail,

  // Visibility
  show: Eye,
  hide: EyeOff,

  // UI
  search: Search,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  clock: Clock,
  calendar: Calendar,
  location: MapPin,

  // Data/Charts
  trending: TrendingUp,
  decline: TrendingDown,

  // Emoji-style
  emoji: Smile,
  fire: Flame,

  // Layout
  list: MoreVertical,
  grid: Menu,

  // Music & Media
  music: Music,
  upload: Upload,

  // Post Types & Content
  image: Image,
  eye: Eye,
  sparkle: Star,
  diamond: Star,
};

/**
 * Icon component wrapper with default styling
 */
export function Icon({ name, ...props }) {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in Icons object`);
    return null;
  }
  return <IconComponent {...props} />;
}

// ─────────────────────────────────────────────────────────────────
// CONVENIENCE EXPORTS
// ─────────────────────────────────────────────────────────────────

export const DeleteIcon = Icons.delete;
export const EditIcon = Icons.edit;
export const CloseIcon = Icons.close;
export const BackIcon = Icons.back;
export const SendIcon = Icons.send;
export const AddIcon = Icons.add;
export const RemoveIcon = Icons.remove;
export const SuccessIcon = Icons.success;
export const ErrorIcon = Icons.error;
export const InfoIcon = Icons.info;
export const CheckIcon = Icons.check;
export const HeartIcon = Icons.heart;
export const ChatIcon = Icons.comment;
export const SearchIcon = Icons.search;
export const SettingsIcon = Icons.settings;
export const UserIcon = Icons.user;
export const LogoutIcon = Icons.logout;
export const MenuIcon = Icons.hamburger;
export const NotificationIcon = Icons.notification;
export const MoonIcon = Icons.moon;
export const SunIcon = Icons.sun;
export const LikeIcon = Icons.like;
export const ShareIcon = Icons.share;
export const EmojiIcon = Icons.emoji;
export const FireIcon = Icons.fire;
export const ListIcon = Icons.list;
export const GridIcon = Icons.grid;
export const ChevronLeftIcon = Icons.chevronLeft;
export const ChevronRightIcon = Icons.chevronRight;
export const ChevronDownIcon = Icons.chevronDown;
export const ShuffleIcon = Icons.shuffle;
export const MessageIcon = Icons.message;
export const CalendarIcon = Icons.calendar;
export const UserProfileIcon = Icons.user;
export const HeartIconSmall = Icons.heart;
export const VolumeUpIcon = Icons.volumeUp;
export const VolumeMuteIcon = Icons.volumeMute;
export const PlayIcon = Icons.play;
export const PauseIcon = Icons.pause;
export const MusicIcon = Icons.music;
export const UploadIcon = Icons.upload;
export const ImageIcon = Icons.image;
export const EyeIcon = Icons.eye;
export const SparkleIcon = Icons.sparkle;
export const BookmarkIcon = Icons.bookmark;
