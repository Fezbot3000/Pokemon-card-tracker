import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const ToastMessagesComponent = ({ 
  config, 
  isDarkMode, 
  getTypographyStyle, 
  getTextColorStyle, 
  getBackgroundColorStyle,
  getSurfaceStyle,
  getInteractiveStyle,
  getPrimaryButtonStyle,
  colors
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

    // Cleaned and standardized toast messages (duplicates removed, similar ones merged)
  const toastMessages = {
    success: [
      // Card Operations
      'Card saved successfully',
      'Card deleted successfully', 
      'Card marked as sold',
      '${count} cards deleted successfully',
      'Successfully moved ${count} cards to "${collection}"',
      
      // Collections
      'Collection created successfully',
      'Collection deleted successfully',
      'Collection renamed successfully',
      'Collections refreshed successfully',
      'Share link copied to clipboard',
      
      // Data Operations
      'Data imported successfully (${count} items)',
      'Prices updated for ${count} cards',
      'Backup completed successfully',
      'Data restored successfully',
      'Personal data export created successfully',
      'Image uploaded successfully',
      
      // Authentication
      'Signed in successfully',
      'Signed out successfully',
      'Password reset email sent',
      'Welcome! Your 7-day free trial has started',
      
      // PSA & Price Services
      'PSA data applied successfully',
      'Price Charting data applied successfully',
      'Found ${count} matches (${confidence}% confidence)',
      
      // Marketplace & Communication
      'Listing created successfully',
      'Listing updated successfully',
      'Listing deleted successfully',
      'Message sent successfully',
      'Review submitted successfully',
      'Report submitted successfully',
      'Left chat successfully'
    ],
    
    error: [
      // Authentication & Access
      'You must be logged in to perform this action',
      'Session expired. Please log in again',
      'Premium feature - upgrade required',
      
      // Card Operations
      'Failed to save card: ${reason}',
      'Failed to delete card: ${reason}',
      'Failed to load cards: ${reason}',
      'Please select at least one card',
      'Invalid card data provided',
      
      // Collections
      'Failed to create collection: ${reason}',
      'Failed to delete collection: ${reason}',
      'Collection "${name}" already exists',
      'Collection not found',
      'Please select a collection',
      
      // Data Operations
      'Failed to import data: ${reason}',
      'Failed to export data: ${reason}',
      'Failed to backup data: ${reason}',
      'Failed to restore data: ${reason}',
      'Database connection failed',
      'No backup found',
      'Storage quota exceeded',
      
      // PSA & Price Services
      'PSA search failed: ${reason}',
      'Please enter a PSA serial number',
      'No PSA data found for this number',
      'Price Charting search failed: ${reason}',
      'No price data available',
      'Please select a product first',
      
      // Images & Files
      'Invalid file type. Please select an image',
      'Failed to upload image: ${reason}',
      'File read error occurred',
      
      // Marketplace & Communication
      'Failed to create listing: ${reason}',
      'Failed to update listing: ${reason}',
      'Failed to delete listing: ${reason}',
      'Please enter a price',
      'Please select a buyer',
      'Chat unavailable or closed',
      'Failed to send message: ${reason}',
      'Please select a rating',
      'Please select a reason for reporting',
      
      // Network & System
      'Network error. Please try again',
      'Server error occurred',
      'Feature temporarily unavailable',
      'Operation failed. Please try again'
    ],
    
    loading: [
      // General Operations
      'Saving...',
      'Loading...',
      'Processing...',
      'Deleting...',
      
      // Data Operations
      'Importing data...',
      'Exporting data...',
      'Creating backup...',
      'Restoring backup... (${percent}%)',
      'Uploading image...',
      
      // PSA & Services
      'Searching PSA database...',
      'Searching Price Charting...',
      
      // Collections & Cards
      'Moving ${count} cards...',
      'Deleting collection...',
      'Creating collection...',
      
      // Marketplace
      'Creating listing...',
      'Sending message...'
    ],
    
    warning: [
      'Some items could not be processed',
      'Partial operation completed: ${success} succeeded, ${failed} failed',
      'Changes may not persist due to connection issues'
    ],
    
    info: [
      'Processing in background...',
      'Operation queued for processing',
      'Refresh page to see latest changes'
    ]
  };

  const categories = [
    { id: 'all', label: 'All Messages', count: Object.values(toastMessages).flat().length },
    { id: 'success', label: 'Success', count: toastMessages.success.length },
    { id: 'error', label: 'Error', count: toastMessages.error.length },
    { id: 'loading', label: 'Loading', count: toastMessages.loading.length },
    { id: 'warning', label: 'Warning', count: toastMessages.warning.length },
    { id: 'info', label: 'Info', count: toastMessages.info.length }
  ];

  const filteredMessages = () => {
    let messages = selectedCategory === 'all' 
      ? Object.entries(toastMessages).flatMap(([type, msgs]) => msgs.map(msg => ({ type, message: msg })))
      : toastMessages[selectedCategory]?.map(msg => ({ type: selectedCategory, message: msg })) || [];

    if (searchTerm) {
      messages = messages.filter(({ message }) => 
        message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return messages;
  };

  const getToastTypeColor = (type) => {
    switch (type) {
      case 'success': return colors.success;
      case 'error': return colors.error;
      case 'warning': return colors.warning;
      case 'info': return colors.info;
      case 'loading': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      case 'loading': return '⟳';
      default: return '';
    }
  };

  const handleTestToast = (type, message) => {
    switch (type) {
      case 'success':
        toast.success(message.replace(/\$\{[^}]*\}/g, '3'));
        break;
      case 'error':
        toast.error(message.replace(/\$\{[^}]*\}/g, 'example'));
        break;
      case 'warning':
        toast.warning ? toast.warning(message.replace(/\$\{[^}]*\}/g, '2')) : toast(message.replace(/\$\{[^}]*\}/g, '2'));
        break;
      case 'info':
        toast.info ? toast.info(message.replace(/\$\{[^}]*\}/g, 'example')) : toast(message.replace(/\$\{[^}]*\}/g, 'example'));
        break;
      case 'loading':
        toast.loading(message.replace(/\$\{[^}]*\}/g, '50'));
        break;
      default:
        toast(message.replace(/\$\{[^}]*\}/g, 'example'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div style={{
          ...getTypographyStyle('heading'),
          fontSize: '24px',
          fontWeight: '600',
          ...getTextColorStyle('primary')
        }}>
          Toast Messages Library
        </div>
        <div style={{
          ...getTypographyStyle('body'),
          ...getTextColorStyle('secondary'),
          marginTop: '8px'
        }}>
          Complete collection of all toast messages used across the application. Click any message to test it.
        </div>
      </div>

      {/* Search Bar */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
          style={{
            ...getSurfaceStyle('secondary'),
            ...getTypographyStyle('body'),
            ...getTextColorStyle('primary'),
            border: `1px solid ${colors.border}`,
            '--tw-ring-color': `${colors.primary}33`
          }}
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className="px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              ...getTypographyStyle('button'),
              ...(selectedCategory === category.id 
                ? getPrimaryButtonStyle()
                : {
                    ...getSurfaceStyle('secondary'),
                    ...getTextColorStyle('primary'),
                    border: `1px solid ${colors.border}`
                  }
              )
            }}
          >
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {filteredMessages().map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer"
            style={{
              ...getSurfaceStyle('secondary'),
              borderColor: colors.border,
              borderLeftWidth: '4px',
              borderLeftColor: getToastTypeColor(item.type)
            }}
            onClick={() => handleTestToast(item.type, item.message)}
          >
            <div className="flex items-start gap-3">
                             <div 
                 className="shrink-0 size-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                 style={{ backgroundColor: getToastTypeColor(item.type) }}
               >
                {getToastIcon(item.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="text-xs px-2 py-1 rounded-full uppercase font-semibold"
                    style={{
                      backgroundColor: `${getToastTypeColor(item.type)}20`,
                      color: getToastTypeColor(item.type)
                    }}
                  >
                    {item.type}
                  </span>
                </div>
                <div style={{
                  ...getTypographyStyle('body'),
                  ...getTextColorStyle('primary'),
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}>
                  {item.message}
                </div>
              </div>
              <div className="text-xs opacity-50 hover:opacity-100 transition-opacity">
                Click to test
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 rounded-lg" style={{
        ...getSurfaceStyle('secondary'),
        border: `1px solid ${colors.border}`
      }}>
                 <div style={{
           ...getTypographyStyle('body'),
           ...getTextColorStyle('primary'),
           fontWeight: '600',
           marginBottom: '8px'
         }}>
           Cleaned Toast Messages Summary
         </div>
         <div style={{
           ...getTypographyStyle('body'),
           ...getTextColorStyle('secondary'),
           fontSize: '14px',
           marginBottom: '8px'
         }}>
           <strong>Total Messages:</strong> {Object.values(toastMessages).flat().length} (reduced from 275+) • 
           <strong>Success:</strong> {toastMessages.success.length} • 
           <strong>Error:</strong> {toastMessages.error.length} • 
           <strong>Loading:</strong> {toastMessages.loading.length} • 
           <strong>Warning:</strong> {toastMessages.warning.length} • 
           <strong>Info:</strong> {toastMessages.info.length}
         </div>
         <div style={{
           ...getTypographyStyle('body'),
           ...getTextColorStyle('secondary'),
           fontSize: '12px',
           fontStyle: 'italic'
         }}>
           ✨ Cleaned up: Removed duplicates, merged similar messages, standardized formatting, 
           consolidated error patterns, and created reusable variable templates ($count, $reason, etc.)
         </div>
      </div>
    </div>
  );
};

export default ToastMessagesComponent; 