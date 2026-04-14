








const firebaseConfig = {
  apiKey: "AIzaSyAs8NPmI_BF9ggyWHZz-lUojGQPJ6gdazQ",
  authDomain: "rosterbate-51339.firebaseapp.com",
  databaseURL: "https://rosterbate-51339-default-rtdb.firebaseio.com",
  projectId: "rosterbate-51339",
  storageBucket: "rosterbate-51339.firebasestorage.app",
  messagingSenderId: "951275364572",
  appId: "1:951275364572:web:758d1b4d970b7b87c05419",
  measurementId: "G-DNSFKMKYVC"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

const HOME_SPORT_LABELS = { nba:'Basketball', nfl:'Football', mlb:'Baseball' };
let selectedHomeSport = getSelectedRosterbateSport();
let navFriendRequestListener = null;
let navThreadListener = null;
const SHEMMY_SEQUENCE = 'shemmy';
let shemmyBuffer = '';
let shemmyLastPlayedAt = 0;
let shemmyAudioPrimed = false;

function updateNavNotificationBadge(count){
  const badge = document.getElementById('navNotify');
  if(!badge) return;
  const total = Number(count || 0);
  badge.textContent = total > 9 ? '9+' : String(total);
  badge.classList.toggle('show', total > 0);
}

function clearNavNotificationSubscriptions(){
  if(navFriendRequestListener){
    navFriendRequestListener.off();
    navFriendRequestListener = null;
  }
  if(navThreadListener){
    navThreadListener.off();
    navThreadListener = null;
  }
  updateNavNotificationBadge(0);
}

function subscribeNavNotifications(userNumber){
  clearNavNotificationSubscriptions();
  const myNumber = Number(userNumber || 0);
  if(!(myNumber > 0)) return;
  let pendingRequests = 0;
  let unreadMessages = 0;
  const refreshBadge = () => updateNavNotificationBadge(pendingRequests + unreadMessages);
  navFriendRequestListener = db.ref('friendRequests/' + myNumber);
  navFriendRequestListener.on('value', snap => {
    pendingRequests = Object.keys(snap.val() || {}).length;
    refreshBadge();
  });
  navThreadListener = db.ref('userThreads/' + myNumber);
  navThreadListener.on('value', snap => {
    const seenAt = Number(localStorage.getItem('rbMessagesLastSeen') || 0);
    const threads = Object.values(snap.val() || {});
    unreadMessages = threads.filter(thread => {
      const updatedAt = Number(thread?.updatedAt || 0);
      const lastSender = Number(thread?.lastSender || 0);
      const hasRealMessage = !!String(thread?.lastMessage || '').trim();
      return hasRealMessage && updatedAt > seenAt && lastSender > 0 && lastSender !== myNumber;
    }).length;
    refreshBadge();
  });
}

function updateHomeSportUI(){
  const sport = normalizeRosterbateSport(selectedHomeSport);
  setSelectedRosterbateSport(sport);
  document.querySelectorAll('.sport-card[data-sport]').forEach(card => {
    card.classList.toggle('active', card.dataset.sport === sport);
  });
  document.getElementById('sportSectionLabel').textContent = 'Get Started — ' + HOME_SPORT_LABELS[sport];
  document.getElementById('single-player-card').href = 'rosterbate-draft.html?sport=' + sport;
  document.getElementById('multiplayer-card').href = 'rosterbate-matchmaking.html?sport=' + sport;
  document.getElementById('season-card').href = 'rosterbate-season.html?sport=' + sport;
}

function selectSportCard(sport){
  selectedHomeSport = normalizeRosterbateSport(sport);
  setSelectedRosterbateSport(selectedHomeSport);
  updateHomeSportUI();
}

let authMode = 'signup';
updateHomeSportUI();
setTimeout(()=>document.body.classList.add('cta-shimmer-ready'), 2000);
setTimeout(()=>document.body.classList.add('cta-logo-sync'), 12000);

function openAuthModal(mode){
  if(mode) setAuthMode(mode);
  document.getElementById('authModal').classList.add('open');
}
function closeAuthModal(){ document.getElementById('authModal').classList.remove('open'); setAuthStatus(''); }
function openSwapExplainer(){ document.getElementById('swapExplainer').classList.add('open'); }
function closeSwapExplainer(){ document.getElementById('swapExplainer').classList.remove('open'); }
function openPowerupExplainer(){ document.getElementById('powerupExplainer').classList.add('open'); }
function closePowerupExplainer(){ document.getElementById('powerupExplainer').classList.remove('open'); }
function openMoneyballExplainer(){ document.getElementById('moneyballExplainer').classList.add('open'); }
function closeMoneyballExplainer(){ document.getElementById('moneyballExplainer').classList.remove('open'); }
function closeAccountMenu(){ document.getElementById('accountMenu')?.classList.remove('open'); }
function toggleAccountMenu(){
  document.getElementById('accountMenu')?.classList.toggle('open');
}
function leaderboardInitials(name){
  const parts=String(name||'Player').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return 'RB';
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
}
let leaderboardPublicCache=[];
let leaderboardUsernameMap={};
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[char]));
}
function mergeLeaderboardUsers(users, usernameMap){
  return (users||[]).map(entry => {
    const userNumber=Number(entry?.userNumber || 0);
    const canonical=usernameMap?.[userNumber];
    if(!canonical) return entry;
    return {
      ...entry,
      username: canonical.username || entry?.username || 'Manager',
      updatedAt: Math.max(Number(entry?.updatedAt || 0), Number(canonical.updatedAt || 0))
    };
  });
}
function dedupeLeaderboardUsers(users){
  const byKey=new Map();
  (users||[]).forEach(entry => {
    const uid=String(entry?.uid || '').trim();
    const userNumber=Number(entry?.userNumber || 0);
    const key=uid || ('userNumber:'+userNumber);
    const existing=byKey.get(key);
    if(!existing){
      byKey.set(key, entry);
      return;
    }
    const existingUpdated=Number(existing?.updatedAt || 0);
    const nextUpdated=Number(entry?.updatedAt || 0);
    const existingScore=Number(existing?.score || 0);
    const nextScore=Number(entry?.score || 0);
    const shouldReplace=
      nextUpdated > existingUpdated ||
      (nextUpdated === existingUpdated && nextScore > existingScore) ||
      (nextUpdated === existingUpdated && nextScore === existingScore && userNumber < Number(existing?.userNumber || 0));
    if(shouldReplace) byKey.set(key, entry);
  });
  return Array.from(byKey.values());
}
function refreshLeaderboard(){
  renderLeaderboard(dedupeLeaderboardUsers(mergeLeaderboardUsers(leaderboardPublicCache, leaderboardUsernameMap)));
}
function renderLeaderboard(users){
  const host=document.getElementById('leaderboardList');
  if(!host) return;
  const rows=(users||[])
    .map(entry=>({
      userNumber:Number(entry?.userNumber||0),
      username:normalizeUsername(entry?.username) || 'Manager',
      photoURL:String(entry?.photoURL||'').trim(),
      score:Number(entry?.score||0),
      profileUrl:entry?.profileUrl || buildPublicUserUrl(entry?.userNumber)
    }))
    .sort((a,b)=>(b.score-a.score) || (a.userNumber-b.userNumber));
  if(!rows.length){
    host.innerHTML='<div class="leaderboard-empty">No ranked members yet. Create an account and start stacking score.</div>';
    return;
  }
  host.innerHTML=rows.map((entry,index)=>{
    const rank=index+1;
    const safeName=escapeHtml(entry.username);
    const safeUrl=escapeHtml(entry.profileUrl);
    const avatar=entry.photoURL
      ? `<img src="${escapeHtml(entry.photoURL)}" alt="${safeName}">`
      : leaderboardInitials(entry.username);
    return `<a class="leaderboard-row top-${Math.min(rank,3)}" href="${safeUrl}">
      <div class="leaderboard-rank">#${rank}</div>
      <div class="leaderboard-user">
        <div class="leaderboard-avatar">${avatar}</div>
        <div>
          <div class="leaderboard-name">${safeName}</div>
          <div class="leaderboard-meta">Member #${entry.userNumber || '—'}</div>
        </div>
      </div>
      <div class="leaderboard-score">
        <div class="leaderboard-score-value">${entry.score}</div>
        <div class="leaderboard-score-label">Score</div>
      </div>
    </a>`;
  }).join('');
}
function subscribeLeaderboard(){
  db.ref('publicUsers').on('value', snap => {
    leaderboardPublicCache=Object.values(snap.val() || {});
    refreshLeaderboard();
  }, () => {
    leaderboardPublicCache=[];
    refreshLeaderboard();
  });
  db.ref('usernames').on('value', snap => {
    const map={};
    Object.values(snap.val() || {}).forEach(record => {
      const userNumber=Number(record?.userNumber || 0);
      const username=normalizeUsername(record?.username);
      if(!userNumber || !username) return;
      const existing=map[userNumber];
      if(!existing || Number(record?.updatedAt || 0) >= Number(existing.updatedAt || 0)){
        map[userNumber]={
          username,
          updatedAt:Number(record?.updatedAt || 0)
        };
      }
    });
    leaderboardUsernameMap=map;
    refreshLeaderboard();
  }, () => {
    leaderboardUsernameMap={};
    refreshLeaderboard();
  });
}
function openSettings(){
  closeAccountMenu();
  window.location.href='profile.html';
}
function primeShemmyAudio(){
  const audio = document.getElementById('shemmyAudio');
  if(!audio || shemmyAudioPrimed) return;
  shemmyAudioPrimed = true;
  try{
    audio.load();
  } catch(_error){}
}
function tryPlayShemmyClip(){
  const audio = document.getElementById('shemmyAudio');
  const now = Date.now();
  if(!audio || now - shemmyLastPlayedAt < 2000) return;
  shemmyLastPlayedAt = now;
  const playNow = () => {
    try{
      audio.pause();
      audio.currentTime = 0;
      const playAttempt = audio.play();
      if(playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(() => {});
    } catch(_error){}
  };
  try{
    if(audio.readyState >= 2){
      playNow();
      return;
    }
    const handleReady = () => {
      audio.removeEventListener('canplay', handleReady);
      playNow();
    };
    audio.addEventListener('canplay', handleReady, { once:true });
    audio.load();
  } catch(_error){}
}
function handleShemmySequence(event){
  if(event.ctrlKey || event.metaKey || event.altKey) return;
  const key = String(event.key || '').toLowerCase();
  if(key.length !== 1 || key < 'a' || key > 'z') return;
  primeShemmyAudio();
  shemmyBuffer = (shemmyBuffer + key).slice(-SHEMMY_SEQUENCE.length);
  if(shemmyBuffer === SHEMMY_SEQUENCE){
    shemmyBuffer = '';
    tryPlayShemmyClip();
  }
}
function openMessages(){
  closeAccountMenu();
  localStorage.setItem('rbMessagesLastSeen', String(Date.now()));
  updateNavNotificationBadge(0);
  window.location.href='messages.html';
}
function openMyLeagues(){
  closeAccountMenu();
  window.location.href='my-leagues.html';
}
function openAdministrator(){
  closeAccountMenu();
  window.location.href='admin-leagues.html';
}
async function openMyProfile(){
  closeAccountMenu();
  let userNumber=Number(localStorage.getItem('rbUserNumber') || 0);
  if(!userNumber && auth.currentUser){
    const snap=await db.ref('users/' + auth.currentUser.uid + '/userNumber').once('value').catch(() => null);
    userNumber=Number(snap?.val?.() || 0);
    if(userNumber) localStorage.setItem('rbUserNumber', String(userNumber));
  }
  if(userNumber){
    window.location.href=buildPublicUserUrl(userNumber);
    return;
  }
  window.location.href='profile.html';
}
async function logoutUser(){
  closeAccountMenu();
  await auth.signOut();
}

function setAuthStatus(message, type){
  const el = document.getElementById('authStatus');
  el.textContent = message || '';
  el.className = 'auth-status' + (type ? ' ' + type : '');
}

function handleAuthKeydown(event){
  if(event.key !== 'Enter') return;
  event.preventDefault();
  submitAuth();
}

function setAuthMode(mode){
  authMode = mode;
  const signup = mode === 'signup';
  document.getElementById('signupTab').classList.toggle('on', signup);
  document.getElementById('loginTab').classList.toggle('on', !signup);
  document.getElementById('authUsername').style.display = signup ? 'block' : 'none';
  document.getElementById('authEmail').placeholder = signup ? 'Email' : 'Email or username';
  document.getElementById('authSubmit').textContent = signup ? 'Create Account' : 'Log In';
  document.getElementById('authSubtext').textContent = signup
    ? 'Create an account in a few seconds with email, username, and password.'
    : 'Log in with your email or username and password.';
  setAuthStatus('');
}

function normalizeUsername(value){
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 20);
}

