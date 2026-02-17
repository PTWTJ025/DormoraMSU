// Production Environment Configuration
export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: 'AIzaSyA8u5HYbzrlFm12sNtGTiyzLxwZ2kcS1_o',
    authDomain: 'projectroomaroo.firebaseapp.com',
    projectId: 'projectroomaroo',
    storageBucket: 'projectroomaroo.firebasestorage.app',
    messagingSenderId: '782979223053',
    appId: '1:782979223053:web:0ed401a937a53890158f44',
    measurementId: 'G-X6MZ8F81G1'
  },
  
  // Production Backend API URL
  backendApiUrl: 'https://your-production-backend.com/api', // แก้ URL production ตรงนี้
  
  fastApiUrl: 'https://roomaroo-textclassification.onrender.com/api',
  
  mapTilerApiKey: 'Gpwk2Mpi9cl8hUkVrf6f',
  
  // Admin Configuration
  admin: {
    notificationEmail: 'admin@dormroomaroo.com'
  }
};
