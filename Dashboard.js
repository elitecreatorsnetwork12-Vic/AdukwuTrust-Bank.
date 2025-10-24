// Initialize Firebase (same config)
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

/* UI nodes */
const dashName = document.getElementById('dashName');
const dashBalance = document.getElementById('dashBalance');
const txList = document.getElementById('txList');
const sendForm = document.getElementById('sendForm');
const sendStatus = document.getElementById('sendStatus');

const panelSend = document.getElementById('panelSend');
const panelTx = document.getElementById('panelTx');
const panelLoan = document.getElementById('panelLoan');
const panelMore = document.getElementById('panelMore');

const logoutBtn = document.getElementById('logoutBtn');
const requestLoan = document.getElementById('requestLoan');

function showPanel(p){
  [panelSend, panelTx, panelLoan, panelMore].forEach(x => x.classList.add('hidden'));
  if(p==='send') panelSend.classList.remove('hidden');
  if(p==='tx') panelTx.classList.remove('hidden');
  if(p==='loan') panelLoan.classList.remove('hidden');
  if(p==='more') panelMore.classList.remove('hidden');
}

// require auth
auth.onAuthStateChanged(async user => {
  if(!user){
    // not logged in
    window.location.href = 'index.html';
    return;
  }
  if(!user.emailVerified){
    // force logout and ask to verify
    alert('Please verify your email before accessing dashboard.');
    await auth.signOut();
    window.location.href = 'index.html';
    return;
  }
  // load user data
  loadUser(user.uid);
});

// load user
async function loadUser(uid){
  const snap = await db.ref('users/' + uid).once('value');
  const user = snap.val() || {};
  dashName.textContent = user.name || user.email || 'Member';
  dashBalance.textContent = `₦ ${Number(user.balance || 0).toLocaleString()}`;

  // load transactions
  const txSnap = await db.ref('transactions/' + uid).limitToLast(50).once('value');
  const txs = txSnap.val() || {};
  txList.innerHTML = '';
  Object.keys(txs).reverse().forEach(k => {
    const t = txs[k];
    const li = document.createElement('li');
    li.textContent = `${new Date(t.createdAt).toLocaleDateString()} — ${t.type.toUpperCase()} — ₦${Number(t.amount).toLocaleString()} — ${t.to || t.from}`;
    txList.appendChild(li);
  });
}

// logout
logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  sessionStorage.removeItem('adukw_session');
  window.location.href = 'index.html';
});

// actions
document.getElementById('sendMoneyBtn')?.addEventListener('click', ()=> showPanel('send'));
document.getElementById('txBtn')?.addEventListener('click', ()=> showPanel('tx'));
document.getElementById('loanBtn')?.addEventListener('click', ()=> showPanel('loan'));
document.getElementById('enairaBtn')?.addEventListener('click', ()=> showPanel('more'));

// send money handler
sendForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  sendStatus.textContent = '';
  const toEmail = document.getElementById('t_email').value.trim();
  const amount = Number(document.getElementById('t_amount').value);
  const note = document.getElementById('t_note').value.trim();
  const u = auth.currentUser;
  if(!u){ sendStatus.textContent = 'Not signed in'; sendStatus.style.color='crimson'; return; }
  if(!toEmail || !amount || amount <= 0){ sendStatus.textContent = 'Provide valid recipient and amount'; sendStatus.style.color='crimson'; return; }

  try {
    const senderSnap = await db.ref('users/' + u.uid).once('value');
    const sender = senderSnap.val();
    if((sender.balance || 0) < amount){ sendStatus.textContent = 'Insufficient balance'; sendStatus.style.color='crimson'; return; }

    const usersSnap = await db.ref('users').orderByChild('email').equalTo(toEmail).once('value');
    if(!usersSnap.exists()){ sendStatus.textContent = 'Recipient not found'; sendStatus.style.color='crimson'; return; }
    const recipients = usersSnap.val();
    const recipientUid = Object.keys(recipients)[0];

    const updates = {};
    updates['users/' + u.uid + '/balance'] = (sender.balance || 0) - amount;
    updates['users/' + recipientUid + '/balance'] = (recipients[recipientUid].balance || 0) + amount;

    const txData = { type:'transfer', amount, from: sender.email, to: toEmail, note, createdAt: Date.now() };
    const txRefSender = db.ref('transactions/' + u.uid).push();
    const txRefRecipient = db.ref('transactions/' + recipientUid).push();

    updates[txRefSender.path.toString()] = txData;
    updates[txRefRecipient.path.toString()] = txData;

    await db.ref().update(updates);
    sendStatus.style.color='green';
    sendStatus.textContent = 'Transfer successful';
    sendForm.reset();
    await loadUser(u.uid);
  } catch(err){
    console.error(err);
    sendStatus.style.color='crimson';
    sendStatus.textContent = err.message || 'Transfer failed';
  }
});

// quick loan (simple demo)
requestLoan.addEventListener('click', async () => {
  const u = auth.currentUser;
  if(!u){ alert('Not signed in'); return; }
  const snap = await db.ref('users/' + u.uid).once('value');
  const user = snap.val() || {};
  const eligible = (user.balance || 0) >= 5000 || Math.random() > 0.5;
  if(eligible){
    const newBal = (user.balance || 0) + 20000;
    await db.ref('users/' + u.uid + '/balance').set(newBal);
    await loadUser(u.uid);
    document.getElementById('loanStatus').style.color = 'green';
    document.getElementById('loanStatus').textContent = 'Loan approved (demo). Funds added to your account.';
  } else {
    document.getElementById('loanStatus').style.color = 'crimson';
    document.getElementById('loanStatus').textContent = 'Loan declined based on eligibility.';
  }
});