function usernameLookupKey(value){
  return encodeURIComponent(normalizeUsername(value).toLowerCase());
}

function fallbackUsernameFromUser(user){
  if(user.displayName) return normalizeUsername(user.displayName);
  if(user.email) return normalizeUsername(user.email.split('@')[0]);
  return 'Manager';
}

function buildEmailActionSettings(){
  const baseUrl = window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : 'https://rosterbate.net';
  return {
    url: baseUrl + '/index.html?emailVerified=1'
  };
}

function defaultLifetimeStats(){
  return {
    seasonsPlayed: 0,
    regularSeasonWins: 0,
    regularSeasonLosses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    championships: 0,
    podiums: 0,
    bestFinish: 0,
    lastFinish: 0,
    updatedAt: 0
  };
}

function defaultScoreState(){
  return {
    score: 0
  };
}

function buildPublicUserUrl(userNumber){
  return '/user/' + encodeURIComponent(userNumber);
}

function parseCreatedAt(user, fallbackValue){
  const created = Date.parse(user?.metadata?.creationTime || '');
  return Number.isFinite(created) ? created : fallbackValue;
}

function initSpotlightPanes(){
  const panes = Array.from(document.querySelectorAll('.spotlight-pane'));
  if(!panes.length) return;
  if(window.matchMedia && window.matchMedia('(hover: none)').matches){
    panes.forEach(pane => pane.classList.remove('is-glowing'));
    return;
  }

  const activationPadding = 96;
  let rafId = 0;
  let pointerX = window.innerWidth * 0.5;
  let pointerY = window.innerHeight * 0.5;

  const render = () => {
    panes.forEach(pane => {
      const rect = pane.getBoundingClientRect();
      const active =
        pointerX >= rect.left - activationPadding &&
        pointerX <= rect.right + activationPadding &&
        pointerY >= rect.top - activationPadding &&
        pointerY <= rect.bottom + activationPadding;

      if(!active){
        pane.classList.remove('is-glowing');
        return;
      }

      const relativeX = Math.max(0, Math.min(100, ((pointerX - rect.left) / Math.max(rect.width, 1)) * 100));
      const relativeY = Math.max(0, Math.min(100, ((pointerY - rect.top) / Math.max(rect.height, 1)) * 100));
      pane.style.setProperty('--gx', relativeX.toFixed(2) + '%');
      pane.style.setProperty('--gy', relativeY.toFixed(2) + '%');
      pane.classList.add('is-glowing');
    });
    rafId = 0;
  };

  const queueRender = () => {
    if(rafId) return;
    rafId = requestAnimationFrame(render);
  };

  window.addEventListener('pointermove', event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    queueRender();
  }, { passive:true });

  window.addEventListener('scroll', queueRender, { passive:true });
  window.addEventListener('resize', queueRender);
  document.addEventListener('pointerleave', () => {
    panes.forEach(pane => pane.classList.remove('is-glowing'));
  });

  queueRender();
}

