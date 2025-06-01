# Marketplace Messages System Technical Documentation

## Overview

The Marketplace Messages System provides real-time messaging functionality between buyers and sellers in the Pokemon Card Tracker marketplace. It enables users to communicate about card listings, negotiate prices, arrange transactions, and maintain conversation history with responsive design supporting both desktop and mobile interfaces.

## Architecture

### Core Components

#### 1. MarketplaceMessages.js
- **Purpose**: Mobile-optimized messaging interface
- **Responsive Design**: Automatically switches to DesktopMarketplaceMessages for screens ≥1024px
- **Location**: `src/components/Marketplace/MarketplaceMessages.js`

#### 2. DesktopMarketplaceMessages.js  
- **Purpose**: Desktop-optimized dual-panel messaging interface
- **Features**: Split-screen layout with conversation list and chat panel
- **Location**: `src/components/Marketplace/DesktopMarketplaceMessages.js`

#### 3. MessageModal.js
- **Purpose**: Modal for initiating new conversations from listings
- **Features**: Prefilled messages, seller contact, chat creation
- **Location**: `src/components/Marketplace/MessageModal.js`

## Key Features

### Real-Time Messaging
- **Technology**: Firebase Firestore real-time listeners
- **Updates**: Live message delivery and read status
- **Persistence**: Message history maintained across sessions

### Responsive Design
```javascript
const [windowWidth, setWindowWidth] = useState(window.innerWidth);
const isDesktop = windowWidth >= 1024; // lg breakpoint

if (isDesktop) {
  return <DesktopMarketplaceMessages />;
}
```

### Chat Management
- **Creation**: Automatic chat creation when contacting sellers
- **Participants**: Buyer-seller pairing with role identification
- **Status**: Active, left, or archived chat states

### Message Types
1. **User Messages**: Standard text communication
2. **System Messages**: Automated notifications (listing updates, etc.)
3. **Review Requests**: Prompts for seller feedback post-transaction

## State Management

### Primary State Variables
```javascript
const [conversations, setConversations] = useState([]);
const [activeChat, setActiveChat] = useState(null);
const [messages, setMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');
const [sendingMessage, setSendingMessage] = useState(false);
```

### Chat State Tracking
```javascript
const [detailModalOpen, setDetailModalOpen] = useState(false);
const [selectedListing, setSelectedListing] = useState(null);
const [showSellerProfile, setShowSellerProfile] = useState(false);
```

## Database Schema

### Chat Collection Structure
```javascript
{
  id: "chatId",
  participants: ["buyerId", "sellerId"],
  cardId: "listingId",
  cardTitle: "Pokemon Card Name",
  price: 150.00,
  currency: "USD",
  timestamp: Timestamp,
  lastMessage: "Latest message text",
  lastMessageTime: Timestamp,
  unreadCount: {
    buyerId: 0,
    sellerId: 2
  },
  leftBy: {
    buyer: false,
    seller: false
  }
}
```

### Message Collection Structure
```javascript
{
  id: "messageId",
  chatId: "parentChatId",
  senderId: "userId",
  text: "Message content",
  timestamp: Timestamp,
  type: "user" | "system" | "review_request",
  sellerId: "sellerId" // for review requests
}
```

## Core Functions

### Chat Data Fetching
```javascript
const fetchCompleteListingData = async (chat) => {
  if (!chat.cardId) return null;
  
  try {
    const listingRef = doc(firestoreDb, 'marketplaceItems', chat.cardId);
    const listingSnap = await getDoc(listingRef);
    
    if (listingSnap.exists()) {
      return { id: listingSnap.id, ...listingSnap.data() };
    } else {
      // Fallback to chat data if listing deleted
      return buildFallbackListing(chat);
    }
  } catch (error) {
    logger.error('Error fetching listing data:', error);
    return null;
  }
};
```

### Message Sending
```javascript
const handleSendMessage = async (e) => {
  e.preventDefault();
  if (!newMessage.trim() || sendingMessage || !activeChat) return;

  setSendingMessage(true);
  try {
    const messagesRef = collection(firestoreDb, 'messages');
    await addDoc(messagesRef, {
      chatId: activeChat.id,
      senderId: user.uid,
      text: newMessage.trim(),
      timestamp: serverTimestamp(),
      type: 'user'
    });

    // Update chat with last message info
    await updateChatLastMessage(activeChat.id, newMessage.trim());
    setNewMessage('');
  } catch (error) {
    logger.error('Error sending message:', error);
    toast.error('Failed to send message');
  } finally {
    setSendingMessage(false);
  }
};
```

