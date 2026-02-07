# Quick Reference Guide - Thoxie Project

## 🚀 Quick Start

### Finding Your Way Around

**Main Documentation Files:**
- 📖 `README.md` - Project overview and getting started
- 📋 `PROJECT_SPECIFICATION.md` - Detailed requirements and specifications
- 📝 `commit_notes.md` - Recent changes and updates
- 📚 `QUICK_REFERENCE.md` - This file!

### Important Directories

```
📁 src/components/          → React/JS component files
📁 frontend/                → Frontend HTML and JS
📁 app/                     → Global styles and app config
📁 small-claims-court-app/  → Small claims specific code
```

### Key Files

```
🎨 Style Files:
   - globals.css           → Global application styles
   - style.css             → Additional styles
   - postcss.config.js     → PostCSS configuration

⚙️ Configuration:
   - package.json          → Dependencies and scripts
   - webpack.config.js     → Build configuration
   - .env.example          → Environment variables template

🖥️ Component Mockups:
   - AIChatbox.html        → AI assistance interface
   - CaseDashboard.html    → Case management dashboard
   - IntakeWizard.html     → New claim filing wizard
   - DocumentPreview.html  → Document viewer
   - NavigationLayout.html → App navigation
```

## 🔍 How to Find Copilot

### Accessing GitHub Copilot

1. **In VS Code:**
   - Open VS Code
   - Look for the Copilot icon in the bottom right status bar
   - Or press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Copilot" to see available commands

2. **In GitHub:**
   - Go to your repository: https://github.com/Thoxie/Thoxie
   - Check for Copilot suggestions in pull requests
   - Look for the Copilot chat interface

3. **Copilot Chat:**
   - In VS Code: Click the chat icon in the sidebar or press `Ctrl+Alt+I`
   - In GitHub: Use GitHub Copilot Chat in your browser

### GitHub Copilot Actions

This project branch is `copilot/session-status-check` - created by GitHub Copilot for:
- Session status verification
- Code assistance
- Documentation generation

## 📝 Common Tasks

### Install Dependencies
```bash
npm install
```

### Build the Project
```bash
npm run build
```

### View Git Status
```bash
git status
git log --oneline
```

### Check Current Branch
```bash
git branch
# Current: copilot/session-status-check
```

## 🗺️ Project Navigation Map

```
Thoxie Small Claims Court Application
│
├── 🏠 Home/Dashboard (CaseDashboard.html)
│   └── View all cases, deadlines, status
│
├── ➕ New Claim (IntakeWizard.html)
│   └── Step-by-step filing process
│
├── 📄 Documents (DocumentPreview.html)
│   └── View and manage case documents
│
├── 🤖 AI Assistant (AIChatbox.html)
│   └── Get help with legal questions
│
└── 🧭 Navigation (NavigationLayout.html)
    └── App-wide navigation system
```

## 📊 Project Status

**Current Phase:** Foundation Complete, Core Functionality In Progress

**Recent Updates:**
- ✅ Mock-up files finalized
- ✅ Responsive updates completed
- ✅ Navigation layout polished
- ✅ PostCSS configuration updated
- ✅ Documentation created (2026-02-02)

## 🆘 Need Help?

### Finding Information

1. **Project Goals & Requirements** → Read `PROJECT_SPECIFICATION.md`
2. **Setup Instructions** → See `README.md`
3. **Recent Changes** → Check `commit_notes.md`
4. **Code Structure** → Explore `src/components/`
5. **Styling** → Look in `globals.css` and `style.css`

### Common Questions

**Q: Where is the project specification?**  
A: `PROJECT_SPECIFICATION.md` (newly created)

**Q: How do I set up the project?**  
A: See "Getting Started" section in `README.md`

**Q: What are the main features?**  
A: Case Dashboard, Intake Wizard, Document Preview, AI Chatbox, Navigation

**Q: Where is the code for each component?**  
A: Check `src/components/` directory

**Q: How do I build the project?**  
A: Run `npm install` then `npm run build`

## 🔗 Useful Links

- Repository: https://github.com/Thoxie/Thoxie
- Current Branch: copilot/session-status-check

## 📞 Getting Support

1. Read the documentation files
2. Check existing components and code
3. Use GitHub Copilot for code assistance
4. Review commit history for context
5. Create an issue in the repository

---

**Pro Tip:** Bookmark this file for quick reference! All your project documentation is now organized and easy to find.

**Last Updated:** 2026-02-02
