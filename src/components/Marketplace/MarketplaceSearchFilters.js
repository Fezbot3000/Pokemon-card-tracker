import React, { useState, useEffect } from 'react';
import { Icon } from '../../design-system';

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

function MarketplaceSearchFilters({ onFilterChange, listings }) {
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    gradingCompany: '',
    grade: ''
  });

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
    'Other'
  ];
  
  // Grades based on selected grading company
  const [gradeOptions, setGradeOptions] = useState([]);

  // No need to extract grading companies from listings anymore
  // We're using the predefined list

  // Update grade options based on selected grading company
  useEffect(() => {
    if (!filters.gradingCompany) {
      setGradeOptions([{ value: '', label: 'All Grades' }]);
      return;
    }
    
    // Select the appropriate grade options based on the grading company
    switch(filters.gradingCompany) {
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
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If changing grading company, reset grade
    const updatedFilters = { 
      ...filters, 
      [name]: value,
      ...(name === 'gradingCompany' ? { grade: '' } : {})
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
      grade: ''
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="search" className="text-gray-400" />
        </div>
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleChange}
          placeholder="Search by card name, brand, category..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                     focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      {/* Filter dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Category filter */}
        <div>
          <select
            name="category"
            value={filters.category}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                       focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {predefinedCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        {/* Grading Company filter */}
        <div>
          <select
            name="gradingCompany"
            value={filters.gradingCompany}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                       focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {gradingCompaniesOptions.map(company => (
              <option key={company.value} value={company.value}>{company.label}</option>
            ))}
          </select>
        </div>
        
        {/* Grade filter - only enabled if grading company is selected */}
        <div>
          <select
            name="grade"
            value={filters.grade}
            onChange={handleChange}
            disabled={!filters.gradingCompany}
            className={`block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                      focus:outline-none focus:ring-1 focus:ring-blue-500
                      ${!filters.gradingCompany ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {gradeOptions.map(grade => (
              <option key={grade.value} value={grade.value}>{grade.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Clear filters button - only show if any filter is applied */}
      {(filters.search || filters.category || filters.gradingCompany || filters.grade) && (
        <div className="flex justify-end">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
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
