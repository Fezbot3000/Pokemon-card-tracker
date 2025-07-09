Compiled with warnings.

[eslint] 
src\components\CardDetails.js
  Line 116:50:  The ref value 'messageTimeoutRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'messageTimeoutRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps
  Line 132:8:   React Hook useEffect has missing dependencies: 'cardImage' and 'loadCardImage'. Either include them or remove the dependency array                                                                                
                                                                 react-hooks/exhaustive-deps
  Line 171:8:   React Hook useEffect has a missing dependency: 'handleClose'. Either include it or remove the dependency array                                                                                                    
                                                                 react-hooks/exhaustive-deps
  Line 224:8:   React Hook useCallback has missing dependencies: 'editedCard.id' and 'editedCard.slabSerial'. Either include them or remove the dependency array                                                                  
                                                                 react-hooks/exhaustive-deps

src\components\CardList.js
  Line 491:5:    React Hook useCallback has unnecessary dependencies: 'cardImages' and 'cards'. Either exclude them or remove the dependency array  react-hooks/exhaustive-deps
  Line 1324:16:  Invalid Tailwind CSS classnames order                                                           
                                   tailwindcss/classnames-order

src\components\CollectionSharing.js
  Line 73:6:  React Hook useEffect has a missing dependency: 'loadSharedCollections'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\ESLintDebugger.js
  Line 74:6:  React Hook useEffect has a missing dependency: 'fetchLintResults'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\ForgotPassword.js
  Line 55:10:  Classname 'page-no-padding' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\components\HelpCenter.js
  Line 444:6:  React Hook useMemo has a missing dependency: 'helpArticles'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Home.js
  Line 473:30:  Do not use Array index in keys  react/no-array-index-key

src\components\Marketplace\BuyerSelectionModal.js
  Line 34:6:  React Hook useEffect has a missing dependency: 'fetchPotentialBuyers'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Marketplace\DesktopMarketplaceMessages.js
  Line 205:6:  React Hook useEffect has a missing dependency: 'activeChat'. Either include it or remove the dependency array      react-hooks/exhaustive-deps
  Line 354:6:  React Hook useEffect has a missing dependency: 'loadCardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Marketplace\ListCardModal.js
  Line 74:6:  React Hook useEffect has a missing dependency: 'userLocation'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Marketplace\ListingDetailModal.js
  Line 135:6:   React Hook useEffect has a missing dependency: 'checkForExistingChat'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  Line 475:28:  Do not use Array index in keys                                                                   
                        react/no-array-index-key

src\components\Marketplace\Marketplace.js
  Line 214:6:  React Hook useEffect has a missing dependency: 'loadCardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Marketplace\MarketplacePagination.js
  Line 70:18:  Do not use Array index in keys  react/no-array-index-key

src\components\Marketplace\MarketplaceSelling.js
  Line 162:6:  React Hook useEffect has a missing dependency: 'loadCardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\MoveCardsModal.js
  Line 102:15:  Classname 'focus:ring-[var(--primary-default)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\components\NewCollectionModal.js
  Line 98:13:  Classname 'focus:ring-[var(--primary-default)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\components\PSADetailModal.js
  Line 77:38:  'applyPSADetails' was used before it was defined                                                  
                                                                                                no-use-before-define
  Line 80:9:   The 'applyPSADetails' function makes the dependencies of useEffect Hook (at line 77) change on every render. To fix this, wrap the definition of 'applyPSADetails' in its own useCallback() Hook  react-hooks/exhaustive-deps

src\components\PriceChartingModal.js
  Line 210:33:  Invalid Tailwind CSS classnames order          tailwindcss/classnames-order
  Line 210:33:  Classname 'bg-' is not a Tailwind CSS class!   tailwindcss/no-custom-classname
  Line 210:33:  Classname '-500' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\components\PublicMarketplace.js
  Line 218:6:  React Hook useEffect has a missing dependency: 'loadCardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\PurchaseInvoices\PurchaseInvoices.js
  Line 620:30:  Do not use Array index in keys  react/no-array-index-key
  Line 653:24:  Do not use Array index in keys  react/no-array-index-key

