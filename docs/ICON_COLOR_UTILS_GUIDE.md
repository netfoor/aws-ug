# 🎨 Icon Color Utils - Usage Examples

## Quick Start

```tsx
import { getIconColors } from '@/lib/iconColorUtils';
import { Users } from 'lucide-react';

function MyComponent() {
  const { bgColor, textColor } = getIconColors('blue');
  
  return (
    <div className={bgColor}>
      <Users className={textColor} />
    </div>
  );
}
```

## Available Color Variants

| Variant | Use Case | Light Mode | Dark Mode |
|---------|----------|------------|-----------|
| `'blue'` | Users, profiles | Blue 600 | Blue 400 |
| `'purple'` | Messages, proposals | Purple 600 | Purple 400 |
| `'orange'` | Drafts, warnings | Orange 600 | Orange 400 |
| `'green'` | Success, approved | Green 600 | Green 400 |
| `'red'` | Errors, rejected | Red 600 | Red 400 |
| `'yellow'` | Alerts, pending | Yellow 600 | Yellow 400 |
| `'accent'` | Primary actions | Accent | Accent |

## Common Patterns

### 1. Simple Icon Container
```tsx
const { bgColor, textColor } = getIconColors('purple');

<div className={`p-3 rounded-lg ${bgColor}`}>
  <MessageSquare className={`w-6 h-6 ${textColor}`} />
</div>
```

### 2. Icon with Hover Effect
```tsx
const { bgColor, textColor, hoverBg } = getIconColors('green');

<button className={`p-3 rounded-lg ${bgColor} ${hoverBg} transition-colors`}>
  <CheckCircle className={`w-6 h-6 ${textColor}`} />
</button>
```

### 3. Dynamic Icon in Loop
```tsx
const items = [
  { icon: Users, color: 'blue' as const },
  { icon: Calendar, color: 'orange' as const },
  { icon: CheckCircle, color: 'green' as const },
];

items.map(item => {
  const { bgColor, textColor } = getIconColors(item.color);
  return (
    <div className={bgColor}>
      <item.icon className={textColor} />
    </div>
  );
});
```

### 4. Status Badges
```tsx
function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const colorMap = {
    pending: 'yellow',
    approved: 'green',
    rejected: 'red'
  } as const;
  
  const { bgColor, textColor } = getIconColors(colorMap[status]);
  
  return (
    <span className={`px-3 py-1 rounded-full ${bgColor} ${textColor} text-sm font-medium`}>
      {status}
    </span>
  );
}
```

### 5. Stat Cards (like QuickStatsGrid)
```tsx
const stats = [
  { label: 'Users', value: 42, icon: Users, colorVariant: 'blue' },
  { label: 'Messages', value: 17, icon: MessageSquare, colorVariant: 'purple' },
];

stats.map(stat => {
  const { bgColor, textColor } = getIconColors(stat.colorVariant);
  
  return (
    <div className="card">
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <stat.icon className={`w-6 h-6 ${textColor}`} />
      </div>
      <p className="text-2xl font-bold">{stat.value}</p>
      <p className="text-sm text-gray-600">{stat.label}</p>
    </div>
  );
});
```

## Migration Examples

### ❌ Before (Hardcoded Dark Variants)
```tsx
<div className="bg-purple-50 dark:bg-purple-900/20">
  <MessageSquare className="text-purple-700 dark:text-purple-300" />
</div>
```

### ✅ After (Using Utility)
```tsx
const { bgColor, textColor } = getIconColors('purple');

<div className={bgColor}>
  <MessageSquare className={textColor} />
</div>
```

### ❌ Before (Multiple Icons with Repetitive Code)
```tsx
<div className="bg-blue-50 dark:bg-blue-900/20">
  <Users className="text-blue-700 dark:text-blue-300" />
</div>
<div className="bg-purple-50 dark:bg-purple-900/20">
  <MessageSquare className="text-purple-700 dark:text-purple-300" />
</div>
<div className="bg-green-50 dark:bg-green-900/20">
  <CheckCircle className="text-green-700 dark:text-green-300" />
</div>
```

### ✅ After (DRY with Utility)
```tsx
const icons = [
  { Icon: Users, color: 'blue' },
  { Icon: MessageSquare, color: 'purple' },
  { Icon: CheckCircle, color: 'green' },
] as const;

{icons.map(({ Icon, color }) => {
  const { bgColor, textColor } = getIconColors(color);
  return (
    <div className={bgColor}>
      <Icon className={textColor} />
    </div>
  );
})}
```

## TypeScript Support

The utility is fully typed:

```tsx
import { getIconColors, type IconColorVariant } from '@/lib/iconColorUtils';

// ✅ Type-safe
const color: IconColorVariant = 'blue';
getIconColors(color);

// ❌ TypeScript error
getIconColors('invalidColor'); // Error!
```

## When to Use Each Variant

- **`blue`**: User-related features (profiles, speakers, attendees)
- **`purple`**: Communication (messages, proposals, feedback)
- **`orange`**: In-progress or draft items
- **`green`**: Success states (approved, confirmed, checked-in)
- **`red`**: Error states (rejected, failed, deleted)
- **`yellow`**: Warnings or items needing attention
- **`accent`**: Primary brand actions (use sparingly for importance)

## Combining with Other Utilities

```tsx
import { getIconColors } from '@/lib/iconColorUtils';
import { cn } from '@/lib/utils'; // If you have a classNames utility

const { bgColor, textColor } = getIconColors('blue');

<div className={cn(
  'p-3 rounded-lg transition-all',
  bgColor,
  'hover:scale-110'
)}>
  <Users className={cn('w-6 h-6', textColor)} />
</div>
```

## Accessibility Notes

- All color combinations maintain proper contrast ratios
- Dark mode variants are automatically applied
- Background opacity is consistent (10% light, 20% dark)
- Icon colors use middle shades for better visibility

---

**Pro Tip:** When adding new SVG icons, wrap them in the same pattern for consistent theming across your app!
