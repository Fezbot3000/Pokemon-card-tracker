import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '../../../design-system';

/**
 * NavigationSection - Displays navigation component examples and variations
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Active tab value
 * @param {string} props.activeBreadcrumb - Active breadcrumb value
 * @param {Function} props.handleTabChange - Handler for tab changes
 * @param {Function} props.handleBreadcrumbChange - Handler for breadcrumb changes
 */
const NavigationSection = ({
  activeTab,
  activeBreadcrumb,
  handleTabChange,
  handleBreadcrumbChange,
}) => {
  /**
   * Renders a navigation example
   * 
   * @param {string} title - Example title
   * @param {JSX.Element} element - Navigation element
   * @param {string} description - Example description
   * @returns {JSX.Element} Navigation example
   */
  const renderNavigationExample = (title, element, description) => (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        {title}
      </h4>
      <div className="mb-3">
        {element}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );

  /**
   * Renders tab navigation examples
   * 
   * @returns {JSX.Element} Tab examples
   */
  const renderTabExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Tab Navigation
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderNavigationExample(
          'Basic Tabs',
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleTabChange('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => handleTabChange('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => handleTabChange('reports')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Reports
              </button>
            </nav>
          </div>,
          'Horizontal tab navigation with active states'
        )}
        
        {renderNavigationExample(
          'Vertical Tabs',
          <div className="flex">
            <nav className="w-48 border-r border-gray-200 dark:border-gray-700">
              <div className="space-y-1">
                <button
                  onClick={() => handleTabChange('overview')}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'overview'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => handleTabChange('analytics')}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'analytics'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => handleTabChange('reports')}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'reports'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                  }`}
                >
                  Reports
                </button>
              </div>
            </nav>
            <div className="flex-1 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Content for {activeTab} tab
              </p>
            </div>
          </div>,
          'Vertical tab navigation with sidebar layout'
        )}
        
        {renderNavigationExample(
          'Pill Tabs',
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
            <button
              onClick={() => handleTabChange('overview')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleTabChange('analytics')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => handleTabChange('reports')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'reports'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Reports
            </button>
          </div>,
          'Pill-style tab navigation with rounded corners'
        )}
        
        {renderNavigationExample(
          'Icon Tabs',
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleTabChange('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                <span>Overview</span>
              </button>
              <button
                onClick={() => handleTabChange('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                <span>Analytics</span>
              </button>
              <button
                onClick={() => handleTabChange('reports')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>Reports</span>
              </button>
            </nav>
          </div>,
          'Tab navigation with icons and labels'
        )}
      </div>
    </div>
  );

  /**
   * Renders breadcrumb examples
   * 
   * @returns {JSX.Element} Breadcrumb examples
   */
  const renderBreadcrumbExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Breadcrumb Navigation
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderNavigationExample(
          'Basic Breadcrumbs',
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <button
                  onClick={() => handleBreadcrumbChange('home')}
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Home
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <button
                    onClick={() => handleBreadcrumbChange('projects')}
                    className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-gray-400 dark:hover:text-white"
                  >
                    Projects
                  </button>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                    {activeBreadcrumb}
                  </span>
                </div>
              </li>
            </ol>
          </nav>,
          'Standard breadcrumb navigation with separators'
        )}
        
        {renderNavigationExample(
          'Simple Breadcrumbs',
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-2">
              <li>
                <button
                  onClick={() => handleBreadcrumbChange('home')}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Home
                </button>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <button
                  onClick={() => handleBreadcrumbChange('projects')}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Projects
                </button>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <span className="text-sm text-gray-900 dark:text-white font-medium">
                  {activeBreadcrumb}
                </span>
              </li>
            </ol>
          </nav>,
          'Minimal breadcrumb with simple separators'
        )}
        
        {renderNavigationExample(
          'Breadcrumbs with Icons',
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <button
                  onClick={() => handleBreadcrumbChange('home')}
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Home
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <button
                    onClick={() => handleBreadcrumbChange('projects')}
                    className="ml-1 inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-gray-400 dark:hover:text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" />
                      <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Projects
                  </button>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 inline-flex items-center text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {activeBreadcrumb}
                  </span>
                </div>
              </li>
            </ol>
          </nav>,
          'Breadcrumb navigation with contextual icons'
        )}
      </div>
    </div>
  );

  /**
   * Renders pagination examples
   * 
   * @returns {JSX.Element} Pagination examples
   */
  const renderPaginationExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Pagination
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderNavigationExample(
          'Basic Pagination',
          <nav className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Previous
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of{' '}
                  <span className="font-medium">97</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300">
                    1
                  </button>
                  <button className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                    2
                  </button>
                  <button className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                    3
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400">
                    ...
                  </span>
                  <button className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                    8
                  </button>
                  <button className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                    9
                  </button>
                  <button className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                    10
                  </button>
                  <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </nav>,
          'Standard pagination with page numbers and navigation'
        )}
        
        {renderNavigationExample(
          'Simple Pagination',
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                Page 1 of 10
              </span>
              <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                Next
              </button>
            </div>
          </div>,
          'Minimal pagination with previous/next buttons'
        )}
      </div>
    </div>
  );

  /**
   * Renders navigation anatomy
   * 
   * @returns {JSX.Element} Navigation anatomy
   */
  const renderNavigationAnatomy = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Navigation Anatomy
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
            <span className="text-xs text-gray-500">Active State</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Active State</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Current page or selection</p>
        </div>
        
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
            <span className="text-xs text-gray-500">Hover State</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Hover State</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Interactive feedback</p>
        </div>
        
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
            <span className="text-xs text-gray-500">Disabled State</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Disabled State</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Non-interactive elements</p>
        </div>
        
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
            <span className="text-xs text-gray-500">Separators</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Separators</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Visual dividers</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Navigation Components
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Explore navigation components that help users move through your application. 
          These components provide clear wayfinding and improve user experience.
        </p>
      </div>

      {/* Tab Examples */}
      {renderTabExamples()}

      {/* Breadcrumb Examples */}
      {renderBreadcrumbExamples()}

      {/* Pagination Examples */}
      {renderPaginationExamples()}

      {/* Navigation Anatomy */}
      {renderNavigationAnatomy()}

      {/* Usage Guidelines */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Navigation Usage Guidelines
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <strong>Consistency:</strong> Use consistent navigation patterns throughout your application
          </div>
          <div>
            <strong>Accessibility:</strong> Ensure all navigation is keyboard accessible
          </div>
          <div>
            <strong>Clear Labels:</strong> Use descriptive labels that clearly indicate destination
          </div>
          <div>
            <strong>Visual Hierarchy:</strong> Use visual cues to show current location and available options
          </div>
          <div>
            <strong>Mobile Responsive:</strong> Ensure navigation works well on all screen sizes
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
          Accessibility Features
        </h3>
        <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
          <div>• All navigation elements are keyboard accessible</div>
          <div>• Proper ARIA labels and roles implemented</div>
          <div>• Current page/state clearly indicated</div>
          <div>• Focus indicators visible for keyboard navigation</div>
        </div>
      </div>
    </div>
  );
};

NavigationSection.propTypes = {
  activeTab: PropTypes.string.isRequired,
  activeBreadcrumb: PropTypes.string.isRequired,
  handleTabChange: PropTypes.func.isRequired,
  handleBreadcrumbChange: PropTypes.func.isRequired,
};

export default NavigationSection; 