import React, { useState, useEffect } from 'react';
import { Icon, SimpleSearchBar, Button } from '../../design-system';
import { useAuth } from '../../design-system';
import CustomDropdown from '../../design-system/molecules/CustomDropdown';

// Import the same predefined grading companies and grades used in CardDetailsForm
const gradingCompaniesOptions = [
  { value: '', label: 'All Grading Companies' },
  { value: 'PSA', label: 'PSA' },
  { value: 'BGS', label: 'BGS (Beckett)' },
  { value: 'CGC', label: 'CGC' },
  { value: 'SGC', label: 'SGC' },
  { value: 'RAW', label: 'Raw/Ungraded' },
];

// PSA grades
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

// BGS grades
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

// CGC grades
const cgcGrades = [
  { value: '', label: 'All Grades' },
  { value: '10P', label: 'CGC 10 Perfect' },
  { value: '10', label: 'CGC 10 Pristine' },
  { value: '9.5', label: 'CGC 9.5 Gem Mint' },
  { value: '9', label: 'CGC 9 Mint' },
  { value: '8.5', label: 'CGC 8.5 NM-Mint+' },
  { value: '8', label: 'CGC 8 NM-Mint' },
  { value: '7.5', label: 'CGC 7.5 Near Mint+' },
  { value: '7', label: 'CGC 7 Near Mint' },
  { value: '6.5', label: 'CGC 6.5 EX-Mint+' },
  { value: '6', label: 'CGC 6 EX-Mint' },
  { value: '5.5', label: 'CGC 5.5 Excellent+' },
  { value: '5', label: 'CGC 5 Excellent' },
  { value: '4', label: 'CGC 4 VG-EX' },
  { value: '3', label: 'CGC 3 Very Good' },
  { value: '2', label: 'CGC 2 Good' },
  { value: '1', label: 'CGC 1 Poor' },
  { value: 'A', label: 'CGC Authentic' },
];

// SGC grades
const sgcGrades = [
  { value: '', label: 'All Grades' },
  { value: '10P', label: 'SGC 10 Pristine Gold Label' },
  { value: '10', label: 'SGC 10 Gem Mint' },
  { value: '9.5', label: 'SGC 9.5 Mint+' },
  { value: '9', label: 'SGC 9 Mint' },
  { value: '8.5', label: 'SGC 8.5 NM-Mint+' },
  { value: '8', label: 'SGC 8 NM-Mint' },
  { value: '7.5', label: 'SGC 7.5 Near Mint+' },
  { value: '7', label: 'SGC 7 Near Mint' },
  { value: '6', label: 'SGC 6 EX-Mint' },
  { value: '5', label: 'SGC 5 Excellent' },
  { value: '4', label: 'SGC 4 VG-EX' },
  { value: '3', label: 'SGC 3 Very Good' },
  { value: '2', label: 'SGC 2 Good' },
  { value: '1', label: 'SGC 1 Poor' },
  { value: 'A', label: 'SGC Authentic' },
];

// Raw conditions
const rawConditions = [
  { value: '', label: 'All Conditions' },
  { value: 'Mint', label: 'Mint' },
  { value: 'Near Mint', label: 'Near Mint' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good', label: 'Good' },
  { value: 'Played', label: 'Played' },
  { value: 'Poor', label: 'Poor' },
];

function MarketplaceSearchFilters({
  onFilterChange,
  initialFilters,
}) {
  const { user } = useAuth();
  // Filter state
  const [filters, setFilters] = useState(
    initialFilters || {
      search: '',
      category: '',
      gradingCompany: '',
      grade: '',
      following: false,
    }
  );

  // Predefined categories
  const predefinedCategories = [
    'Pokemon',
    'Magic: The Gathering',
    'Yu-Gi-Oh',
    'Digimon',
    'One Piece',
    'Dragon Ball Z',
    'NBA',
    'NFL',
    'MLB/Baseball',
    'NRL',
    'Soccer',
    'UFC',
    'Formula 1',
    'Marvel',
    'WWE',
    'Other Sports',
    'Other',
  ];

  // Grades based on selected grading company
  const [gradeOptions, setGradeOptions] = useState([]);

  // Update filters when initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  // No need to extract grading companies from listings anymore
  // We're using the predefined list

  // Update grade options based on selected grading company
  useEffect(() => {
    if (!filters.gradingCompany) {
      setGradeOptions([{ value: '', label: 'All Grades' }]);
      return;
    }

    // Select the appropriate grade options based on the grading company
    switch (filters.gradingCompany) {
      case 'PSA':
        setGradeOptions(psaGrades);
        break;
      case 'BGS':
        setGradeOptions(bgsGrades);
        break;
      case 'CGC':
        setGradeOptions(cgcGrades);
        break;
      case 'SGC':
        setGradeOptions(sgcGrades);
        break;
      case 'RAW':
        setGradeOptions(rawConditions);
        break;
      default:
        setGradeOptions([{ value: '', label: 'All Grades' }]);
    }
  }, [filters.gradingCompany]);

  // Handle input changes
  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    // Handle checkbox inputs
    const newValue = type === 'checkbox' ? checked : value;

    // If changing grading company, reset grade
    const updatedFilters = {
      ...filters,
      [name]: newValue,
      ...(name === 'gradingCompany' ? { grade: '' } : {}),
    };

    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Handle following filter toggle
  const handleFollowingToggle = () => {
    const updatedFilters = {
      ...filters,
      following: !filters.following,
    };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const resetFilters = {
      search: '',
      category: '',
      gradingCompany: '',
      grade: '',
      following: false,
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  // Handle search change separately to maintain compatibility
  const handleSearchChange = value => {
    const updatedFilters = { ...filters, search: value };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Search input */}
      <SimpleSearchBar
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        placeholder="Search by card name, brand, category..."
      />

      {/* Following filter toggle - only show if user is authenticated */}
      {user && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleFollowingToggle}
              variant={filters.following ? "primary" : "secondary"}
              size="sm"
              className={`
                transition-all duration-200
                ${filters.following 
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-purple-500 hover:from-purple-600 hover:to-blue-600' 
                  : 'bg-white border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400 dark:bg-gray-800 dark:text-purple-400 dark:border-purple-400 dark:hover:bg-purple-900/20'
                }
              `}
            >
              <Icon 
                name={filters.following ? "favorite" : "favorite_border"} 
                size="xs" 
                className="mr-1" 
              />
              {filters.following ? "Following Only" : "Show Following"}
            </Button>
          </div>
        </div>
      )}

      {/* Filter dropdowns */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* Category filter */}
        <div>
          <CustomDropdown
            name="category"
            value={filters.category}
            onSelect={handleChange}
            placeholder="All Categories"
            options={predefinedCategories.map(category => ({
              value: category,
              label: category
            }))}
          />
        </div>

        {/* Grading Company filter */}
        <div>
          <CustomDropdown
            name="gradingCompany"
            value={filters.gradingCompany}
            onSelect={handleChange}
            options={gradingCompaniesOptions}
          />
        </div>

        {/* Grade filter - only enabled if grading company is selected */}
        <div>
          <CustomDropdown
            name="grade"
            value={filters.grade}
            onSelect={handleChange}
            disabled={!filters.gradingCompany}
            options={gradeOptions}
          />
        </div>
      </div>

      {/* Clear filters button - only show if any filter is applied */}
      {(filters.search ||
        filters.category ||
        filters.gradingCompany ||
        filters.grade ||
        filters.following) && (
        <div className="flex justify-end">
          <button
            onClick={clearFilters}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Icon name="close" className="mr-1 text-sm" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

export default MarketplaceSearchFilters;