### Real-Time Listeners
```javascript
useEffect(() => {
  if (!user) return;

  // Listen for user's conversations
  const chatsRef = collection(firestoreDb, 'chats');
  const chatsQuery = query(
    chatsRef,
    where('participants', 'array-contains', user.uid),
    orderBy('lastMessageTime', 'desc')
  );

  const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
    const chatsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setConversations(chatsData);
    setLoading(false);
  });

  return () => unsubscribeChats();
}, [user]);
```

## UI Components

### Conversation List
- **Design**: Card-based layout with preview information
- **Information**: Last message, timestamp, unread count, card details
- **Interaction**: Tap/click to open conversation

### Chat Interface
- **Message Bubbles**: Sender-aligned with timestamps
- **Input Field**: Fixed bottom position with send button
- **System Messages**: Centered with special styling

### Message Formatting
```javascript
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};
```

## Integration Points

### With Marketplace Listings
- **Navigation**: Direct links from listing detail modals
- **Context**: Chat includes listing information and pricing
- **Status Updates**: Notifications when listings change status

### With User Profiles
- **Seller Profiles**: Quick access to seller information and reviews
- **Review System**: Post-transaction review prompts
- **Authentication**: User identity verification for message security

### With Navigation System
- **Deep Linking**: Support for opening specific chats via URL state
- **Tab Integration**: Seamless switching between marketplace views
- **Mobile Optimization**: Bottom navigation compatibility

## Security & Privacy

### Access Control
- **Participants Only**: Users can only access chats they participate in
- **Firestore Rules**: Server-side enforcement of chat permissions
- **User Verification**: Authentication required for all message operations

### Data Protection
- **Message Encryption**: Standard Firestore security
- **User Anonymization**: Option to hide personal details
- **Chat Archival**: Soft deletion preserves message history

## Performance Optimizations

### Real-Time Efficiency
- **Listener Management**: Proper cleanup to prevent memory leaks
- **Query Optimization**: Indexed queries for fast conversation loading
- **Pagination**: Message history loaded in chunks for large conversations

### Mobile Performance
- **Responsive Loading**: Different layouts for mobile vs desktop
- **Lazy Loading**: Messages loaded as needed during scroll
- **Touch Optimization**: Mobile-friendly tap targets and gestures

## Error Handling

### Network Issues
```javascript
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snapshot) => {
    // Handle successful updates
  }, (error) => {
    logger.error('Conversation listener error:', error);
    toast.error('Connection lost. Please refresh.');
  });
}, []);
```

### Message Delivery
- **Retry Logic**: Automatic retry for failed message sends
- **Offline Support**: Queue messages when offline (future enhancement)
- **User Feedback**: Toast notifications for send status

## Testing Considerations

### Unit Testing
- Message formatting functions
- Chat state management
- User interaction handlers

### Integration Testing
- Real-time listener functionality
- Cross-component navigation
- Database operations

### End-to-End Testing
- Complete conversation workflows
- Mobile and desktop responsive behavior
- Multi-user chat scenarios

## Future Enhancements

### Advanced Features
- **File Attachments**: Image and document sharing
- **Message Reactions**: Emoji responses and acknowledgments
- **Read Receipts**: Enhanced delivery status tracking
- **Push Notifications**: Real-time alerts for new messages

### UI Improvements
- **Message Search**: Find specific conversations or content
- **Chat Organization**: Folders or tags for conversation management
- **Bulk Actions**: Archive or delete multiple chats
- **Dark Mode**: Theme consistency with app design

## Dependencies

### Core Libraries
- **React**: Component framework and hooks
- **Firebase/Firestore**: Real-time database and messaging
- **React Router**: Navigation and deep linking
- **React Hot Toast**: User notifications

### Design System
- **Custom Components**: Consistent UI elements
- **Icon System**: Unified iconography
- **Responsive Layout**: Mobile-first design patterns

## Troubleshooting

### Common Issues
1. **Messages Not Loading**: Check Firestore rules and user authentication
2. **Real-Time Updates Missing**: Verify listener setup and cleanup
3. **Mobile Layout Issues**: Confirm responsive breakpoints
4. **Performance Lag**: Review query efficiency and component optimization

### Debug Tools
- **Console Logging**: Comprehensive error tracking
- **Firebase Console**: Database query monitoring
- **React DevTools**: Component state inspection

This messaging system provides a robust foundation for marketplace communication while maintaining security, performance, and user experience across all device types.
