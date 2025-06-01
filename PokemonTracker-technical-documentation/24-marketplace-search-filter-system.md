# Marketplace Search & Filter System Technical Documentation

## Overview

The Search & Filter System provides powerful discovery capabilities for the marketplace, allowing users to efficiently find specific cards through text search, category filtering, grading company selection, and grade-specific filtering. The system features real-time results, intelligent grade options, and persistent filter states.

## Architecture

### Core Components

#### 1. MarketplaceSearchFilters.js
- **Purpose**: Primary search and filter interface component
- **Features**: Text search, category filters, grading filters, clear functionality
- **Location**: `src/components/Marketplace/MarketplaceSearchFilters.js`

#### 2. MarketplacePagination.js
- **Purpose**: Pagination controls for filtered results
- **Features**: Page navigation, result count display, responsive design
- **Location**: `src/components/Marketplace/MarketplacePagination.js`

## Key Features

### Intelligent Text Search
```javascript
const handleSearch = (searchTerm) => {
  if (!searchTerm.trim()) {
    return allListings;
  }

  const term = searchTerm.toLowerCase();
  
  return allListings.filter(listing => {
    const searchableFields = [
      listing.card?.name,
      listing.card?.set,
      listing.card?.category,
      listing.card?.brand,
      listing.note,
      listing.location
    ];
    
    return searchableFields.some(field => 
      field?.toLowerCase().includes(term)
    );
  });
};
```

### Dynamic Grade Filtering
```javascript
const getGradeOptionsForCompany = (gradingCompany) => {
  switch (gradingCompany) {
    case 'PSA':
      return psaGrades;
    case 'BGS':
      return bgsGrades;
    case 'CGC':
      return cgcGrades;
    case 'SGC':
      return sgcGrades;
    case 'RAW':
      return rawConditions;
    default:
      return [{ value: '', label: 'Select grading company first' }];
  }
};

const gradeOptions = useMemo(() => 
  getGradeOptionsForCompany(filters.gradingCompany),
  [filters.gradingCompany]
);
```

### Real-Time Filter Application
```javascript
const handleFilterChange = useCallback((newFilters) => {
  setFilters(newFilters);
  
  let filtered = allListings;

  // Text search filter
  if (newFilters.search) {
    filtered = applyTextSearch(filtered, newFilters.search);
  }

  // Category filter
  if (newFilters.category) {
    filtered = filtered.filter(listing => 
      listing.card?.category === newFilters.category
    );
  }

  // Grading company filter
  if (newFilters.gradingCompany) {
    filtered = applyGradingCompanyFilter(filtered, newFilters.gradingCompany);
  }

  // Grade filter
  if (newFilters.grade) {
    filtered = filtered.filter(listing => 
      listing.card?.grade === newFilters.grade
    );
  }

  setFilteredListings(filtered);
  setCurrentPage(1); // Reset pagination
}, [allListings]);
```

## Filter Configuration

### Grading Company Options
```javascript
const gradingCompaniesOptions = [
  { value: '', label: 'All Grading Companies' },
  { value: 'PSA', label: 'PSA' },
  { value: 'BGS', label: 'BGS (Beckett)' },
  { value: 'CGC', label: 'CGC' },
  { value: 'SGC', label: 'SGC' },
  { value: 'RAW', label: 'Raw/Ungraded' },
];
```

### PSA Grade Scale
```javascript
const psaGrades = [
  { value: '', label: 'All Grades' },
  { value: '10', label: 'PSA 10 Gem Mint' },
  { value: '9', label: 'PSA 9 Mint' },
  { value: '8', label: 'PSA 8 NM-Mint' },
  { value: '7', label: 'PSA 7 Near Mint' },
  { value: '6', label: 'PSA 6 EX-Mint' },
  { value: '5', label: 'PSA 5 Excellent' },
  { value: '4', label: 'PSA 4 VG-EX' },
  { value: '3', label: 'PSA 3 Very Good' },
  { value: '2', label: 'PSA 2 Good' },
  { value: '1.5', label: 'PSA 1.5 Fair' },
  { value: '1', label: 'PSA 1 Poor' },
  { value: 'A', label: 'PSA Authentic' },
];
```

