Compiled with warnings.

[eslint] 
src\components\Marketplace\ListCardModal.js
  Line 494:27:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order
  Line 527:27:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order
  Line 557:27:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\components\Marketplace\Marketplace.js
  Line 100:13:  'loadCardImages' was used before it was defined  no-use-before-define
  Line 204:13:  'loadCardImages' was used before it was defined  no-use-before-define

src\components\Marketplace\MarketplaceSelling.js
  Line 162:13:  'loadCardImages' was used before it was defined                                                                  no-use-before-define
  Line 383:6:   React Hook useCallback has a missing dependency: 'cardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\MoveCardsModal.js
  Line 102:15:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\components\NewCollectionModal.js
  Line 98:13:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\components\PSADetailModal.js
  Line 4:8:    'Modal' is defined but never used                 
            @typescript-eslint/no-unused-vars
  Line 10:3:   'mergeWithExistingCard' is defined but never used 
            @typescript-eslint/no-unused-vars
  Line 27:10:  'psaData' is assigned a value but never used      
            @typescript-eslint/no-unused-vars
  Line 208:9:  'handleModalContentClick' is assigned a value but never used  @typescript-eslint/no-unused-vars

src\components\UpgradeModal.js
  Line 131:7:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\design-system\components\CardDetailsModal.js
  Line 687:3:  'onDelete' PropType is defined but prop is never used                 react/no-unused-prop-types
  Line 691:3:  'imageLoadingState' PropType is defined but prop is never used        react/no-unused-prop-types
  Line 695:3:  'additionalHeaderContent' PropType is defined but prop is never used  react/no-unused-prop-types

src\design-system\components\CollectionSelector.js
  Line 242:15:  Classname 'focus:ring-[var(--primary-default)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname  

src\design-system\components\Header.js
  Line 30:9:   Unexpected empty object pattern                   
          no-empty-pattern
  Line 457:3:  'onImportClick' PropType is defined but prop is never used  react/no-unused-prop-types

src\design-system\components\SoldItemsView.js
  Line 25:9:  Unexpected empty object pattern  no-empty-pattern  

src\design-system\molecules\FormField.js
  Line 35:30:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\design-system\molecules\Modal.js
  Line 3:8:    'Button' is defined but never used                
@typescript-eslint/no-unused-vars
  Line 22:3:   'showOverlay' is assigned a value but never used  @typescript-eslint/no-unused-vars
  Line 32:10:  'isMounted' is assigned a value but never used    @typescript-eslint/no-unused-vars

src\design-system\molecules\SettingsPanel.js
  Line 14:3:  'expandable' is defined but never used  @typescript-eslint/no-unused-vars

src\design-system\molecules\invoice\InvoiceCard.js
  Line 12:3:  'getImageUrl' is defined but never used            
  @typescript-eslint/no-unused-vars
  Line 15:3:  'hideSoldImages' is assigned a value but never used
  @typescript-eslint/no-unused-vars

src\firebase.js
  Line 10:3:  'getFirestore' is defined but never used           
   @typescript-eslint/no-unused-vars
  Line 11:3:  'connectFirestoreEmulator' is defined but never used  @typescript-eslint/no-unused-vars

src\hooks\useCardData.js
  Line 4:3:     'processImportedData' is defined but never used  
  @typescript-eslint/no-unused-vars
  Line 178:15:  'existingCard' is assigned a value but never used
  @typescript-eslint/no-unused-vars

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

Search for the keywords to learn more about each warning.        
To ignore, add // eslint-disable-next-line to the line before.   

WARNING in [eslint] 
src\components\Marketplace\ListCardModal.js
  Line 494:27:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order
  Line 527:27:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order
  Line 557:27:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\components\Marketplace\Marketplace.js
  Line 100:13:  'loadCardImages' was used before it was defined  no-use-before-define
  Line 204:13:  'loadCardImages' was used before it was defined  no-use-before-define

src\components\Marketplace\MarketplaceSelling.js
  Line 162:13:  'loadCardImages' was used before it was defined                                                                  no-use-before-define
  Line 383:6:   React Hook useCallback has a missing dependency: 'cardImages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\components\MoveCardsModal.js
  Line 102:15:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\components\NewCollectionModal.js
  Line 98:13:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\components\PSADetailModal.js
  Line 4:8:    'Modal' is defined but never used                 
            @typescript-eslint/no-unused-vars
  Line 10:3:   'mergeWithExistingCard' is defined but never used 
            @typescript-eslint/no-unused-vars
  Line 27:10:  'psaData' is assigned a value but never used      
            @typescript-eslint/no-unused-vars
  Line 208:9:  'handleModalContentClick' is assigned a value but never used  @typescript-eslint/no-unused-vars

src\components\UpgradeModal.js
  Line 131:7:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\design-system\components\CardDetailsModal.js
  Line 687:3:  'onDelete' PropType is defined but prop is never used                 react/no-unused-prop-types
  Line 691:3:  'imageLoadingState' PropType is defined but prop is never used        react/no-unused-prop-types
  Line 695:3:  'additionalHeaderContent' PropType is defined but prop is never used  react/no-unused-prop-types

src\design-system\components\CollectionSelector.js
  Line 242:15:  Classname 'focus:ring-[var(--primary-default)]/20' is not a Tailwind CSS class!  tailwindcss/no-custom-classname  

src\design-system\components\Header.js
  Line 30:9:   Unexpected empty object pattern                   
          no-empty-pattern
  Line 457:3:  'onImportClick' PropType is defined but prop is never used  react/no-unused-prop-types

src\design-system\components\SoldItemsView.js
  Line 25:9:  Unexpected empty object pattern  no-empty-pattern  

src\design-system\molecules\FormField.js
  Line 35:30:  Invalid Tailwind CSS classnames order  tailwindcss/classnames-order

src\design-system\molecules\Modal.js
  Line 3:8:    'Button' is defined but never used                
@typescript-eslint/no-unused-vars
  Line 22:3:   'showOverlay' is assigned a value but never used  @typescript-eslint/no-unused-vars
  Line 32:10:  'isMounted' is assigned a value but never used    @typescript-eslint/no-unused-vars

src\design-system\molecules\SettingsPanel.js
  Line 14:3:  'expandable' is defined but never used  @typescript-eslint/no-unused-vars

src\design-system\molecules\invoice\InvoiceCard.js
  Line 12:3:  'getImageUrl' is defined but never used            
  @typescript-eslint/no-unused-vars
  Line 15:3:  'hideSoldImages' is assigned a value but never used
  @typescript-eslint/no-unused-vars

src\firebase.js
  Line 10:3:  'getFirestore' is defined but never used           
   @typescript-eslint/no-unused-vars
  Line 11:3:  'connectFirestoreEmulator' is defined but never used  @typescript-eslint/no-unused-vars

src\hooks\useCardData.js
  Line 4:3:     'processImportedData' is defined but never used  
  @typescript-eslint/no-unused-vars
  Line 178:15:  'existingCard' is assigned a value but never used
  @typescript-eslint/no-unused-vars

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

webpack compiled with 1 warning
No issues found.