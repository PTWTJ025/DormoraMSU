export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: 'AIzaSyA8u5HYbzrlFm12sNtGTiyzLxwZ2kcS1_o',
    authDomain: 'projectroomaroo.firebaseapp.com',
    projectId: 'projectroomaroo',
    storageBucket: 'projectroomaroo.firebasestorage.app',
    messagingSenderId: '782979223053',
    appId: '1:782979223053:web:0ed401a937a53890158f44',
    measurementId: 'G-X6MZ8F81G1',
  },
  // Backend API URLs - สลับระหว่าง localhost และ production
  backendApiUrl: 'https://dormora-msu-back-end.vercel.app/api', // ✅ เพิ่ม /api
  // backendApiUrl: 'https://dormroomaroo-backend.onrender.com/api', // ✅ เพิ่ม /api roomaroo
  // backendApiUrl: 'http://localhost:3000/api', // comment localhost ไว้
  
  fastApiUrl: 'https://roomaroo-textclassification.onrender.com/api',
  mapTilerApiKey: 'Gpwk2Mpi9cl8hUkVrf6f',
};