### BGS Grade Scale
```javascript
const bgsGrades = [
  { value: '', label: 'All Grades' },
  { value: '10', label: 'BGS 10 Pristine (Black Label)' },
  { value: '10P', label: 'BGS 10 Pristine' },
  { value: '9.5', label: 'BGS 9.5 Gem Mint' },
  { value: '9', label: 'BGS 9 Mint' },
  { value: '8.5', label: 'BGS 8.5 NM-Mint+' },
  { value: '8', label: 'BGS 8 NM-Mint' },
  { value: '7.5', label: 'BGS 7.5 Near Mint+' },
  { value: '7', label: 'BGS 7 Near Mint' },
  { value: '6.5', label: 'BGS 6.5 EX-Mint+' },
  { value: '6', label: 'BGS 6 EX-Mint' },
  { value: '5.5', label: 'BGS 5.5 Excellent+' },
  { value: '5', label: 'BGS 5 Excellent' },
  { value: '4', label: 'BGS 4 VG-EX' },
  { value: '3', label: 'BGS 3 Very Good' },
  { value: '2', label: 'BGS 2 Good' },
  { value: '1', label: 'BGS 1 Poor' },
  { value: 'A', label: 'BGS Authentic' },
];
```

### Raw Card Conditions
```javascript
const rawConditions = [
  { value: '', label: 'All Conditions' },
  { value: 'Mint', label: 'Mint' },
  { value: 'Near Mint', label: 'Near Mint' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good', label: 'Good' },
  { value: 'Played', label: 'Played' },
  { value: 'Poor', label: 'Poor' },
];
```

## State Management

### Filter State Structure
```javascript
const [filters, setFilters] = useState({
  search: '',
  category: '',
  gradingCompany: '',
  grade: ''
});

const [predefinedCategories, setPredefinedCategories] = useState([]);
const [isFilterActive, setIsFilterActive] = useState(false);
```

### Dynamic Category Loading
```javascript
useEffect(() => {
  if (!listings || listings.length === 0) return;

  // Extract unique categories from listings
  const categories = [...new Set(
    listings
      .map(listing => listing.card?.category)
      .filter(Boolean)
      .sort()
  )];

  setPredefinedCategories(categories);
}, [listings]);

// Check if any filters are active
useEffect(() => {
  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  setIsFilterActive(hasActiveFilters);
}, [filters]);
```

## UI Components

### Search Input Interface
```javascript
const SearchInput = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Icon name="search" className="text-gray-400" />
    </div>
    <input
      type="text"
      name="search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                 focus:outline-none focus:ring-1 focus:ring-blue-500
                 placeholder-gray-500 dark:placeholder-gray-400"
    />
  </div>
);
```

### Filter Dropdown Component
```javascript
const FilterDropdown = ({ name, value, onChange, options, disabled = false, label }) => (
  <div>
    <label className="sr-only">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                 focus:outline-none focus:ring-1 focus:ring-blue-500
                 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
```

### Clear Filters Button
```javascript
const ClearFiltersButton = ({ onClear, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="flex justify-end">
      <button
        onClick={onClear}
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 
                   flex items-center transition-colors"
      >
        <Icon name="close" className="mr-1 text-sm" />
        Clear filters
      </button>
    </div>
  );
};
```

### Complete Filter Interface
```javascript
return (
  <div className="mb-4 space-y-3">
    {/* Search input */}
    <SearchInput
      value={filters.search}
      onChange={handleChange}
      placeholder="Search by card name, brand, category..."
    />
    
    {/* Filter dropdowns */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <FilterDropdown
        name="category"
        value={filters.category}
        onChange={handleChange}
        options={[
          { value: '', label: 'All Categories' },
          ...predefinedCategories.map(cat => ({ value: cat, label: cat }))
        ]}
        label="Category filter"
      />
      
      <FilterDropdown
        name="gradingCompany"
        value={filters.gradingCompany}
        onChange={handleChange}
        options={gradingCompaniesOptions}
        label="Grading company filter"
      />
      
      <FilterDropdown
        name="grade"
        value={filters.grade}
        onChange={handleChange}
        options={gradeOptions}
        disabled={!filters.gradingCompany}
        label="Grade filter"
      />
    </div>
    
    {/* Clear filters button */}
    <ClearFiltersButton
      onClear={clearFilters}
      isVisible={isFilterActive}
    />
  </div>
);
```

## Filter Logic Implementation