src\components\SharedCollection.js
  Line 96:6:  React Hook useEffect has a missing dependency: 'loadSharedCollection'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\SharingQuickStart.js
  Line 265:20:  Do not use Array index in keys  react/no-array-index-key

src\components\UpgradeModal.js
  Line 131:7:  Classname 'upgrade-modal' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\contexts\CardContext.js
  Line 66:6:  React Hook useEffect has a missing dependency: 'loadInitialData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\contexts\UserPreferencesContext.js
  Line 307:6:  React Hook useEffect has missing dependencies: 'preferredCurrency' and 'saveUserPreferencesToFirestore'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

src\design-system\components\CardDetailsModal.js
  Line 687:3:  'onDelete' PropType is defined but prop is never used                 react/no-unused-prop-types  
  Line 691:3:  'imageLoadingState' PropType is defined but prop is never used        react/no-unused-prop-types  
  Line 695:3:  'additionalHeaderContent' PropType is defined but prop is never used  react/no-unused-prop-types  

src\design-system\components\CardOptimized.js
  Line 158:17:  Classname 'card-title' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\design-system\components\CollectionSelector.js
  Line 242:15:  Classname 'focus:ring-[var(--primary-default)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\design-system\components\Header.js
  Line 30:9:   Unexpected empty object pattern                             no-empty-pattern
  Line 457:3:  'onImportClick' PropType is defined but prop is never used  react/no-unused-prop-types

src\design-system\components\SearchToolbar.js
  Line 105:11:  Classname 'focus:ring-[var(--primary-light)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\design-system\components\SimpleSearchBar.js
  Line 36:11:  Classname 'focus:ring-[var(--primary-light)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\design-system\components\SoldItemsView.js
  Line 25:9:  Unexpected empty object pattern  no-empty-pattern

src\design-system\molecules\BottomSheet.js
  Line 4:10:  'useTheme' is defined but never used  @typescript-eslint/no-unused-vars

src\design-system\molecules\FormField.js
  Line 30:7:   Classname 'error' is not a Tailwind CSS class!       tailwindcss/no-custom-classname
  Line 30:7:   Classname 'form-field' is not a Tailwind CSS class!  tailwindcss/no-custom-classname
  Line 35:30:  Classname 'required' is not a Tailwind CSS class!    tailwindcss/no-custom-classname

src\design-system\molecules\Modal.js
  Line 3:8:    'Button' is defined but never used                                                                
                                                                                         @typescript-eslint/no-unused-vars
  Line 22:3:   'showOverlay' is assigned a value but never used                                                  
                                                                                         @typescript-eslint/no-unused-vars
  Line 32:10:  'isMounted' is assigned a value but never used                                                    
                                                                                         @typescript-eslint/no-unused-vars
  Line 86:9:   The 'handleClose' function makes the dependencies of useEffect Hook (at line 169) change on every render. To fix this, wrap the definition of 'handleClose' in its own useCallback() Hook  react-hooks/exhaustive-deps
  Line 237:9:  'closeButtonClasses' is assigned a value but never used                                           
                                                                                         @typescript-eslint/no-unused-vars

src\design-system\molecules\SettingsPanel.js
  Line 14:3:  'expandable' is defined but never used  @typescript-eslint/no-unused-vars

src\design-system\molecules\invoice\InvoiceCard.js
  Line 12:3:  'getImageUrl' is defined but never used              @typescript-eslint/no-unused-vars
  Line 15:3:  'hideSoldImages' is assigned a value but never used  @typescript-eslint/no-unused-vars

src\firebase.js
  Line 10:3:  'getFirestore' is defined but never used              @typescript-eslint/no-unused-vars
  Line 11:3:  'connectFirestoreEmulator' is defined but never used  @typescript-eslint/no-unused-vars

src\hooks\useCardData.js
  Line 4:3:     'processImportedData' is defined but never used    @typescript-eslint/no-unused-vars
  Line 178:15:  'existingCard' is assigned a value but never used  @typescript-eslint/no-unused-vars

src\hooks\useLazyImage.js
  Line 66:40:  The ref value 'imageRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'imageRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

