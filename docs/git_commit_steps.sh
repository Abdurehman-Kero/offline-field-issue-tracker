#!/bin/bash

# This script runs a series of git commands to commit the project step-by-step
# It breaks down the system into 17 clear, beginner-friendly commits.

# Make sure you are in the root of the project before running this script.
# You might need to initialize git first if you haven't: git init

# 1. Root configurations
git add package.json .gitignore README.md
git commit -m "chore: initialize project root with configs and README"

# 2. Server setup
git add server/package.json server/src/index.js server/src/app.js server/.env.example
git commit -m "feat(server): set up Express server and environment variables"

# 3. Database connection and schema
git add server/src/db/pool.js server/src/db/migrate.js server/src/db/migrations/
git commit -m "feat(db): initialize PostgreSQL connection pool and initial database schema"

# 4. Backend validation and services
git add server/src/validation.js server/src/services/
git commit -m "feat(server): add input validation and core business logic services"

# 5. Backend REST API
git add server/src/routes/
git commit -m "feat(server): create REST API endpoints for reports and status transitions"

# 6. Database seed data
git add server/src/db/seed.js
git commit -m "chore(db): add database seed script with realistic production data"

# 7. Frontend initialization
git add client/package.json client/vite.config.ts client/tsconfig.json client/tsconfig.node.json client/index.html client/eslint.config.js
git commit -m "chore(client): initialize React frontend with Vite and TypeScript"

# 8. Frontend design system
git add client/src/styles/ client/src/index.css
git commit -m "style(client): establish global CSS variables and mobile-first layout system"

# 9. Frontend shared types
git add client/src/shared/
git commit -m "feat(client): define shared TypeScript interfaces and application constants"

# 10. Local offline database
git add client/src/db/
git commit -m "feat(client): set up IndexedDB wrapper for offline local-first storage"

# 11. Background sync engine
git add client/src/sync/
git commit -m "feat(client): implement background synchronization engine with retry logic"

# 12. Custom React hooks
git add client/src/hooks/
git commit -m "feat(client): build custom hooks for online status detection and data fetching"

# 13. Reusable UI components
git add client/src/components/Badge.tsx client/src/components/ReportCard.tsx client/src/components/HistoryTimeline.tsx
git commit -m "feat(client): create reusable UI components for cards, badges, and audit timelines"

# 14. App shell and navigation
git add client/src/components/Header.tsx client/src/components/ConnectionBanner.tsx client/src/App.tsx client/src/main.tsx client/src/vite-env.d.ts
git commit -m "feat(client): build main application layout, routing, and responsive header"

# 15. Dashboard and Outbox pages
git add client/src/pages/ReportList.tsx client/src/pages/SyncPage.tsx
git commit -m "feat(client): develop reports dashboard with filters and synchronization outbox page"

# 16. Forms and detailed views
git add client/src/pages/ReportForm.tsx client/src/pages/ReportDetails.tsx
git commit -m "feat(client): implement complex forms for creating and reviewing infrastructure reports"

# 17. Help modal and final polish
git add client/src/components/HelpModal.tsx docs/
git commit -m "docs: add user onboarding help modal and final project documentation"

# Final catch-all for anything left over
git add .
git commit -m "chore: final cleanup and minor adjustments"

echo "✅ Step-by-step commit history successfully created!"