### Text Search Algorithm
```javascript
const applyTextSearch = (listings, searchTerm) => {
  const term = searchTerm.toLowerCase().trim();
  
  if (!term) return listings;

  return listings.filter(listing => {
    // Primary search fields (higher priority)
    const primaryFields = [
      listing.card?.name,
      listing.card?.set
    ];
    
    // Secondary search fields
    const secondaryFields = [
      listing.card?.category,
      listing.card?.brand,
      listing.note,
      listing.location
    ];
    
    // Check primary fields first
    const primaryMatch = primaryFields.some(field => 
      field?.toLowerCase().includes(term)
    );
    
    // Check secondary fields
    const secondaryMatch = secondaryFields.some(field => 
      field?.toLowerCase().includes(term)
    );
    
    return primaryMatch || secondaryMatch;
  });
};
```

### Grading Company Filter Logic
```javascript
const applyGradingCompanyFilter = (listings, gradingCompany) => {
  return listings.filter(listing => {
    const cardGrader = listing.card?.grader;
    
    if (gradingCompany === 'RAW') {
      // Show ungraded cards or cards explicitly marked as RAW
      return !cardGrader || cardGrader === 'RAW' || cardGrader === '';
    }
    
    // Match specific grading company
    return cardGrader === gradingCompany;
  });
};
```

### Combined Filter Application
```javascript
const applyAllFilters = (listings, filters) => {
  let filtered = [...listings];

  // Apply each filter in sequence
  if (filters.search) {
    filtered = applyTextSearch(filtered, filters.search);
  }

  if (filters.category) {
    filtered = filtered.filter(listing => 
      listing.card?.category === filters.category
    );
  }

  if (filters.gradingCompany) {
    filtered = applyGradingCompanyFilter(filtered, filters.gradingCompany);
  }

  if (filters.grade) {
    filtered = filtered.filter(listing => 
      listing.card?.grade === filters.grade
    );
  }

  return filtered;
};
```

## Performance Optimizations

### Debounced Search
```javascript
import { useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

const useDeboucedFilters = (onFilterChange, delay = 300) => {
  const debouncedFilterChange = useCallback(
    debounce(onFilterChange, delay),
    [onFilterChange, delay]
  );

  const handleImmediateChange = useCallback((newFilters) => {
    // Apply dropdown filters immediately
    if (newFilters.category !== undefined ||
        newFilters.gradingCompany !== undefined ||
        newFilters.grade !== undefined) {
      onFilterChange(newFilters);
    } else {
      // Debounce text search
      debouncedFilterChange(newFilters);
    }
  }, [onFilterChange, debouncedFilterChange]);

  return handleImmediateChange;
};
```

### Memoized Filter Results
```javascript
const useMemoizedFiltering = (listings, filters) => {
  const filteredListings = useMemo(() => {
    return applyAllFilters(listings, filters);
  }, [listings, filters]);

  const filterCounts = useMemo(() => ({
    total: listings.length,
    filtered: filteredListings.length,
    categories: getUniqueCategoryCounts(filteredListings),
    gradingCompanies: getUniqueGradingCompanyCounts(filteredListings)
  }), [listings, filteredListings]);

  return { filteredListings, filterCounts };
};
```

### Optimized Category Extraction
```javascript
const getUniqueCategoryCounts = useCallback((listings) => {
  const categoryMap = new Map();
  
  listings.forEach(listing => {
    const category = listing.card?.category;
    if (category) {
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }
  });
  
  return Object.fromEntries(
    Array.from(categoryMap.entries()).sort(([a], [b]) => a.localeCompare(b))
  );
}, []);
```

## Integration Points

### Parent Component Integration
```javascript
const MarketplaceWithFilters = () => {
  const [allListings, setAllListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const handleFilterChange = useCallback((newFilters) => {
    const filtered = applyAllFilters(allListings, newFilters);
    setFilteredListings(filtered);
    setCurrentPage(1); // Reset pagination
  }, [allListings]);

  return (
    <div>
      <MarketplaceSearchFilters
        onFilterChange={handleFilterChange}
        listings={allListings}
        initialFilters={initialFilters}
      />
      
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredListings.length} of {allListings.length} listings
      </div>
      
      <MarketplaceGrid listings={paginatedListings} />
      
      <MarketplacePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
```