src\services\LoggingService.js
  Line 19:7:    'isTest' is assigned a value but never used     @typescript-eslint/no-unused-vars
  Line 255:48:  'timestamp' is assigned a value but never used  @typescript-eslint/no-unused-vars
  Line 322:17:  'logEntry' is defined but never used            @typescript-eslint/no-unused-vars

src\services\appInitialization.js
  Line 9:10:   'initializeApp' is defined but never used  @typescript-eslint/no-unused-vars
  Line 10:10:  'getFirestore' is defined but never used   @typescript-eslint/no-unused-vars
  Line 11:10:  'getAnalytics' is defined but never used   @typescript-eslint/no-unused-vars

src\services\firestore\dbAdapter.js
  Line 282:38:  'options' is assigned a value but never used  @typescript-eslint/no-unused-vars

src\services\psaDataService.js
  Line 10:3:  'getFirestore' is defined but never used  @typescript-eslint/no-unused-vars
  Line 15:3:  'updateDoc' is defined but never used     @typescript-eslint/no-unused-vars

src\services\shadowSync.js
  Line 27:3:    'deleteDoc' is defined but never used  @typescript-eslint/no-unused-vars
  Line 850:11:  Expected a default case                default-case

src\services\sharingService.js
  Line 2:3:     'collection' is defined but never used          @typescript-eslint/no-unused-vars
  Line 119:11:  'bestValue' is assigned a value but never used  @typescript-eslint/no-unused-vars
  Line 224:51:  'index' is defined but never used               @typescript-eslint/no-unused-vars

src\utils\dataProcessor.js
  Line 72:5:    'importMode' is assigned a value but never used       @typescript-eslint/no-unused-vars
  Line 323:7:   'calculateProfit' is assigned a value but never used  @typescript-eslint/no-unused-vars
  Line 333:44:  'importMode' is assigned a value but never used       @typescript-eslint/no-unused-vars

src\utils\moveCardsHandler.js
  Line 314:1:  Assign object to a variable before exporting as module default  import/no-anonymous-default-export

Search for the keywords to learn more about each warning.
To ignore, add // eslint-disable-next-line to the line before.

WARNING in [eslint] 
src\components\CardDetails.js
  Line 116:50:  The ref value 'messageTimeoutRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'messageTimeoutRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps
  Line 132:8:   React Hook useEffect has missing dependencies: 'cardImage' and 'loadCardImage'. Either include them or remove the dependency array                                                                                
                                                                 react-hooks/exhaustive-deps
  Line 171:8:   React Hook useEffect has a missing dependency: 'handleClose'. Either include it or remove the dependency array                                                                                                    
                                                                 react-hooks/exhaustive-deps
  Line 224:8:   React Hook useCallback has missing dependencies: 'editedCard.id' and 'editedCard.slabSerial'. Either include them or remove the dependency array                                                                  
                                                                 react-hooks/exhaustive-deps

src\components\CardList.js
  Line 491:5:    React Hook useCallback has unnecessary dependencies: 'cardImages' and 'cards'. Either exclude them or remove the dependency array  react-hooks/exhaustive-deps
  Line 1324:16:  Invalid Tailwind CSS classnames order                                                           
                                   tailwindcss/classnames-order

src\components\CollectionSharing.js
  Line 73:6:  React Hook useEffect has a missing dependency: 'loadSharedCollections'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\ESLintDebugger.js
  Line 74:6:  React Hook useEffect has a missing dependency: 'fetchLintResults'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\ForgotPassword.js
  Line 55:10:  Classname 'page-no-padding' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\components\HelpCenter.js
  Line 444:6:  React Hook useMemo has a missing dependency: 'helpArticles'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Home.js
  Line 473:30:  Do not use Array index in keys  react/no-array-index-key

