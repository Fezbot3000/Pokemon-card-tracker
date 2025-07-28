# Routing Structure Documentation

**Purpose**: Complete documentation of the application's routing architecture to prevent component placement confusion and provide clear development guidelines.

---

## 📋 **Overview**

The Pokemon Card Tracker uses React Router v6 with a nested routing structure that provides:
- **Authentication-protected routes** for dashboard functionality
- **Public routes** for marketing and informational content
- **Lazy loading** for performance optimization
- **Context providers** for global state management

---

## 🗺️ **Routing Architecture**

### **High-Level Flow**
```
src/router.js
├── RootProviders (Context Wrapper)
└── Route Definitions
    ├── Public Routes (/, /login, /features, etc.)
    └── Dashboard Routes (/dashboard/*)
        ├── DashboardApp (Authentication Guard)
        ├── DashboardIndex (Main Dashboard)
        └── Settings (/dashboard/settings)
```

### **Key Files**
- **`src/router.js`** - Main routing configuration
- **`src/App.js`** - Dashboard components (`Dashboard`, `DashboardIndex`, `AppContent`)
- **`src/AppContent.js`** - ⚠️ **LEGACY/UNUSED** component (not in router)

---

## 🛣️ **Complete Route Definitions**

### **Public Routes** (No Authentication Required)
| Route | Component | File | Loading |
|-------|-----------|------|---------|
| `/` | `Home` | `src/components/Home.js` | Immediate |
| `/login` | `Login` | `src/components/Login.js` | Immediate |
| `/forgot-password` | `ForgotPassword` | `src/components/ForgotPassword.js` | Immediate |
| `/features` | `Features` | `src/components/Features.js` | Lazy |
| `/about` | `About` | `src/components/About.js` | Lazy |
| `/privacy` | `Privacy` | `src/components/Privacy.js` | Lazy |
| `/terms` | `Terms` | `src/components/Terms.js` | Lazy |
| `/help-center` | `HelpCenter` | `src/components/HelpCenter.js` | Lazy |
| `/collecting-guide` | `CollectingGuide` | `src/components/CollectingGuide.js` | Lazy |
| `/grading-integration` | `GradingIntegration` | `src/components/GradingIntegration.js` | Lazy |
| `/pokemon-sets` | `PokemonSets` | `src/components/PokemonSets.js` | Lazy |
| `/pokemon-investment-guide` | `PokemonInvestmentGuide` | `src/components/PokemonInvestmentGuide.js` | Lazy |
| `/pricing` | `Pricing` | `src/components/Pricing.js` | Lazy |
| `/marketplace` | `PublicMarketplace` | `src/components/PublicMarketplace.js` | Lazy |
| `/marketplace/listing/:listingId` | `MarketplaceListing` | `src/components/Marketplace/MarketplaceListing.js` | Lazy |
| `/shared/:shareId` | `SharedCollection` | `src/components/SharedCollection.js` | Lazy |
| `/component-library` | `ComponentLibrary` | `src/pages/ComponentLibrary/index.jsx` | Lazy |
| `/upgrade` | `UpgradePage` | `src/components/UpgradePage.js` | Lazy |
| `/*` | `Navigate to="/"` | Redirect | N/A |

### **Protected Routes** (Authentication Required)
| Route | Component | File | Authentication |
|-------|-----------|------|----------------|
| `/dashboard` | `DashboardApp` → `DashboardIndex` | `src/App.js` | ✅ Required |
| `/dashboard/settings` | `Settings` | `src/components/Settings.js` | ✅ Required |

---

## 🔐 **Dashboard Architecture (Critical)**

### **Component Hierarchy**
```
Router: /dashboard
├── DashboardApp (Dashboard function in src/App.js)
│   ├── 🔒 Authentication Check
│   ├── 📱 Mobile Bottom Navigation
│   ├── 🌐 Global UI Elements (FloatingDebugTool, etc.)
│   └── <Outlet context={{ currentView, setCurrentView }} />
│
└── DashboardIndex (DashboardIndex function in src/App.js)
    ├── 📊 Context from Dashboard via useOutletContext()
    ├── 🧭 Navigation State Handling
    └── AppContent (AppContent function in src/App.js)
        ├── 🎯 View Switching Logic (cards, marketplace, etc.)
        ├── 📄 Main Dashboard Content
        └── 🛠️ Modal Management
```

