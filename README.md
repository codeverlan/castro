# Castro

A modern web application built with React, TanStack Router, and Drizzle ORM.

## Tech Stack

- **Frontend**: React 19 with TanStack Router
- **Styling**: Tailwind CSS with Radix UI components
- **Database**: PostgreSQL with Drizzle ORM
- **Build Tool**: Vite
- **Testing**: Playwright

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/codeverlan/castro.git
cd castro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations:
```bash
npm run db:push
```

5. (Optional) Seed the database:
```bash
npm run db:seed
```

### Development

Start the development server:
```bash
npm run dev
```

### Database Management

- **Generate migrations**: `npm run db:generate`
- **Run migrations**: `npm run db:migrate`
- **Push schema changes**: `npm run db:push`
- **Open Drizzle Studio**: `npm run db:studio`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm start
```

## License

MIT
