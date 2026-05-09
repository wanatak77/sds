const WebSocket = require('ws');
const firebaseAdmin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://wondem-35410.firebaseio.com" // Add your database URL
});

const db = firebaseAdmin.firestore();
const wss = new WebSocket.Server({ port: 3001 });
const clients = new Map(); // Maps user IDs to WebSocket connections

// Helper function to send error messages
const sendError = (ws, error) => {
  ws.send(JSON.stringify({
    type: 'error',
    error: error.message || 'An error occurred'
  }));
};

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Authentication handler
      if (message.type === 'auth') {
        const { token } = message;
        
        try {
          // Verify the Firebase ID token
          const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
          const uid = decodedToken.uid;
          
          // Store the connection with the user ID
          clients.set(uid, ws);
          console.log(`User ${uid} authenticated`);
          
          ws.send(JSON.stringify({
            type: 'authSuccess',
            uid
          }));
        } catch (error) {
          sendError(ws, error);
        }
        return;
      }
      
      // Only proceed if authenticated
      if (!message.uid || !clients.has(message.uid)) {
        sendError(ws, new Error('Not authenticated'));
        return;
      }
      
      // Handle chat message creation
      if (message.type === 'sendMessage') {
        const { chatId, senderId, text } = message;
        
        // Validate input
        if (!chatId || !senderId || !text) {
          sendError(ws, new Error('Missing required fields'));
          return;
        }
        
        // Save to Firestore
        const messageRef = await db.collection('chats').doc(chatId)
          .collection('messages').add({
            senderId,
            text,
            timestamp: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            read: false
          });
        
        // Update chat metadata
        await db.collection('chats').doc(chatId).update({
          lastMessage: text,
          updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });
        
        // Get chat participants
        const chatDoc = await db.collection('chats').doc(chatId).get();
        if (!chatDoc.exists) {
          sendError(ws, new Error('Chat not found'));
          return;
        }
        
        const participants = chatDoc.data().participants || {};
        
        // Notify all participants
        for (const participantId of Object.keys(participants)) {
          if (clients.has(participantId)) {
            clients.get(participantId).send(JSON.stringify({
              type: 'newMessage',
              chatId,
              message: {
                id: messageRef.id,
                senderId,
                text,
                timestamp: new Date().toISOString()
              }
            }));
          }
        }
        
        ws.send(JSON.stringify({
          type: 'messageSent',
          messageId: messageRef.id
        }));
      }
      
      // Handle support chat creation
      if (message.type === 'createSupportChat') {
        const { userId } = message;
        
        try {
          // Create chat document with participants
          const chatRef = await db.collection('chats').add({
            type: 'support',
            createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            participants: {
              [userId]: { 
                role: 'user', 
                joinedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() 
              },
              // Replace with actual admin UID or get from config
              'ADMIN_UID': { 
                role: 'admin', 
                joinedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() 
              }
            }
          });
          
          ws.send(JSON.stringify({
            type: 'supportChatCreated',
            chatId: chatRef.id
          }));
        } catch (error) {
          sendError(ws, error);
        }
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
      sendError(ws, error);
    }
  });

  ws.on('close', () => {
    // Clean up disconnected clients
    for (const [uid, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(uid);
        console.log(`User ${uid} disconnected`);
        break;
      }
    }
  });
});

// Clean up inactive connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    
    ws.isAlive = false;
    ws.ping(null, false, true);
  });
}, 30000);

wss.on('listening', () => {
  console.log('WebSocket server running on port 3001');
});