### **Authentication Flow**
```javascript
// src/App.js - Dashboard function
const { currentUser, loading } = useAuth();

if (loading) {
  return <LoadingSkeleton />; // Show skeleton while checking auth
}

if (!currentUser) {
  return <Navigate to="/login" state={{ from: location }} replace />;
}

// Authenticated - render dashboard
return (
  <div className="relative">
    <Outlet context={{ currentView, setCurrentView }} />
    {/* Global UI elements go here */}
  </div>
);
```

---

## 🎯 **Component Placement Guidelines**

### **Where to Add Global UI Elements**

#### **✅ Correct Location: Dashboard Component (`src/App.js`)**
```javascript
// src/App.js - Dashboard function
return (
  <div className="relative">
    <Outlet context={{ currentView, setCurrentView }} />
    
    {/* ✅ ADD GLOBAL DASHBOARD UI HERE */}
    <FloatingDebugTool />
    <GlobalNotifications />
    <ChatWidget />
    {/* End global UI */}
  </div>
);
```

#### **❌ Incorrect Locations**
- **`src/AppContent.js`** - Legacy file, not used by router
- **Inside AppContent function** - Only applies to main content area
- **Inside DashboardIndex** - Only applies to index route

### **Global UI Element Characteristics**
Elements that should be added to Dashboard component:
- **Floating UI**: Debug tools, chat widgets, notifications
- **Overlay UI**: Global modals, toasts, loading screens
- **Navigation UI**: Mobile bottom nav, floating action buttons
- **Monitoring UI**: Performance monitors, analytics trackers

---

## 📁 **Context Provider Hierarchy**

### **RootProviders Wrapper**
All routes are wrapped in nested context providers:
```javascript
<ErrorBoundary>
  <HelmetProvider>
    <DesignSystemProvider>
      <UserPreferencesProvider>
        <TutorialProvider>
          <CardProvider>
            <BackupProvider>
              <RestoreProvider>
                <InvoiceProvider>
                  <Toast />
                  <ScrollToTop />
                  <Outlet /> {/* All routes render here */}
                </InvoiceProvider>
              </RestoreProvider>
            </BackupProvider>
          </CardProvider>
        </TutorialProvider>
      </UserPreferencesProvider>
    </DesignSystemProvider>
  </HelmetProvider>
</ErrorBoundary>
```

---

## ⚠️ **Legacy Components Warning**

### **UNUSED: `src/AppContent.js`**
```javascript
// ❌ This file is NOT used by the router
// ❌ Contains legacy AppContent function
// ❌ DO NOT add new features here
```

**Background**: `src/AppContent.js` appears to be a legacy component that was replaced by the `AppContent` function inside `src/App.js`. The router imports dashboard components from `./App.js`, not `./AppContent.js`.

**Action Required**: This file should be marked for removal after confirming no hidden dependencies exist.

---

## 🚀 **Performance Optimizations**

### **Lazy Loading Strategy**
- **Critical Components**: `Home`, `Login`, `ForgotPassword` loaded immediately
- **Dashboard Components**: Lazy loaded behind authentication
- **Public Pages**: Lazy loaded for better initial performance

### **Loading Fallbacks**
```javascript
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
    <div className="size-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
  </div>
);
```

---

## 🛠️ **Development Guidelines**

### **Adding New Routes**
1. **Public Route**: Add to router.js with appropriate lazy loading
2. **Dashboard Subroute**: Add as child of dashboard route
3. **Global UI**: Add to Dashboard component in `src/App.js`

### **Testing Routes**
- Verify authentication redirects work correctly
- Test lazy loading functionality
- Confirm context providers are available
- Validate mobile navigation compatibility

### **Common Mistakes to Avoid**
- ❌ Adding global UI to `src/AppContent.js` (legacy/unused)
- ❌ Adding dashboard features to public routes
- ❌ Bypassing authentication checks
- ❌ Forgetting lazy loading for new components

---

## 📖 **Quick Reference**

### **Need to add a global UI element?**
→ **`src/App.js`** - Dashboard function

### **Need to add a new public page?**
→ **`src/router.js`** - Add to children array

### **Need to add dashboard functionality?**
→ **`src/App.js`** - AppContent function

### **Confused about routing?**
→ **Trace**: router.js → DashboardApp → DashboardIndex → AppContent

---

**Last Updated**: December 2024  
**Related Docs**: [Component Hierarchy](./COMPONENT_HIERARCHY.md), [Legacy Components](./LEGACY_COMPONENTS.md) 