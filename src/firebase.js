import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  orderBy,
  query,
  where,
  updateDoc,
  increment,
  serverTimestamp,
  getDoc,
  onSnapshot,
  limit
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBnYrBsLlItGiZj04qjfwAuFmP65E26PD0",
  authDomain: "wondem-35410.firebaseapp.com",
  projectId: "wondem-35410",
  storageBucket: "wondem-35410.appspot.com",
  messagingSenderId: "159036394204",
  appId: "1:159036394204:web:993e32d772046be4584219",
  measurementId: "G-5BTELY6KCP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

/* ========== User Management Functions ========== */
const registerStudent = async (fullName, phoneNumber, course) => {
  try {
    const registrationId = Date.now().toString();
    
    // Add to main users collection
    await setDoc(doc(db, "users", registrationId), {
      fullName,
      phoneNumber,
      course,
      status: 'pending',
      createdAt: new Date(),
      id: registrationId
    });
    
    // Add to specific course collection
    await addDoc(collection(db, `${course}Students`), {
      id: registrationId,
      fullName,
      phoneNumber,
      course,
      status: 'pending',
      createdAt: new Date()
    });
    
    return { 
      success: true, 
      registrationId
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

const registerUserWithDetails = async (email, password, fullName, phoneNumber, course) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Add to main users collection
    await setDoc(doc(db, "users", userCredential.user.uid), {
      fullName,
      phoneNumber,
      course,
      email,
      status: 'pending',
      createdAt: new Date(),
      uid: userCredential.user.uid
    });
    
    // Add to specific course collection
    await addDoc(collection(db, `${course}Students`), {
      userId: userCredential.user.uid,
      fullName,
      phoneNumber,
      email,
      status: 'pending',
      createdAt: new Date()
    });
    
    return { 
      success: true, 
      user: {
        ...userCredential.user,
        fullName,
        phoneNumber,
        course
      } 
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

const getPendingStudents = async (course) => {
  try {
    const q = query(
      collection(db, `${course}Students`),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, students };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const approveStudent = async (studentId, course, userId = null) => {
  try {
    // Update in course-specific collection
    await updateDoc(doc(db, `${course}Students`, studentId), {
      status: 'approved',
      approvedAt: new Date()
    });
    
    // Update in main users collection if userId is provided
    const userDocRef = doc(db, "users", userId || studentId);
    await updateDoc(userDocRef, {
      status: 'approved'
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const rejectStudent = async (studentId, course, userId = null) => {
  try {
    // Update in course-specific collection
    await updateDoc(doc(db, `${course}Students`, studentId), {
      status: 'rejected',
      rejectedAt: new Date()
    });
    
    // Update in main users collection if userId is provided
    const userDocRef = doc(db, "users", userId || studentId);
    await updateDoc(userDocRef, {
      status: 'rejected'
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/* ========== Authentication Functions ========== */
const registerWithEmailAndPassword = async (email, password, fullName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, "users", userCredential.user.uid), {
      fullName,
      email,
      createdAt: new Date(),
      uid: userCredential.user.uid
    });
    
    await sendEmailVerification(userCredential.user);
    
    return { 
      success: true, 
      user: {
        ...userCredential.user,
        fullName
      } 
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

const loginWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const logout = async (userId, userEmail) => {
  try {
    if (userId && userEmail) {
      await recordActivity(userId, userEmail, 'Logout', 'User signed out');
    }
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/* ========== Promotion Functions ========== */
const addPromotion = async (promotionData) => {
  try {
    const docRef = await addDoc(collection(db, 'promotions'), {
      ...promotionData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding promotion:", error);
    return { success: false, error: error.message };
  }
};

const getPromotions = async () => {
  try {
    const q = query(
      collection(db, 'promotions'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const promotions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      promotions.push({ 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    return { success: true, promotions };
  } catch (error) {
    console.error("Error getting promotions:", error);
    return { success: false, error: error.message };
  }
};

const deletePromotion = async (id) => {
  try {
    await deleteDoc(doc(db, 'promotions', id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting promotion:", error);
    return { success: false, error: error.message };
  }
};

/* ========== Storage Functions ========== */
const uploadFile = async (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      }, 
      (error) => {
        console.error("❌ uploadFile error:", error);
        reject(error);
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => resolve(downloadURL))
          .catch((err) => {
            console.error("❌ getDownloadURL error:", err);
            reject(err);
          });
      }
    );
  });
};

/* ========== Notification Functions ========== */
const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { 
        vapidKey: 'YOUR_VAPID_KEY'
      });
      return { success: true, token };
    }
    return { success: false, error: 'Permission denied' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const setupMessageListener = (callback) => {
  return onMessage(messaging, (payload) => {
    if (typeof callback === 'function') {
      callback(payload);
    }
  });
};

/* ========== Payment Functions ========== */
const createPayment = async (paymentData) => {
  try {
    const docRef = await addDoc(collection(db, 'payments'), {
      tx_ref:    paymentData.tx_ref,
      userId:    paymentData.userId    || null,
      userName:  paymentData.userName  || 'Unknown',
      userEmail: paymentData.userEmail || 'unknown@sdstech.com',
      phone:     paymentData.phone     || '',
      amount:    paymentData.amount,
      plan:      paymentData.plan,
      subject:   paymentData.subject,
      status:    'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ Payment record created:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ createPayment error:', error);
    return { success: false, error: error.message };
  }
};

const updatePaymentStatus = async (tx_ref, status) => {
  try {
    const q = query(collection(db, 'payments'), where('tx_ref', '==', tx_ref));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: 'Payment not found' };
    const docRef = snap.docs[0].ref;
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    
    // Record successful payment activity
    if (status === 'success') {
      const pData = snap.docs[0].data();
      recordActivity(pData.userId, pData.userEmail, 'Payment Success', `Amount: ETB ${pData.amount}, Subject: ${pData.subject || pData.plan}`);
    }
    
    return { success: true, data: { id: snap.docs[0].id, ...snap.docs[0].data(), status } };
  } catch (error) {
    console.error('❌ updatePaymentStatus error:', error);
    return { success: false, error: error.message };
  }
};

const getPaymentByTxRef = async (tx_ref) => {
  try {
    const q = query(collection(db, 'payments'), where('tx_ref', '==', tx_ref));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: 'Not found' };
    return { success: true, data: { id: snap.docs[0].id, ...snap.docs[0].data() } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const getUserPayments = async (userId, userEmail) => {
  try {
    const payments = [];
    const seen = new Set();

    // 1. Query global payments by userId
    const q1 = query(collection(db, 'payments'), where('userId', '==', userId));
    const snap1 = await getDocs(q1);

    // 2. Query global payments by email (fallback)
    const q2 = query(collection(db, 'payments'), where('userEmail', '==', userEmail));
    const snap2 = await getDocs(q2);

    // 3. Query user-specific payments collection
    const q3 = query(collection(db, 'users', userId, 'payments'));
    const snap3 = await getDocs(q3);

    [...snap1.docs, ...snap2.docs, ...snap3.docs].forEach(d => {
      const data = d.data();
      // Include if status is success OR approved
      if (!seen.has(d.id) && (data.status === 'success' || data.status === 'approved')) {
        seen.add(d.id);
        payments.push({
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.timestamp?.toDate?.() || new Date(),
        });
      }
    });

    payments.sort((a, b) => b.createdAt - a.createdAt);
    console.log('✅ getUserPayments synced:', payments.length, 'records');
    return { success: true, payments };
  } catch (error) {
    console.error('❌ getUserPayments sync error:', error);
    return { success: false, error: error.message };
  }
};

const getAllPayments = async () => {
  try {
    const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const payments = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
      updatedAt: d.data().updatedAt?.toDate?.() || new Date()
    }));
    return { success: true, payments };
  } catch (error) {
    console.error('❌ getAllPayments error:', error);
    return { success: false, error: error.message };
  }
};

/* ========== Activity Tracking Functions ========== */
const recordActivity = async (userId, userEmail, action, details = '') => {
  try {
    const docRef = await addDoc(collection(db, 'activities'), {
      userId: userId || null,
      userEmail: userEmail || 'Unknown',
      action,
      details,
      timestamp: serverTimestamp()
    });
    console.log('✅ Activity recorded:', action);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ recordActivity error:', error);
    return { success: false, error: error.message };
  }
};

const getAllActivities = async () => {
  try {
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    const activities = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || new Date()
    }));
    return { success: true, activities };
  } catch (error) {
    console.error('❌ getAllActivities error:', error);
    return { success: false, error: error.message };
  }
};

/* ========== Quiz Caching Functions ========== */
const getQuizCache = async (subject, type) => {
  try {
    const cacheKey = `${subject}_${type}`.toLowerCase().replace(/\s+/g, '_');
    const docRef = doc(db, 'quizCache', cacheKey);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data();
      const ageInHours = (new Date() - (data.createdAt?.toDate?.() || new Date())) / (1000 * 60 * 60);
      if (ageInHours < 24) { 
        return data.questions;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ getQuizCache error:', error);
    return null;
  }
};

const saveQuizCache = async (subject, type, questions) => {
  try {
    const cacheKey = `${subject}_${type}`.toLowerCase().replace(/\s+/g, '_');
    await setDoc(doc(db, 'quizCache', cacheKey), {
      subject,
      type,
      questions,
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('❌ saveQuizCache error:', error);
    return { success: false, error: error.message };
  }
};

/* ========== Chat Functions ========== */
/* ========== TCP-Style Chunked Messaging ========== */
const sendChunkedMessage = async (chatId, userId, userEmail, file) => {
  try {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        const totalSize = base64Data.length;
        const chunkSize = 500000; // 500KB chunks
        const totalChunks = Math.ceil(totalSize / chunkSize);
        const transferId = `tx_${Date.now()}`;
        const mimeType = file.type;

        // 1. Send Frame Header
        await sendMessage(chatId, userId, userEmail, `Starting transfer: ${file.name}`, 'transfer_start', null, file.name, {
          transferId,
          totalChunks,
          mimeType,
          totalSize
        });

        // 2. Send Chunks
        for (let i = 0; i < totalChunks; i++) {
          const chunk = base64Data.slice(i * chunkSize, (i + 1) * chunkSize);
          await addDoc(collection(db, 'chats', chatId, 'messages'), {
            transferId,
            type: 'transfer_chunk',
            chunkIndex: i,
            data: chunk,
            senderId: userId,
            order: i, // Explicit order for reassembly
            timestamp: serverTimestamp()
          });
        }

        // 3. Send Frame End
        await sendMessage(chatId, userId, userEmail, `Transfer complete: ${file.name}`, 'transfer_end', null, file.name, {
          transferId,
          totalChunks,
          mimeType
        });
        
        resolve({ success: true, transferId });
      };
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('❌ sendChunkedMessage error:', error);
    return { success: false, error: error.message };
  }
};

const sendMessage = async (chatId, userId, userEmail, text, type = 'text', fileUrl = null, fileName = null, metadata = {}) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, { 
      lastMessage: text || (type === 'image' ? '🖼️ Image' : type === 'file' ? `📁 ${fileName}` : '📡 Data Stream'), 
      lastSenderId: userId,
      userEmail,
      updatedAt: serverTimestamp(),
      unreadCount: 1 
    }, { merge: true });
    
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text,
      type,
      fileUrl,
      fileName,
      metadata,
      senderId: userId,
      timestamp: serverTimestamp(),
      seen: false
    });
    return { success: true };
  } catch (error) {
    console.error('❌ sendMessage error:', error);
    return { success: false, error: error.message };
  }
};

const listenToMessages = (chatId, callback) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'), 
    orderBy('timestamp', 'asc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || new Date()
    }));
    callback(msgs);
  });
};

const listenToChatList = (callback) => {
  const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data(),
      updatedAt: d.data().updatedAt?.toDate?.() || new Date()
    }));
    callback(chats);
  });
};

const markAsSeen = async (chatId, messageId) => {
  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, { seen: true });
    return { success: true };
  } catch (error) {
    console.error('❌ markAsSeen error:', error);
    return { success: false, error: error.message };
  }
};

