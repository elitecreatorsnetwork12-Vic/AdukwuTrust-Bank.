// ---------- Firebase config (from your project) ----------
const firebaseConfig = {
  apiKey: "AIzaSyDS0BShhpzGrTJOgwI4iDagGgF6AxMU8Jg",
  authDomain: "elitecreatorsnetwork-e23b6.firebaseapp.com",
  databaseURL: "https://elitecreatorsnetwork-e23b6-default-rtdb.firebaseio.com",
  projectId: "elitecreatorsnetwork-e23b6",
  storageBucket: "elitecreatorsnetwork-e23b6.firebasestorage.app",
  messagingSenderId: "600658583917",
  appId: "1:600658583917:web:c4ea597f67658a2d3c7a64",
  measurementId: "G-1F70YJGQ4M"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// UI nodes
const authModal = document.getElementById('authModal');
const openAuth = document.getElementById('openAuth');
const openAuthHero = document.getElementById('openAuthHero');
const closeModal = document.getElementById('closeModal');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const registerStatus = document.getElementById('registerStatus');

// contact
const contactForm = document.getElementById('contactForm');
const contactStatus = document.getElementById('contactStatus');

// preloader
const preloader = document.getElementById('preloader');

// open modal
function openAuthModal(tab='login'){
  authModal.classList.remove('hidden');
  authModal.setAttribute('aria-hidden','false');
  if(tab==='login') showLogin();
  else showRegister();
}
openAuth && openAuth.addEventListener('click', ()=> openAuthModal('login'));
openAuthHero && openAuthHero.addEventListener('click', ()=> openAuthModal('register'));
closeModal && closeModal.addEventListener('click', ()=> { authModal.classList.add('hidden'); authModal.setAttribute('aria-hidden','true'); });

// tabs
tabLogin.addEventListener('click', showLogin);
tabRegister.addEventListener('click', showRegister);
document.getElementById('toRegister').addEventListener('click', ()=> showRegister());
document.getElementById('toLogin').addEventListener('click', ()=> showLogin());

function showLogin(){
  tabLogin.classList.add('active'); tabRegister.classList.remove('active');
  loginTab.classList.remove('hidden'); registerTab.classList.add('hidden');
  loginStatus.textContent = ''; registerStatus.textContent = '';
}
function showRegister(){
  tabRegister.classList.add('active'); tabLogin.classList.remove('active');
  registerTab.classList.remove('hidden'); loginTab.classList.add('hidden');
  loginStatus.textContent = ''; registerStatus.textContent = '';
}

// REGISTER
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerStatus.textContent = '';
  const name = document.getElementById('r_name').value.trim();
  const email = document.getElementById('r_email').value.trim();
  const pass = document.getElementById('r_password').value;
  const pass2 = document.getElementById('r_password2').value;
  if(!name || !email || pass.length < 6){ registerStatus.style.color='crimson'; registerStatus.textContent='Invalid input or password too short.'; return;}
  if(pass !== pass2){ registerStatus.style.color='crimson'; registerStatus.textContent='Passwords do not match.'; return;}
  try {
    registerStatus.style.color=''; registerStatus.textContent='Creating account...';
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    const user = cred.user;
    // store profile in DB
    await db.ref('users/' + user.uid).set({
      name, email, balance: 0, createdAt: Date.now()
    });
    // send email verification
    await user.sendEmailVerification();
    registerStatus.style.color='green';
    registerStatus.textContent = 'Account created. Verification email sent — check your inbox.';
    registerForm.reset();
  } catch(err) {
    console.error(err);
    registerStatus.style.color='crimson';
    registerStatus.textContent = err.message || 'Registration failed.';
  }
});

// LOGIN
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginStatus.textContent = '';
  const email = document.getElementById('l_email').value.trim();
  const pass = document.getElementById('l_password').value;
  const remember = document.getElementById('rememberMe').checked;
  if(!email || !pass){ loginStatus.style.color='crimson'; loginStatus.textContent='Provide email and password.'; return; }
  try {
    loginStatus.style.color=''; loginStatus.textContent = 'Signing in...';
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    const user = cred.user;
    if(!user.emailVerified){
      loginStatus.style.color='crimson';
      loginStatus.textContent = 'Please verify your email before logging in.';
      return;
    }
    // set session (simple)
    sessionStorage.setItem('adukw_session', JSON.stringify({uid: user.uid, email: user.email}));
    loginStatus.style.color='green';
    loginStatus.textContent = 'Login successful. Redirecting…';
    preloader.classList.remove('hidden');
    // redirect to dashboard
    setTimeout(()=> window.location.href = 'dashboard.html', 900);
  } catch(err){
    console.error(err);
    loginStatus.style.color='crimson';
    loginStatus.textContent = err.message || 'Login failed.';
  }
});

// GOOGLE SIGN-IN
document.getElementById('googleSignIn').addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    // if new user, ensure DB record exists
    const userRef = db.ref('users/' + user.uid);
    userRef.once('value', snap => {
      if(!snap.exists()) {
        userRef.set({ name: user.displayName || 'User', email: user.email, balance:0, createdAt: Date.now() });
      }
    });
    // Google users are verified by default
    sessionStorage.setItem('adukw_session', JSON.stringify({uid: user.uid, email: user.email}));
    preloader.classList.remove('hidden');
    setTimeout(()=> window.location.href='dashboard.html', 900);
  } catch(err){
    console.error(err);
    loginStatus.style.color='crimson';
    loginStatus.textContent = err.message || 'Google sign-in failed.';
  }
});

// CONTACT FORM (store to DB messages)
contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  contactStatus.textContent = '';
  const name = document.getElementById('c_name').value.trim();
  const email = document.getElementById('c_email').value.trim();
  const subject = document.getElementById('c_subject').value.trim();
  const message = document.getElementById('c_message').value.trim();
  if(!name||!email||!subject||!message){ contactStatus.style.color='crimson'; contactStatus.textContent='Please fill all fields.'; return; }
  const words = message.split(/\s+/).filter(Boolean).length;
  if(words > 500){ contactStatus.style.color='crimson'; contactStatus.textContent='Message exceeds 500 words.'; return; }
  try {
    contactStatus.textContent = 'Sending...';
    await db.ref('messages').push({name,email,subject,message,createdAt:Date.now()});
    contactStatus.style.color='green';
    contactStatus.textContent = 'Message sent successfully.';
    contactForm.reset();
  } catch(err){
    contactStatus.style.color='crimson';
    contactStatus.textContent = 'Failed to send.';
  }
});

// UX: open modal from header btn
document.getElementById('openAuth').addEventListener('click', ()=> openAuthModal('login'));
document.getElementById('openAuthHero').addEventListener('click', ()=> openAuthModal('register'));
