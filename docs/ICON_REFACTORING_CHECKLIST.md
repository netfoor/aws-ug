# 🎨 Icon Color Refactoring Checklist

## Overview
This document tracks the migration of all icon color implementations to use the new `getIconColors()` utility for consistent light/dark mode support.

## ✅ Completed

### Core Components
- [x] **QuickStatsGrid.tsx** - All 4 stat cards (blue, purple, orange, green)
- [x] **Command Center (dashboard/page.tsx)** - Home icon header
- [x] **UnifiedApplicationCard.tsx** - All emojis replaced:
  - 🚀 PROPUESTA → Rocket icon
  - ✅ Aprobar Todo → CheckCircle icon
  - 📝 Solo Speaker → FileText icon
  - ❌ Rechazar → XCircle icon
  - 🎉 Success message → Sparkles icon with proper color container
  - ✅ Confirmation list items → CheckCircle icons
- [x] **dashboard/page.tsx** - Quick Access Links:
  - 🚨 Alert → AlertCircle icon with red color scheme
  - 📋 Clipboard → Clipboard icon with accent
  - 🎤 Speakers → Mic icon with blue color scheme
  - 💬 Proposals → MessageSquare icon with purple color scheme
  - 📅 Events → Calendar icon with orange color scheme
  - ➕ Create → Plus icon with green color scheme
- [x] **ActionTimeline.tsx** - 🎉 party emoji removed from success message
- [x] **UnifiedSpeakerProposalForm.tsx** - 📸 Camera emoji → Camera icon

## 🔄 Priority - Admin Components

### High Priority (Admin Dashboard)
- [ ] **UnifiedApplicationCard.tsx** (line 18)
  - Multiple icons: CheckCircle, XCircle, Clock, Calendar, User, Briefcase, MessageSquare, LinkIcon, FileText, Mail
  - Needs: Review all icon color patterns

- [ ] **ActionTimeline.tsx** (line 12)  
  - Timeline action icons
  - Needs: Check for hardcoded colors

- [ ] **SpeakerApplicationsList.tsx** (line 4)
  - Icons: Eye, CheckCircle, XCircle, Clock, Calendar, Mail
  - Needs: Status badge colors

- [ ] **SpeakerApplicationDetail.tsx** (line 24)
  - Detail view icons
  - Needs: Review icon implementations

- [ ] **SecurityIncidents.tsx** (line 4)
  - Icons: Shield, AlertTriangle, Clock, User, Eye, X
  - Needs: Alert/security color schemes

- [ ] **QRScanner.tsx** (line 4)
  - Icons: Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, Loader2, Users, Zap, RotateCcw
  - Needs: Status indicators

- [ ] **ManualCheckIn.tsx** (line 5)
  - Icons: Search, User, Mail, CheckCircle, XCircle, Clock, Loader2, X
  - Needs: Form and status icons

- [ ] **AdminDashboard.tsx** (line 4)
  - Icons: Users, CheckCircle, XCircle, Clock
  - Needs: Dashboard stats

## 📝 Medium Priority - Speaker/User Components

- [ ] **UnifiedSpeakerProposalForm.tsx** (line 4)
  - Icons: User, Briefcase, Lightbulb, Calendar, FileText, Upload, LinkIcon, Check, Loader2
  - Needs: Form section icons

- [ ] **LastThursdaySelector.tsx** (line 4)
  - Icons: Calendar, Check, X, Clock
  - Needs: Date picker icons

- [ ] **ProfessionalProfileForm.tsx** (line 4)
  - Icons: Briefcase, Upload, FileText, Link, Loader2, Check, X
  - Needs: Profile form icons

- [ ] **speaker/propose-talk/page.tsx** (line 11)
  - Icons: Loader2, Lightbulb, Users, Clock, Wrench, FileText, Calendar, AlertCircle
  - Needs: Page header and section icons

## 🎫 Low Priority - Event Components

- [ ] **NotificationList.tsx** (line 5)
  - Icons: CheckCircle, XCircle, Calendar, MessageSquare, Megaphone, ExternalLink, FileText, RefreshCw
  - Needs: Notification type icons

- [ ] **NotificationBell.tsx** (line 4)
  - Icons: Bell, Loader2
  - Needs: Bell icon colors

- [ ] **TicketStatus.tsx** (line 4)
  - Icons: CheckCircle, Clock, XCircle, AlertTriangle, Ticket
  - Needs: Status badge colors

- [ ] **QRTicketModal.tsx** (line 4)
  - Icons: X
  - Needs: Modal close button

- [ ] **QRTicket.tsx** (line 4)
  - Icons: Download
  - Needs: Action button icon

- [ ] **EventCardMinimal.tsx** (line 6)
  - Icons: Clock, MapPin, Users
  - Needs: Event info icons

- [ ] **CreateEventModal.tsx** (line 7)
  - Icons: Loader2, Calendar, MapPin, Users, Clock, X
  - Needs: Form field icons

## 🛠️ Migration Pattern

### Before:
```tsx
<div className="bg-purple-50 dark:bg-purple-900/20">
  <Icon className="text-purple-700 dark:text-purple-300" />
</div>
```

### After:
```tsx
import { getIconColors } from '@/lib/iconColorUtils';

const { bgColor, textColor } = getIconColors('purple');

<div className={bgColor}>
  <Icon className={textColor} />
</div>
```

## 📊 Color Variants Available

- `blue` - User/speaker related
- `purple` - Proposals/messages  
- `orange` - Drafts/warnings
- `green` - Success/check-ins
- `red` - Errors/rejections
- `yellow` - Alerts/pending
- `accent` - Primary actions

## 🎯 Color Usage Guidelines

| Context | Recommended Color | Use Case |
|---------|------------------|----------|
| User profiles | `blue` | Speakers, attendees, people |
| Messages/Proposals | `purple` | Talk proposals, communications |
| Drafts/In Progress | `orange` | Unfinished items, pending changes |
| Success/Confirmed | `green` | Approved, checked-in, completed |
| Errors/Rejected | `red` | Failed actions, rejections |
| Warnings/Alerts | `yellow` | Attention needed, caution |
| Primary Actions | `accent` | Main navigation, key features |

## 🔍 Search Patterns

To find components needing updates:
```bash
# Find hardcoded dark: variants
grep -r "dark:text-" src/components

# Find icon imports
grep -r "from 'lucide-react'" src/

# Find bg color patterns
grep -r "bg-.*-50 dark:bg-" src/
```

## ✨ Benefits

1. **Consistent theming** - All icons adapt properly to light/dark mode
2. **Easier maintenance** - Single source of truth for colors
3. **Better DX** - Simple API, no need to remember color combinations
4. **Accessibility** - Proper contrast ratios maintained automatically

---

**Last Updated:** December 18, 2025
