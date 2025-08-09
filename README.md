# Pokemon Card Tracker

A comprehensive web application for tracking Pokemon card collections with marketplace functionality, PSA grading integration, and advanced collection management features.

## 🎯 Project Overview

The Pokemon Card Tracker is a full-stack React application that helps collectors manage their Pokemon card collections, track values, and participate in a marketplace for buying and selling cards. Built with modern web technologies including React, Firebase, and Tailwind CSS.

## 🏗️ Architecture

- **Frontend**: React with Hooks and Context API
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions, Storage)
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context with custom hooks
- **Build Tool**: Create React App with Craco
- **Deployment**: Firebase Hosting with production optimizations

## 📚 Documentation Structure

### Core Features
- [Collection Management](./docs/collection-management.md) - Add, edit, and organize your card collections
- [Marketplace](./docs/marketplace.md) - Buy and sell cards with other collectors
- [PSA Integration](./docs/psa-integration.md) - Lookup PSA grading data and pricing
- [Invoice System](./docs/invoice-system.md) - Generate and track purchase invoices
- [Data Management](./docs/data-management.md) - Import/export and backup functionality

### Technical Documentation
- [API Documentation](./docs/api-documentation.md) - Firebase Cloud Functions and external APIs
- [Database Schema](./docs/database-schema.md) - Firestore collections and data structure
- [Authentication](./docs/authentication.md) - User management and security
- [File Storage](./docs/file-storage.md) - Image handling and Firebase Storage
- [Deployment Guide](./docs/deployment.md) - Production deployment and CI/CD

### Development
- [Architecture: System Overview](./docs/architecture/SYSTEM_OVERVIEW.md)
- [Architecture: Component Hierarchy](./docs/architecture/COMPONENT_HIERARCHY.md)
- [Setup](./docs/setup/README-LOCAL-SETUP.md)
- [Tailwind Deprecation Plan](./docs/features/TAILWIND_DEPRECATION_PLAN.md)
- [Tailwind Migration Progress](./docs/features/TAILWIND_MIGRATION_PROGRESS.md)
- [Tailwind Migration Summary](./docs/features/TAILWIND_MIGRATION_SUMMARY.md)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd Pokemon-card-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase configuration**
   - See [Local Setup Guide](./docs/local-setup.md) for detailed instructions

4. **Start development server**
   ```bash
   npm start
   ```

## 🔧 Key Technologies

- **React 18** - Frontend framework
- **Firebase 9+** - Backend services
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Context API** - State management
- **Stripe** - Payment processing
- **SendGrid** - Email services
- **PSA API** - Card grading data

## 📱 Features

### Collection Management
- Add cards with detailed information
- Upload and manage card images
- Organize cards into collections
- Track card values and profit/loss
- Bulk import/export functionality

### Marketplace
- List cards for sale
- Browse and search available cards
- Messaging system between buyers/sellers
- Review and rating system
- Location-based filtering

### Analytics & Insights
- Collection value tracking
- Profit/loss calculations
- Market trends and pricing data
- PSA population reports

### Mobile-First Design
- Responsive design for all devices
- Progressive Web App features
- Offline functionality
- Touch-optimized interactions

## 🛡️ Security & Privacy

- Firebase Authentication with secure user management
- Role-based access control
- Data encryption at rest and in transit
- GDPR compliant data handling
- Image optimization and secure storage

## 🔄 Contributing

Please read our [Contributing Guide](./docs/contributing.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- Check our [Documentation](./docs/) for detailed guides
- Review [Troubleshooting](./docs/troubleshooting.md) for common issues
- Contact support through the application

---

**Last Updated**: $(date)
**Version**: 2.0.0
**Node Version**: 18+
**React Version**: 18+