# Case Management System Mockup

A Next.js application demonstrating the `Case` model for small claims court case management.

## Overview

This is a deployable mockup built with Next.js and TypeScript that allows you to visually inspect and interact with the `Case` model. The application includes:

- **Case Model**: Full TypeScript interface with fields for id, userId, caseType, claimAmount, courtState, courtCounty, defendants, createdAt, status, and tier
- **Interactive Form**: Add new cases with validation
- **List View**: Display all cases in a sortable table
- **Detail View**: Inspect individual case objects with full JSON data
- **Mock Data**: Pre-populated with sample cases using Faker.js

## Case Model Fields

```typescript
interface Case {
  id: string;
  userId: string;
  caseType: string;
  claimAmount: number;
  courtState: string;
  courtCounty: string;
  defendants: string[];
  createdAt: Date;
  status: 'pending' | 'active' | 'closed' | 'dismissed';
  tier: 'free' | 'paid';
}
```

## Getting Started

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build for Production

```bash
npm run build
npm start
```

## Features

### 1. Case List View
- Displays all cases in a table format
- Shows key information: ID, type, claim amount, location, status, tier, and creation date
- Color-coded status badges and tier indicators
- Click "View Details" to see full case information

### 2. Add New Case
- Click "Add New Case" button to show the form
- Fill in all required fields
- Supports multiple defendants (comma-separated)
- Automatically generates ID and timestamp

### 3. Case Detail View
- Full case information display
- Formatted currency and dates
- Visual status and tier indicators
- Raw JSON inspector for development

## Technology Stack

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Faker.js**: Mock data generation

## Vercel Deployment

This application is configured for easy deployment on Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Deploy automatically

The `vercel.json` configuration is already set up in the root directory.

## Project Structure

```
case-mockup/
├── app/
│   ├── case/[id]/
│   │   └── page.tsx       # Case detail page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── CaseForm.tsx       # Add case form
│   ├── CaseList.tsx       # Cases table
│   └── CaseDetail.tsx     # Case detail view
├── lib/
│   └── mockData.ts        # Mock data generator
└── types/
    └── Case.ts            # Case interface
```

## Learn More

To learn more about Next.js, check out:
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