function initHomeBackground(){
  const canvas = document.getElementById('homeBgParticles');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if(!ctx) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let particles = [];
  let rafId = 0;

  function setSize(){
    const ratio = Math.min(window.devicePixelRatio || 1, 1.8);
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function makeParticle(){
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      v: Math.random() * 0.26 + 0.06,
      o: Math.random() * 0.26 + 0.08,
      l: Math.random() * 3 + 1.2
    };
  }

  function seedParticles(){
    particles = [];
    const count = Math.max(36, Math.floor((window.innerWidth * window.innerHeight) / 14000));
    for(let i = 0; i < count; i += 1){
      particles.push(makeParticle());
    }
  }

  function drawStatic(){
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(particle => {
      ctx.fillStyle = 'rgba(250,250,250,' + particle.o.toFixed(3) + ')';
      ctx.fillRect(particle.x, particle.y, 0.8, particle.l);
    });
  }

  function draw(){
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(particle => {
      particle.y -= particle.v;
      if(particle.y < -particle.l){
        particle.x = Math.random() * window.innerWidth;
        particle.y = window.innerHeight + Math.random() * 40;
        particle.v = Math.random() * 0.26 + 0.06;
        particle.o = Math.random() * 0.26 + 0.08;
        particle.l = Math.random() * 3 + 1.2;
      }
      ctx.fillStyle = 'rgba(250,250,250,' + particle.o.toFixed(3) + ')';
      ctx.fillRect(particle.x, particle.y, 0.8, particle.l);
    });
    rafId = requestAnimationFrame(draw);
  }

  function refresh(){
    setSize();
    seedParticles();
    if(reducedMotion){
      drawStatic();
      return;
    }
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', refresh);
  refresh();
}

function allocateNextUserNumber(){
  return new Promise((resolve, reject) => {
    db.ref('meta/nextUserNumber').transaction(
      current => (Number(current) || 0) + 1,
      (error, committed, snapshot) => {
        if(error) return reject(error);
        if(!committed) return reject(new Error('Could not reserve a user number.'));
        resolve(Number(snapshot.val()) || 0);
      }
    );
  });
}

async function ensureUserNumber(user, existingProfile){
  const existingNumber = Number(existingProfile?.userNumber || 0);
  if(existingNumber > 0) return existingNumber;
  const snap = await db.ref('users/' + user.uid + '/userNumber').once('value').catch(() => null);
  const storedNumber = Number(snap?.val?.() || 0);
  if(storedNumber > 0) return storedNumber;
  return allocateNextUserNumber();
}
const ROSTERBATE_ADMIN_NUMBERS = [1,2,3,4,5];
function isRosterbateAdminNumber(userNumber){
  return ROSTERBATE_ADMIN_NUMBERS.includes(Number(userNumber || 0));
}

async function saveUserProfile(user, username){
  const cleanUsername = normalizeUsername(username) || fallbackUsernameFromUser(user);
  const key = usernameLookupKey(cleanUsername);
  const existing = await db.ref('usernames/' + key).once('value');
  const existingValue = existing.val();
  if(existingValue && existingValue.uid && existingValue.uid !== user.uid){
    throw new Error('That username is already taken.');
  }
  const previousProfileSnap = await db.ref('users/' + user.uid).once('value').catch(() => null);
  const previousProfile = previousProfileSnap?.val?.() || {};
  const previousUsername = normalizeUsername(previousProfile.username);
  const previousKey = previousUsername ? usernameLookupKey(previousUsername) : '';
  const updatedAt = Date.now();
  const userNumber = await ensureUserNumber(user, previousProfile);
  const isAdmin = isRosterbateAdminNumber(userNumber);
  const memberSince = Number(previousProfile.memberSince || parseCreatedAt(user, updatedAt));
  const publicSnap = await db.ref('publicUsers/' + userNumber).once('value').catch(() => null);
  const publicProfile = publicSnap?.val?.() || {};
  const hasPublicProfile = !!publicSnap?.exists?.();
  const score = Math.max(Number(previousProfile.score || 0), Number(publicProfile.score || 0), Number(defaultScoreState().score));
  await user.updateProfile({ displayName: cleanUsername });
  const updates = {};
  updates['users/' + user.uid + '/email'] = user.email || '';
  updates['users/' + user.uid + '/username'] = cleanUsername;
  updates['users/' + user.uid + '/userNumber'] = userNumber;
  updates['users/' + user.uid + '/isAdmin'] = isAdmin;
  updates['users/' + user.uid + '/memberSince'] = memberSince;
  updates['users/' + user.uid + '/score'] = score;
  updates['users/' + user.uid + '/provider'] = user.providerData?.[0]?.providerId || 'password';
  updates['users/' + user.uid + '/updatedAt'] = updatedAt;
  updates['usernames/' + key] = {
    uid: user.uid,
    email: user.email || '',
    username: cleanUsername,
    userNumber,
    updatedAt
  };
  updates['publicUsers/' + userNumber + '/uid'] = user.uid;
  updates['publicUsers/' + userNumber + '/userNumber'] = userNumber;
  updates['publicUsers/' + userNumber + '/isAdmin'] = isAdmin;
  updates['publicUsers/' + userNumber + '/username'] = cleanUsername;
  updates['publicUsers/' + userNumber + '/photoURL'] = user.photoURL || '';
  updates['publicUsers/' + userNumber + '/memberSince'] = memberSince;
  updates['publicUsers/' + userNumber + '/score'] = score;
  updates['publicUsers/' + userNumber + '/profileUrl'] = buildPublicUserUrl(userNumber);
  updates['publicUsers/' + userNumber + '/updatedAt'] = updatedAt;
  if(!hasPublicProfile){
    updates['publicUsers/' + userNumber + '/lifetime'] = defaultLifetimeStats();
  }
  if(previousKey && previousKey !== key){
    updates['usernames/' + previousKey] = null;
  }
  await db.ref().update(updates);
  localStorage.setItem('rbPlayerName', cleanUsername);
  localStorage.setItem('rbUserNumber', String(userNumber));
  localStorage.setItem('rbIsAdmin', isAdmin ? '1' : '0');
}

async function resolveLoginEmail(identifier){
  const value = String(identifier || '').trim();
  if(!value) throw new Error('Email or username is required.');
  if(value.includes('@')) return value;
  const key = usernameLookupKey(value);
  if(!key) throw new Error('Email or username is required.');
  const snap = await db.ref('usernames/' + key).once('value');
  const record = snap.val();
  if(record?.email) return String(record.email).trim();
  throw new Error('No account found for that username.');
}

async function submitAuth(){
  const identifier = document.getElementById('authEmail').value.trim();
  const username = normalizeUsername(document.getElementById('authUsername').value);
  const password = document.getElementById('authPassword').value;
  let shouldCloseModal = false;
  if(!identifier || !password){ setAuthStatus((authMode === 'signup' ? 'Email' : 'Email or username') + ' and password are required.', 'error'); return; }
  if(authMode === 'signup' && username.length < 3){ setAuthStatus('Choose a username with at least 3 characters.', 'error'); return; }
  try{
    setAuthStatus(authMode === 'signup' ? 'Creating your account...' : 'Logging you in...');
    if(authMode === 'signup'){
      const email = identifier;
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await saveUserProfile(cred.user, username);
      try{
        await cred.user.sendEmailVerification(buildEmailActionSettings());
        setAuthStatus('Account created. Check your email to verify your address.', 'success');
        shouldCloseModal = true;
      } catch (verifyError){
        console.warn('Verification email failed to send', verifyError);
        setAuthStatus((verifyError && verifyError.message) || 'Account created, but the verification email could not be sent yet.', 'error');
      }
    } else {
      const email = await resolveLoginEmail(identifier);
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const snap = await db.ref('users/' + cred.user.uid).once('value');
      let profile = snap.val() || {};
      if(!profile.userNumber){
        await saveUserProfile(cred.user, normalizeUsername(profile.username) || fallbackUsernameFromUser(cred.user));
        profile = (await db.ref('users/' + cred.user.uid).once('value')).val() || {};
      }
      localStorage.setItem('rbPlayerName', normalizeUsername(profile.username) || fallbackUsernameFromUser(cred.user));
      if(profile.userNumber) localStorage.setItem('rbUserNumber', String(profile.userNumber));
      setAuthStatus('Logged in successfully.', 'success');
      shouldCloseModal = true;
    }
    if(shouldCloseModal) setTimeout(closeAuthModal, 700);
  } catch (error){
    setAuthStatus(error.message || 'Authentication failed.', 'error');
  }
}

auth.onAuthStateChanged(async user => {
  const trigger = document.getElementById('authTrigger');
  const loginTrigger = document.getElementById('loginTrigger');
  const accountMenu = document.getElementById('accountMenu');
  const navActions = document.getElementById('navActions');
  if(!trigger) return;
  if(user){
    let snap = await db.ref('users/' + user.uid).once('value').catch(() => null);
    let profile = snap?.val?.() || {};
    if(!profile.userNumber){
      await saveUserProfile(user, normalizeUsername(profile.username) || fallbackUsernameFromUser(user));
      snap = await db.ref('users/' + user.uid).once('value').catch(() => null);
      profile = snap?.val?.() || {};
    }
    const username = normalizeUsername(profile.username) || fallbackUsernameFromUser(user);
    localStorage.setItem('rbPlayerName', username);
    if(profile.userNumber) localStorage.setItem('rbUserNumber', String(profile.userNumber));
    localStorage.setItem('rbIsAdmin', (profile.isAdmin || isRosterbateAdminNumber(profile.userNumber)) ? '1' : '0');
    
    // Show/hide admin menu item
    const adminMenuItem = document.getElementById('adminMenuItem');
    if(adminMenuItem){
      if(profile.isAdmin === true || 
         user.uid === 'ZqytkFsUCYZylOgWF6OZf2714w12' || 
         user.uid === 'sAu0wDTK33ensoTQ3reEXvzpkbv2'){
        adminMenuItem.style.display = 'block';
      } else {
        adminMenuItem.style.display = 'none';
      }
    }
    
    trigger.textContent = username;
    trigger.classList.add('secondary');
    if(navActions) navActions.classList.add('logged-in');
    if(loginTrigger){
      loginTrigger.style.display = 'inline-block';
      loginTrigger.style.visibility = 'hidden';
      loginTrigger.style.pointerEvents = 'none';
    }
    if(accountMenu) accountMenu.classList.remove('open');
    trigger.onclick = toggleAccountMenu;
    subscribeNavNotifications(profile.userNumber || 0);
  } else {
    clearNavNotificationSubscriptions();
    localStorage.removeItem('rbIsAdmin');
    trigger.textContent = 'Sign Up';
    trigger.classList.remove('secondary');
    if(navActions) navActions.classList.remove('logged-in');
    if(accountMenu) accountMenu.classList.remove('open');
    trigger.onclick = () => openAuthModal('signup');
    if(loginTrigger){
      loginTrigger.style.display = 'inline-block';
      loginTrigger.style.visibility = '';
      loginTrigger.style.pointerEvents = '';
      loginTrigger.onclick = () => openAuthModal('login');
    }
  }
  if(navActions) navActions.classList.remove('auth-pending');
});

document.addEventListener('click', event => {
  if(!event.target.closest('.account-wrap')) closeAccountMenu();
});
document.addEventListener('keydown', handleShemmySequence);

initHomeBackground();
initSpotlightPanes();
subscribeLeaderboard();
setAuthMode('signup');
