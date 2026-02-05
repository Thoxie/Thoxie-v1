# Thoxie - Small Claims Court Application

## Project Overview

Thoxie is a comprehensive web-based application designed to streamline the small claims court process. The application provides tools for case management, document handling, AI-assisted legal guidance, and an intuitive intake wizard for new cases.

## Project Components

### Core Features

1. **Case Dashboard** (`CaseDashboard.html`)
   - Central hub for managing all cases
   - View case status, deadlines, and important information
   - Quick access to case documents and communications

2. **Intake Wizard** (`IntakeWizard.html`)
   - Step-by-step guided process for filing new claims
   - Form validation and data collection
   - User-friendly interface for legal document preparation

3. **Document Preview** (`DocumentPreview.html`)
   - View and review legal documents
   - Document management and organization
   - PDF and document rendering capabilities

4. **AI Chatbox** (`AIChatbox.html`)
   - AI-powered legal assistance
   - Answer questions about the claims process
   - Provide guidance and recommendations

5. **Navigation Layout** (`NavigationLayout.html`)
   - Consistent navigation across all pages
   - Responsive design for mobile and desktop
   - User authentication and profile management

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Styling**: PostCSS with Autoprefixer
- **Build Tool**: Webpack
- **Package Manager**: npm

## Project Structure

```
Thoxie/
├── src/
│   └── components/          # React/JS components
│       ├── AIChatbox.js
│       ├── CaseDashboard.js
│       ├── DocumentPreview.js
│       ├── IntakeWizard.js
│       └── NavLayout.js
├── frontend/
│   ├── index.html          # Main entry point
│   ├── navigation_mockup.html
│   └── js/
│       └── app.js
├── app/
│   └── globals.css         # Global styles
├── small-claims-court-app/
│   └── frontend/
├── *.html                  # Component mockups
├── package.json
├── webpack.config.js
├── postcss.config.js
└── style.css
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/Thoxie/Thoxie.git

# Navigate to project directory
cd Thoxie

# Install dependencies
npm install
```

### Development

```bash
# Build the project
npm run build

# Watch for changes (if configured)
npm run watch
```

### Environment Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

## Recent Updates

- **2026-02-01**: Finalized mock-up files with responsive updates
- **2026-02-02**: Updated globals.css to align with Next.js standards for PostCSS
- All placeholder components delivered for Case Dashboard, Intake Wizard, Document Preview, and AI Chatbox
- Navigation layout fully polished

## Contributing

Please read the project specification document for detailed requirements and guidelines.

## Support

For questions or issues, please contact the development team or create an issue in the repository.

## License

[Add license information here]
