# Pokemon Card Tracker - Project Overview

## Core Application Functions

This is a React-based Pokemon card collection tracking application that allows users to:

1. **Card Management**: Track Pokemon card collections with CRUD operations
2. **Purchase Invoices**: Manage and track card purchases
3. **Marketplace**: Buy/sell cards with integrated messaging
4. **Statistics & Analytics**: View collection statistics and profit tracking
5. **User Authentication**: Firebase-based authentication system

## Technology Stack

- **Frontend**: React 18.2.0 with React Router 6.20.0
- **Build System**: Create React App with CRACO 7.1.0 customization
- **Backend**: Firebase (Firestore, Auth, Hosting, Functions)
- **Styling**: Tailwind CSS with custom design system
- **Performance**: Optimized with code splitting and bundle analysis

## Architecture

- **Component Structure**: Atomic design principles with design system
- **State Management**: Context API with custom hooks
- **Data Layer**: Firebase integration with custom adapters
- **Routing**: React Router with protected routes
- **Development**: Hot reloading via CRACO development server

## Key Development Dependencies

- **CRACO**: Configuration override for webpack without ejecting
- **Firebase Tools**: Deployment and development workflows
- **Performance**: Bundle analyzer and optimization tools
- **Code Quality**: ESLint, Prettier with Tailwind plugin

## Known Issues

- Hot reloading stopped working due to React Scripts 5.0.1 compatibility issue
- Investigation file: `investigations/INVESTIGATION_HOT_RELOADING_STOPPED_20250201.md`