# Scientific Conference Scheduler

A modern, production-ready conference program management system built with Next.js 14, Supabase, and TypeScript. Designed specifically for scientific and medical conferences with dynamic session types and intuitive management interfaces.

## 🚀 Features

### Core Functionality
- **Dynamic Session Types**: Support for 9 different session types (Lecture, Panel, Workshop, Symposium, etc.)
- **Intelligent Forms**: Each session type shows only relevant fields
- **Real-time Updates**: Instant synchronization across devices
- **Conflict Detection**: Prevents scheduling conflicts in the same hall
- **Beautiful Public View**: Print-friendly program display
- **CSV Export**: Complete data export with all relationships

### Session Types Supported
1. **Lecture / Talk** - Single expert presentation
2. **Panel Discussion** - Moderated Q&A with multiple panelists
3. **Symposium** - Multiple speakers on a common theme
4. **Workshop** - Hands-on training sessions
5. **Oration / Keynote** - Prestigious opening/closing lectures
6. **Guest Lecture** - Distinguished guest presentations
7. **Discussion / Free Paper** - Short presentations with Q&A
8. **Break / Meal** - Standalone meal and break sessions
9. **Other / Custom** - Flexible custom sessions

### Admin Features
- **Dashboard**: Overview with statistics and quick actions
- **Session Management**: Create, edit, and delete sessions
- **Speaker Directory**: Manage speaker profiles
- **Stage Management**: Configure halls and venues
- **Export System**: Generate CSV for downstream systems

### Public Features
- **Beautiful Program View**: Clean, professional display
- **Print Optimization**: Perfect for physical handouts
- **Mobile Responsive**: Works on all devices
- **Day Navigation**: Easy browsing by conference day

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Type Safety**: Full TypeScript coverage
- **Real-time**: Supabase subscriptions

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase CLI (for local development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd scientific-conference-scheduler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Set up Supabase (Local Development)**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Start local Supabase
   supabase start
   
   # Apply database migrations
   supabase db reset
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Credentials
- **Email**: admin@conference.com
- **Password**: admin123

## 🗄️ Database Schema

The application uses a flexible schema designed for conference management:

### Core Tables
- `conference_days` - Conference day information
- `stages` - Venue/hall configuration
- `speakers` - Speaker profiles and information
- `sessions` - Session details with flexible JSONB data
- `session_participants` - Speaker-session relationships
- `session_types` - Dynamic session type configurations

### Key Features
- **UUID Primary Keys**: Secure, non-sequential identifiers
- **JSONB Fields**: Flexible data storage for different session types
- **Foreign Key Constraints**: Data integrity across relationships
- **Indexes**: Optimized for common queries
- **Triggers**: Automatic timestamp updates

## 🎨 UI/UX Design

### Design Principles
- **Clean & Modern**: Professional appearance suitable for academic conferences
- **Intuitive Navigation**: Easy-to-use admin interface
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Accessibility**: WCAG 2.1 AA compliant
- **Print Optimization**: Beautiful physical program handouts

### Color Scheme
- **Primary**: Indigo (#4F46E5)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Neutral**: Gray scale for text and backgrounds

## 🔧 Development

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (admin)/           # Admin-only routes
│   ├── (auth)/            # Authentication routes
│   ├── public-program/    # Public program view
│   └── api/               # API routes
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                  # Utility functions and config
├── types/                # TypeScript type definitions
└── hooks/                # Custom React hooks
```

### Key Components
- **Dynamic Session Forms**: Automatically adapts fields based on session type
- **Real-time Schedule**: Live updates using Supabase subscriptions
- **Export System**: Comprehensive CSV generation
- **Print Styles**: Optimized CSS for physical printing

### Adding New Session Types
1. Update `SESSION_TYPES` in `src/lib/constants.ts`
2. Add form field rendering logic in session form
3. Update database schema if needed
4. Add to CSV export logic

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
The application can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

### Environment Variables
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional
NEXTAUTH_URL=your-app-url
NEXTAUTH_SECRET=your-secret-key
```

## 📊 CSV Export Format

The export system generates comprehensive CSV files with the following columns:
- Session Name
- Session Type
- Day
- Stage
- Start Time
- End Time
- Duration
- Topic
- Person Name
- Role (Speaker, Moderator, Panelist, etc.)
- Organization
- Email

## 🔒 Security

- **Row Level Security**: Database-level access control
- **Authentication**: Secure session management
- **Input Validation**: Type-safe form handling
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: React's built-in protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the Supabase documentation for database questions

## 🎯 Roadmap

### Planned Features
- [ ] Multi-conference support
- [ ] Speaker invitation emails
- [ ] PDF export functionality
- [ ] Advanced conflict detection
- [ ] Role-based access control
- [ ] Multi-language support
- [ ] Mobile app companion
- [ ] Integration with calendar systems

### Performance Optimizations
- [ ] Image optimization
- [ ] Database query optimization
- [ ] Caching strategies
- [ ] Bundle size reduction

---

**Built with ❤️ for the scientific community** 