src\components\Marketplace\BuyerSelectionModal.js
  Line 34:6:  React Hook useEffect has a missing dependency: 'fetchPotentialBuyers'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Marketplace\DesktopMarketplaceMessages.js
  Line 205:6:  React Hook useEffect has a missing dependency: 'activeChat'. Either include it or remove the dependency array      react-hooks/exhaustive-deps
  Line 354:6:  React Hook useEffect has a missing dependency: 'loadCardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Marketplace\ListCardModal.js
  Line 74:6:  React Hook useEffect has a missing dependency: 'userLocation'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Marketplace\ListingDetailModal.js
  Line 135:6:   React Hook useEffect has a missing dependency: 'checkForExistingChat'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  Line 475:28:  Do not use Array index in keys                                                                   
                        react/no-array-index-key

src\components\Marketplace\Marketplace.js
  Line 214:6:  React Hook useEffect has a missing dependency: 'loadCardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\Marketplace\MarketplacePagination.js
  Line 70:18:  Do not use Array index in keys  react/no-array-index-key

src\components\Marketplace\MarketplaceSelling.js
  Line 162:6:  React Hook useEffect has a missing dependency: 'loadCardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\MoveCardsModal.js
  Line 102:15:  Classname 'focus:ring-[var(--primary-default)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\components\NewCollectionModal.js
  Line 98:13:  Classname 'focus:ring-[var(--primary-default)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\components\PSADetailModal.js
  Line 77:38:  'applyPSADetails' was used before it was defined                                                  
                                                                                                no-use-before-define
  Line 80:9:   The 'applyPSADetails' function makes the dependencies of useEffect Hook (at line 77) change on every render. To fix this, wrap the definition of 'applyPSADetails' in its own useCallback() Hook  react-hooks/exhaustive-deps

src\components\PriceChartingModal.js
  Line 210:33:  Invalid Tailwind CSS classnames order          tailwindcss/classnames-order
  Line 210:33:  Classname 'bg-' is not a Tailwind CSS class!   tailwindcss/no-custom-classname
  Line 210:33:  Classname '-500' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\components\PublicMarketplace.js
  Line 218:6:  React Hook useEffect has a missing dependency: 'loadCardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\PurchaseInvoices\PurchaseInvoices.js
  Line 620:30:  Do not use Array index in keys  react/no-array-index-key
  Line 653:24:  Do not use Array index in keys  react/no-array-index-key

src\components\SharedCollection.js
  Line 96:6:  React Hook useEffect has a missing dependency: 'loadSharedCollection'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\SharingQuickStart.js
  Line 265:20:  Do not use Array index in keys  react/no-array-index-key

src\components\UpgradeModal.js
  Line 131:7:  Classname 'upgrade-modal' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\contexts\CardContext.js
  Line 66:6:  React Hook useEffect has a missing dependency: 'loadInitialData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\contexts\UserPreferencesContext.js
  Line 307:6:  React Hook useEffect has missing dependencies: 'preferredCurrency' and 'saveUserPreferencesToFirestore'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

src\design-system\components\CardDetailsModal.js
  Line 687:3:  'onDelete' PropType is defined but prop is never used                 react/no-unused-prop-types  
  Line 691:3:  'imageLoadingState' PropType is defined but prop is never used        react/no-unused-prop-types  
  Line 695:3:  'additionalHeaderContent' PropType is defined but prop is never used  react/no-unused-prop-types  

src\design-system\components\CardOptimized.js
  Line 158:17:  Classname 'card-title' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\design-system\components\CollectionSelector.js
  Line 242:15:  Classname 'focus:ring-[var(--primary-default)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\design-system\components\Header.js
  Line 30:9:   Unexpected empty object pattern                             no-empty-pattern
  Line 457:3:  'onImportClick' PropType is defined but prop is never used  react/no-unused-prop-types

src\design-system\components\SearchToolbar.js
  Line 105:11:  Classname 'focus:ring-[var(--primary-light)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\design-system\components\SimpleSearchBar.js
  Line 36:11:  Classname 'focus:ring-[var(--primary-light)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname

src\design-system\components\SoldItemsView.js
  Line 25:9:  Unexpected empty object pattern  no-empty-pattern

src\design-system\molecules\BottomSheet.js
  Line 4:10:  'useTheme' is defined but never used  @typescript-eslint/no-unused-vars