/* ========== Manual Payment & Verification System ========== */

const getPaymentConfig = async () => {
  try {
    const docRef = doc(db, 'config', 'payment');
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : { phone: '09xxxxxxxx', telegram: '@yourname' };
  } catch (error) {
    console.error("Error fetching payment config:", error);
    return { phone: '09xxxxxxxx', telegram: '@yourname' };
  }
};

const updatePaymentConfig = async (data) => {
  await setDoc(doc(db, 'config', 'payment'), data, { merge: true });
};

const submitManualPayment = async (userId, userName, subjectId, subjectName, file) => {
  const fileName = `${Date.now()}_receipt_${userId}.jpg`;
  const storageRef = ref(storage, `receipts/${userId}/${fileName}`);
  const uploadTask = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(uploadTask.ref);

  return await addDoc(collection(db, 'manual_payments'), {
    userId,
    userName,
    subjectId,
    subjectName,
    screenshotUrl: downloadURL,
    status: 'pending',
    timestamp: serverTimestamp(),
  });
};

const getPendingManualPayments = (callback) => {
  const q = query(collection(db, 'manual_payments'), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(payments);
  });
};

const createPaymentRecord = async (userId, userEmail, userName, paymentData) => {
  const finalData = {
    ...paymentData,
    userId,
    userEmail: userEmail || 'unknown',
    userName: userName || 'Admin Grant',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  // 1. Record in student's private history
  await addDoc(collection(db, 'users', userId, 'payments'), finalData);
  
  // 2. Record in global admin payments table
  return await addDoc(collection(db, 'payments'), finalData);
};

const approveManualPayment = async (paymentId, userId, subjectId) => {
  // Get student info for the global record
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.exists() ? userDoc.data() : {};
  
  await updateDoc(doc(db, 'manual_payments', paymentId), { status: 'approved' });
  await setDoc(doc(db, 'users', userId, 'permissions', subjectId), {
    unlocked: true,
    type: 'manual',
    approvedAt: serverTimestamp()
  });
  
  // Also create a success payment record in both user and global history
  await createPaymentRecord(userId, userData.email, userData.fullName, {
    subject: subjectId,
    amount: 0,
    status: 'success',
    tx_ref: `verify_${Date.now()}`,
    method: 'Manual Approval',
  });

  await recordActivity(userId, userData.email, `Payment Approved for ${subjectId}`, 'payment');
};

const rejectManualPayment = async (paymentId, reason) => {
  await updateDoc(doc(db, 'manual_payments', paymentId), { 
    status: 'rejected',
    rejectReason: reason 
  });
};

/* ========== Export All Functions ========== */
export {
  auth,
  db,
  storage,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  registerUserWithDetails,
  logout,
  registerStudent,
  getPendingStudents,
  approveStudent,
  rejectStudent,
  getAllActivities,
  recordActivity,
  getQuizCache,
  saveQuizCache,
  getPromotions,
  addPromotion,
  deletePromotion,
  createPayment,
  getPaymentByTxRef,
  getUserPayments,
  getAllPayments,
  updatePaymentStatus,
  sendMessage,
  listenToMessages,
  listenToChatList,
  markAsSeen,
  setupMessageListener,
  uploadFile,
  getPaymentConfig,
  updatePaymentConfig,
  submitManualPayment,
  getPendingManualPayments,
  approveManualPayment,
  rejectManualPayment,
  sendChunkedMessage,
  createPaymentRecord
};