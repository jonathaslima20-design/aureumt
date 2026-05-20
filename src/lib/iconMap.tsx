import {
  BookOpen, Rocket, Settings, Users, MessageSquare, Zap,
  Shield, Link, Database, Bot, CreditCard, Globe,
  LayoutDashboard, Code, Phone, Mail, Image, Video,
  FileText, HelpCircle, Lightbulb, Target, TrendingUp, Folder,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'book-open': BookOpen,
  'rocket': Rocket,
  'settings': Settings,
  'users': Users,
  'message-square': MessageSquare,
  'zap': Zap,
  'shield': Shield,
  'link': Link,
  'database': Database,
  'bot': Bot,
  'credit-card': CreditCard,
  'globe': Globe,
  'layout-dashboard': LayoutDashboard,
  'code': Code,
  'phone': Phone,
  'mail': Mail,
  'image': Image,
  'video': Video,
  'file-text': FileText,
  'help-circle': HelpCircle,
  'lightbulb': Lightbulb,
  'target': Target,
  'trending-up': TrendingUp,
  'folder': Folder,
};

export function DynamicIcon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const Icon = iconMap[name] || BookOpen;
  return <Icon size={size} className={className} />;
}