src\design-system\molecules\FormField.js
  Line 30:7:   Classname 'error' is not a Tailwind CSS class!       tailwindcss/no-custom-classname
  Line 30:7:   Classname 'form-field' is not a Tailwind CSS class!  tailwindcss/no-custom-classname
  Line 35:30:  Classname 'required' is not a Tailwind CSS class!    tailwindcss/no-custom-classname

src\design-system\molecules\Modal.js
  Line 3:8:    'Button' is defined but never used                                                                
                                                                                         @typescript-eslint/no-unused-vars
  Line 22:3:   'showOverlay' is assigned a value but never used                                                  
                                                                                         @typescript-eslint/no-unused-vars
  Line 32:10:  'isMounted' is assigned a value but never used                                                    
                                                                                         @typescript-eslint/no-unused-vars
  Line 86:9:   The 'handleClose' function makes the dependencies of useEffect Hook (at line 169) change on every render. To fix this, wrap the definition of 'handleClose' in its own useCallback() Hook  react-hooks/exhaustive-deps
  Line 237:9:  'closeButtonClasses' is assigned a value but never used                                           
                                                                                         @typescript-eslint/no-unused-vars

src\design-system\molecules\SettingsPanel.js
  Line 14:3:  'expandable' is defined but never used  @typescript-eslint/no-unused-vars

src\design-system\molecules\invoice\InvoiceCard.js
  Line 12:3:  'getImageUrl' is defined but never used              @typescript-eslint/no-unused-vars
  Line 15:3:  'hideSoldImages' is assigned a value but never used  @typescript-eslint/no-unused-vars

src\firebase.js
  Line 10:3:  'getFirestore' is defined but never used              @typescript-eslint/no-unused-vars
  Line 11:3:  'connectFirestoreEmulator' is defined but never used  @typescript-eslint/no-unused-vars

src\hooks\useCardData.js
  Line 4:3:     'processImportedData' is defined but never used    @typescript-eslint/no-unused-vars
  Line 178:15:  'existingCard' is assigned a value but never used  @typescript-eslint/no-unused-vars

src\hooks\useLazyImage.js
  Line 66:40:  The ref value 'imageRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'imageRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

src\services\LoggingService.js
  Line 19:7:    'isTest' is assigned a value but never used     @typescript-eslint/no-unused-vars
  Line 255:48:  'timestamp' is assigned a value but never used  @typescript-eslint/no-unused-vars
  Line 322:17:  'logEntry' is defined but never used            @typescript-eslint/no-unused-vars

src\services\appInitialization.js
  Line 9:10:   'initializeApp' is defined but never used  @typescript-eslint/no-unused-vars
  Line 10:10:  'getFirestore' is defined but never used   @typescript-eslint/no-unused-vars
  Line 11:10:  'getAnalytics' is defined but never used   @typescript-eslint/no-unused-vars

src\services\firestore\dbAdapter.js
  Line 282:38:  'options' is assigned a value but never used  @typescript-eslint/no-unused-vars

src\services\psaDataService.js
  Line 10:3:  'getFirestore' is defined but never used  @typescript-eslint/no-unused-vars
  Line 15:3:  'updateDoc' is defined but never used     @typescript-eslint/no-unused-vars

src\services\shadowSync.js
  Line 27:3:    'deleteDoc' is defined but never used  @typescript-eslint/no-unused-vars
  Line 850:11:  Expected a default case                default-case

src\services\sharingService.js
  Line 2:3:     'collection' is defined but never used          @typescript-eslint/no-unused-vars
  Line 119:11:  'bestValue' is assigned a value but never used  @typescript-eslint/no-unused-vars
  Line 224:51:  'index' is defined but never used               @typescript-eslint/no-unused-vars

src\utils\dataProcessor.js
  Line 72:5:    'importMode' is assigned a value but never used       @typescript-eslint/no-unused-vars
  Line 323:7:   'calculateProfit' is assigned a value but never used  @typescript-eslint/no-unused-vars
  Line 333:44:  'importMode' is assigned a value but never used       @typescript-eslint/no-unused-vars

src\utils\moveCardsHandler.js
  Line 314:1:  Assign object to a variable before exporting as module default  import/no-anonymous-default-export

webpack compiled with 1 warning
No issues found.
