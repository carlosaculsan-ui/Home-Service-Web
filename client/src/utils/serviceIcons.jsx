import {
  Sparkles,
  Droplets,
  Zap,
  Hammer,
  Paintbrush,
  Wind,
  Wrench,
  Settings,
  Home,
  Star,
} from 'lucide-react'

export const serviceIconMap = {
  Sparkles,
  Droplets,
  Zap,
  Hammer,
  Paintbrush,
  Wind,
  Wrench,
  Settings,
  Home,
  Star,
}

export const ICON_OPTIONS = [
  { name: 'Sparkles',   label: 'Sparkles (Cleaning)' },
  { name: 'Droplets',   label: 'Droplets (Plumbing)' },
  { name: 'Zap',        label: 'Zap (Electrician)' },
  { name: 'Hammer',     label: 'Hammer (Carpentry)' },
  { name: 'Paintbrush', label: 'Paintbrush (Painting)' },
  { name: 'Wind',       label: 'Wind (Aircon Maintenance)' },
  { name: 'Wrench',     label: 'Wrench (General Repair)' },
  { name: 'Settings',   label: 'Settings (Maintenance)' },
  { name: 'Home',       label: 'Home (Home Service)' },
  { name: 'Star',       label: 'Star (Premium Service)' },
]

export function getServiceIcon(iconName, props = {}) {
  const IconComponent = serviceIconMap[iconName]
  if (!IconComponent) return null
  return <IconComponent {...props} />
}
