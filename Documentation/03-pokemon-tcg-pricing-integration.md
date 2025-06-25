# Pokemon TCG API Pricing Integration

This document explains the Pokemon TCG API pricing integration that allows users to automatically fetch current market prices for Pokemon cards.

## Overview

The Pokemon TCG API pricing integration provides:
- **Manual price fetching** for individual Pokemon cards
- **Automatic price updates** with 24-hour caching
- **Multiple price sources** (TCGPlayer, CardMarket)
- **Rate limiting** to respect API limits
- **Smart card matching** using name, set, and card number

## How It Works

### 1. User Interface

When viewing a Pokemon card in the Card Details modal, users will see a **"Fetch Price"** button (purple gradient) next to the existing "Reload PSA Data" button. This button:

- Only appears for cards with `category: 'pokemon'`
- Shows a loading spinner while fetching
- Is disabled during the fetch process
- Displays success/error messages via toast notifications

### 2. Price Fetching Process

1. **Card Information Extraction**: The system extracts:
   - Card name (`cardName` or `card` field)
   - Set name (`setName` or `set` field)  
   - Card number (`cardNumber` or `number` field)
   - Year (`year` field)

2. **API Search**: Searches the Pokemon TCG API using these parameters
3. **Price Selection**: Prioritizes prices in this order:
   - TCGPlayer Holofoil prices
   - TCGPlayer 1st Edition prices
   - TCGPlayer Normal prices
   - CardMarket prices

4. **Value Update**: Updates the card's `originalCurrentValueAmount` and `originalCurrentValueCurrency` fields

### 3. Caching System

- **Duration**: 24 hours
- **Storage**: Browser localStorage
- **Key Generation**: Based on card name, set name, and card number
- **Cache Management**: Automatic cleanup of expired entries

## API Configuration

### Architecture

The Pokemon TCG API integration uses **Firebase Cloud Functions** (following the same pattern as PSA integration) for secure API access and rate limiting.

### Rate Limits

- **With API Key**: 20,000 requests/day
- **Without API Key**: 1,000 requests/day, 30/minute
- **Automatic Rate Limiting**: Handled by Firebase Cloud Functions

### Configuration

**No frontend configuration needed!** The API key is configured in Firebase Functions:

```bash
# Optional - configure API key for higher rate limits
firebase functions:config:set pokemontcg.api_key="your_api_key_here"
```

Or use the deployment script:
```bash
./deploy-functions.sh "stripe_key" "webhook_secret" "pokemon_tcg_api_key"
```

Get your API key at: https://dev.pokemontcg.io/

## Usage Instructions

### For Users

1. **Open Card Details**: Click on any Pokemon card to open the details modal
2. **Ensure Required Fields**: Make sure the card has:
   - Card name filled in
   - Category set to "Pokemon"
3. **Fetch Price**: Click the purple "Fetch Price" button
4. **Wait for Results**: The system will:
   - Search for the card in the Pokemon TCG API
   - Find the best matching card
   - Extract current market pricing
   - Update the "Current Value" field automatically
5. **Save Changes**: Click "Save" to persist the updated price

### Price Sources Explained

- **TCGPlayer**: US-based marketplace (prices in USD)
- **CardMarket**: European marketplace (prices in EUR)
- **Market Price**: The actual market value (preferred over mid/average prices)

## Technical Implementation

### Service Architecture

```
src/services/pokemonTcgPricing.js
├── fetchCardPrice()        # Main function for single card
├── searchPokemonCard()     # Search API for matching cards
├── extractPriceInfo()      # Extract price data from API response
├── getBestMarketPrice()    # Select best available price
└── Cache Management        # localStorage-based caching
```

### Integration Points

1. **CardDetailsForm**: Added `onFetchPrice` and `isFetchingPrice` props
2. **CardDetailsModal**: Handles price fetching logic and UI updates
3. **Secrets Management**: Manages API key configuration
4. **User Preferences**: Respects currency conversion settings

### Error Handling

- **No Card Found**: Shows "No Pokemon cards found matching: [name]"
- **No Pricing**: Shows "No pricing information available for: [name]"  
- **API Errors**: Shows "Pokemon TCG API error: [status] [message]"
- **Network Issues**: Shows "Failed to fetch price: [error message]"

## Future Enhancements

### Planned Features

1. **Bulk Price Updates**: Update prices for entire collections
2. **Automated Daily Updates**: Background price refreshing
3. **Price History Tracking**: Track price changes over time
4. **Price Alerts**: Notify users of significant price changes
5. **Graded Card Pricing**: Support for PSA/BGS graded card prices

### Configuration Options

Future settings panel will include:
- **Auto-update frequency**: Daily, weekly, monthly
- **Price source preference**: TCGPlayer vs CardMarket
- **Currency conversion**: Automatic vs manual
- **Cache duration**: Configurable cache expiry

## Troubleshooting

### Common Issues

1. **"Card name is required"**
   - Ensure the `cardName` field is filled in
   - Check that the card category is set to "Pokemon"

2. **"No Pokemon cards found"**
   - Try simplifying the card name (remove special characters)
   - Check the set name spelling
   - Verify the year is correct

3. **"No pricing information available"**
   - The card may be too new or too obscure
   - Try a different variant of the same card
   - Check if the card is actually a Pokemon card

4. **Rate limiting errors**
   - Wait a few minutes before trying again
   - Consider getting an API key for higher limits

### Debug Information

Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'pokemonTcgPricing');
```

This will log detailed information about:
- API requests and responses
- Cache hits and misses
- Price selection logic
- Error details

## API Reference

### Pokemon TCG API Documentation
- **Base URL**: https://api.pokemontcg.io/v2
- **Documentation**: https://docs.pokemontcg.io/
- **Rate Limits**: https://docs.pokemontcg.io/getting-started/rate-limits

### Supported Card Fields

The system uses these card fields for price fetching:
- `cardName` or `card`: Primary card name
- `setName` or `set`: Pokemon set name
- `cardNumber` or `number`: Card number within set
- `year`: Release year for filtering

### Price Data Structure

Fetched prices are stored as:
```javascript
{
  originalCurrentValueAmount: 15.99,      // Numeric price value
  originalCurrentValueCurrency: "USD",    // Currency code
  lastPriceUpdate: "2024-01-15T10:30:00Z", // ISO timestamp
  priceSource: "tcgplayer_holofoil",      // Price source identifier
  apiSource: "pokemon-tcg-api"            // API used for fetching
}
``` 