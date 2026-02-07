# Case Model Mockup - Quick Start Guide

## Overview

This repository includes a Next.js mockup application for the Case model, located in the `case-mockup/` directory.

## Running the Mockup Locally

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Steps

1. **Navigate to the case-mockup directory:**
   ```bash
   cd case-mockup
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## Building for Production

```bash
cd case-mockup
npm run build
npm start
```

## Deploying to Vercel

### Option 1: Using Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option 2: Via Vercel Dashboard
1. Import your GitHub repository in Vercel
2. Set the root directory to `case-mockup`
3. Click Deploy

The application is already configured for Vercel deployment with the `vercel.json` file in the root directory.

## Features

- **Add New Cases**: Click the "Add New Case" button to create new case entries
- **View Case List**: See all cases in a sortable, filterable table
- **View Case Details**: Click "View Details" on any case to see full information and raw JSON data

## Case Model Fields

Each case includes:
- `id`: Unique identifier
- `userId`: Associated user ID
- `caseType`: Type of legal case
- `claimAmount`: Monetary claim amount
- `courtState`: State where case is filed
- `courtCounty`: County where case is filed
- `defendants`: Array of defendant names
- `createdAt`: Timestamp of case creation
- `status`: Current status (pending, active, closed, dismissed)
- `tier`: Subscription tier (free, paid)

## Project Structure

```
case-mockup/
├── app/                    # Next.js app directory
│   ├── case/[id]/         # Dynamic case detail route
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── CaseForm.tsx       # Form to add cases
│   ├── CaseList.tsx       # Table view of cases
│   └── CaseDetail.tsx     # Detailed case view
├── lib/                   # Utilities and mock data
│   └── mockData.ts        # Mock case generator
├── types/                 # TypeScript definitions
│   └── Case.ts            # Case interface
└── package.json           # Dependencies
```

## Technology Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- React 19
- Faker.js (for mock data)

## Support

For issues or questions, please open an issue in the GitHub repository.