### URL State Management
```javascript
const useFilterUrlState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const getFiltersFromUrl = useCallback(() => ({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    gradingCompany: searchParams.get('grading') || '',
    grade: searchParams.get('grade') || ''
  }), [searchParams]);

  const updateUrlFromFilters = useCallback((filters) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key === 'gradingCompany' ? 'grading' : key, value);
      }
    });
    
    setSearchParams(params);
  }, [setSearchParams]);

  return { getFiltersFromUrl, updateUrlFromFilters };
};
```

## Accessibility Features

### Keyboard Navigation
```javascript
const useKeyboardNavigation = () => {
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'Enter':
        if (e.target.type === 'text') {
          e.target.blur(); // Trigger search
        }
        break;
      case 'Escape':
        if (e.target.type === 'text') {
          e.target.value = '';
          e.target.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      default:
        break;
    }
  }, []);

  return { handleKeyDown };
};
```

### Screen Reader Support
```javascript
const AccessibleFilterSection = ({ children, resultCount }) => (
  <section aria-label="Search and filter options">
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {resultCount !== undefined && 
        `${resultCount} listings found with current filters`
      }
    </div>
    {children}
  </section>
);
```

## Error Handling

### Filter Validation
```javascript
const validateFilters = (filters) => {
  const errors = [];

  // Validate search term length
  if (filters.search && filters.search.length > 100) {
    errors.push('Search term too long');
  }

  // Validate grade selection
  if (filters.grade && !filters.gradingCompany) {
    errors.push('Grade requires grading company selection');
  }

  // Validate grading company and grade combination
  if (filters.gradingCompany && filters.grade) {
    const validGrades = getGradeOptionsForCompany(filters.gradingCompany);
    if (!validGrades.some(g => g.value === filters.grade)) {
      errors.push('Invalid grade for selected grading company');
    }
  }

  return errors;
};
```

### Graceful Degradation
```javascript
const FilterWithFallback = ({ listings, onFilterChange, ...props }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-200">
          Search filters are currently unavailable. Showing all listings.
        </p>
        <button
          onClick={() => setHasError(false)}
          className="mt-2 text-sm text-yellow-600 hover:text-yellow-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={() => setHasError(true)}>
      <MarketplaceSearchFilters
        listings={listings}
        onFilterChange={onFilterChange}
        {...props}
      />
    </ErrorBoundary>
  );
};
```

## Testing Strategy

### Unit Testing
```javascript
describe('MarketplaceSearchFilters', () => {
  test('applies text search correctly', () => {
    const listings = [
      { card: { name: 'Charizard' } },
      { card: { name: 'Pikachu' } },
      { card: { name: 'Blastoise' } }
    ];
    
    const result = applyTextSearch(listings, 'char');
    expect(result).toHaveLength(1);
    expect(result[0].card.name).toBe('Charizard');
  });

  test('filters by grading company correctly', () => {
    const listings = [
      { card: { grader: 'PSA' } },
      { card: { grader: 'BGS' } },
      { card: { grader: null } }
    ];
    
    const result = applyGradingCompanyFilter(listings, 'PSA');
    expect(result).toHaveLength(1);
    expect(result[0].card.grader).toBe('PSA');
  });

  test('handles raw cards filter correctly', () => {
    const listings = [
      { card: { grader: 'PSA' } },
      { card: { grader: null } },
      { card: { grader: '' } }
    ];
    
    const result = applyGradingCompanyFilter(listings, 'RAW');
    expect(result).toHaveLength(2);
  });
});
```

## Future Enhancements

### Advanced Search Features
- **Fuzzy Search**: Typo-tolerant search algorithm
- **Price Range Filter**: Min/max price filtering
- **Date Filters**: Recently listed, ending soon
- **Seller Rating Filter**: Minimum seller rating requirement

### Enhanced UX
- **Filter Presets**: Save and load common filter combinations
- **Search Suggestions**: Auto-complete and suggestion dropdown
- **Filter Analytics**: Popular searches and filter combinations
- **Visual Filter Indicators**: Badge system showing active filters

### Performance Improvements
- **Server-Side Filtering**: Move filtering to backend for large datasets
- **Elasticsearch Integration**: Advanced search capabilities
- **Filter Caching**: Cache frequent filter combinations
- **Progressive Enhancement**: Load advanced filters after basic functionality

This search and filter system provides comprehensive discovery capabilities while maintaining excellent performance and user experience across all marketplace interactions.
