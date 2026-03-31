import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =====================================================
   FIREBASE CONFIG
===================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyBPHgHW64rqOKVSrcCdpMGp_9yRacxIPnU",
  authDomain: "atendimento-142ff.firebaseapp.com",
  projectId: "atendimento-142ff",
  storageBucket: "atendimento-142ff.firebasestorage.app",
  messagingSenderId: "330549130188",
  appId: "1:330549130188:web:26c877274f5ccc2b9aa369",
  measurementId: "G-HBK54RTTMN"
};

// Initialize Firebase

/* =====================================================
   EMAIL REAL DA SUA MÃE
   coloque exatamente o mesmo email criado no Authentication
===================================================== */
const SUPPORT_EMAIL = "cleanpro2507@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SUPPORT_USER = {
  id: "mom-support",
  username: "Mãe / Suporte",
  role: "support",
  status: "online"
};

const PUBLIC_CONVERSATION = {
  type: "publico",
  threadId: "public-room",
  title: "Sala pública"
};

const state = {
  currentUser: null,
  currentConversation: { ...PUBLIC_CONVERSATION },
  selectedActionUser: null,
  selectedFriendUser: null,
  unsubscribeMessages: null,
  unsubscribeUsers: null,
  unsubscribeFriends: null
};

/* =====================================================
   ELEMENTOS
===================================================== */
const welcomeScreen = document.getElementById("welcomeScreen");
const chatApp = document.getElementById("chatApp");

const openClientModeBtn = document.getElementById("openClientModeBtn");
const openSupportModeBtn = document.getElementById("openSupportModeBtn");
const usernameForm = document.getElementById("usernameForm");
const supportLoginForm = document.getElementById("supportLoginForm");

const usernameInput = document.getElementById("usernameInput");
const supportEmailInput = document.getElementById("supportEmailInput");
const supportPasswordInput = document.getElementById("supportPasswordInput");

const currentUserLabel = document.getElementById("currentUserLabel");
const roomStatus = document.getElementById("roomStatus");
const logoutBtn = document.getElementById("logoutBtn");

const messagesContainer = document.getElementById("messagesContainer");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const usersList = document.getElementById("usersList");
const friendsList = document.getElementById("friendsList");
const onlineCount = document.getElementById("onlineCount");

const conversationTabs = document.getElementById("conversationTabs");
const conversationTitle = document.getElementById("conversationTitle");

const userActionMenu = document.getElementById("userActionMenu");
const startPrivateChatBtn = document.getElementById("startPrivateChatBtn");
const addFriendBtn = document.getElementById("addFriendBtn");

const friendActionMenu = document.getElementById("friendActionMenu");
const friendPrivateChatBtn = document.getElementById("friendPrivateChatBtn");
const removeFriendBtn = document.getElementById("removeFriendBtn");

const momActionBtn = document.getElementById("momActionBtn");
const momCard = document.getElementById("momCard");

const sideTabs = document.querySelectorAll(".side-tab");
const usuariosPanel = document.getElementById("usuariosPanel");
const amigosPanel = document.getElementById("amigosPanel");

const sidebar = document.getElementById("sidebar");
const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
const mobileSidebarOverlay = document.getElementById("mobileSidebarOverlay");

/* =====================================================
   UTILITÁRIOS
===================================================== */
function sanitizeUsername(name) {
  return name.trim().replace(/\s+/g, " ").replace(/[<>]/g, "").slice(0, 24);
}

function generateUserId() {
  return `u_${crypto.randomUUID()}`;
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function formatTime(timestamp) {
  if (!timestamp) return "agora";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
}

function scrollMessagesToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function buildPrivateThreadId(userA, userB) {
  return [userA, userB].sort().join("__");
}

function closeAllMenus() {
  userActionMenu.classList.add("hidden");
  friendActionMenu.classList.add("hidden");
  state.selectedActionUser = null;
  state.selectedFriendUser = null;
}

function openUserMenu(x, y, user) {
  closeAllMenus();
  state.selectedActionUser = user;
  userActionMenu.style.left = `${x}px`;
  userActionMenu.style.top = `${y}px`;
  userActionMenu.classList.remove("hidden");
}

function openFriendMenu(x, y, user) {
  closeAllMenus();
  state.selectedFriendUser = user;
  friendActionMenu.style.left = `${x}px`;
  friendActionMenu.style.top = `${y}px`;
  friendActionMenu.classList.remove("hidden");
}

function setEmptyMessagesState(title, text) {
  messagesContainer.innerHTML = `
    <div class="empty-state">
      <h3>${title}</h3>
      <p>${text}</p>
    </div>
  `;
}

function getEmptyStateByConversation() {
  if (state.currentConversation.type === "privado") {
    return {
      title: "Nenhuma mensagem privada ainda",
      text: "Envie a primeira mensagem para iniciar esta conversa privada."
    };
  }

  return {
    title: "Nenhuma mensagem ainda",
    text: "Quando alguém enviar algo, as mensagens aparecerão aqui em tempo real."
  };
}

function showChat() {
  currentUserLabel.textContent = state.currentUser?.username || "-";
  welcomeScreen.classList.add("hidden");
  chatApp.classList.remove("hidden");
}

function showWelcome() {
  chatApp.classList.add("hidden");
  welcomeScreen.classList.remove("hidden");
}

function setRoomHeader() {
  const { type, title } = state.currentConversation;
  conversationTitle.textContent = title;
  roomStatus.textContent =
    type === "publico" ? "Sala pública ativa" : `Chat privado com ${title}`;
}

function activateConversationTab(threadId) {
  [...conversationTabs.querySelectorAll(".tab")].forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.threadId === threadId);
  });
}

function addTabClickHandler(tab) {
  tab.addEventListener("click", () => {
    switchConversation({
      type: tab.dataset.conversationType,
      threadId: tab.dataset.threadId,
      title: tab.dataset.title || tab.textContent.trim()
    });
  });
}

function ensurePublicTabHandler() {
  const publicTab = conversationTabs.querySelector('[data-thread-id="public-room"]');
  if (publicTab && !publicTab.dataset.bound) {
    addTabClickHandler(publicTab);
    publicTab.dataset.bound = "true";
  }
}

function createConversationTab({ type, threadId, title }) {
  const existing = conversationTabs.querySelector(`[data-thread-id="${threadId}"]`);
  if (existing) return existing;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `tab ${type === "privado" ? "private-tab" : ""}`;
  btn.dataset.conversationType = type;
  btn.dataset.threadId = threadId;
  btn.dataset.title = title;
  btn.textContent = type === "publico" ? "Público" : title;

  addTabClickHandler(btn);
  btn.dataset.bound = "true";
  conversationTabs.appendChild(btn);
  return btn;
}

function setMode(mode) {
  const isClient = mode === "client";
  openClientModeBtn.classList.toggle("active", isClient);
  openSupportModeBtn.classList.toggle("active", !isClient);
  usernameForm.classList.toggle("hidden", !isClient);
  supportLoginForm.classList.toggle("hidden", isClient);
}

function resetAppStateUi() {
  [...conversationTabs.querySelectorAll(".tab")].forEach((tab, index) => {
    if (index > 0) tab.remove();
  });

  switchConversation({ ...PUBLIC_CONVERSATION });
  messagesContainer.innerHTML = "";
  setEmptyMessagesState("Nenhuma mensagem ainda", "Quando alguém enviar algo, as mensagens aparecerão aqui em tempo real.");
}

function cleanupRealtimeListeners() {
  if (state.unsubscribeMessages) {
    state.unsubscribeMessages();
    state.unsubscribeMessages = null;
  }
  if (state.unsubscribeUsers) {
    state.unsubscribeUsers();
    state.unsubscribeUsers = null;
  }
  if (state.unsubscribeFriends) {
    state.unsubscribeFriends();
    state.unsubscribeFriends = null;
  }
}

/* =====================================================
   MODOS DE ENTRADA
===================================================== */
openClientModeBtn.addEventListener("click", () => setMode("client"));
openSupportModeBtn.addEventListener("click", () => setMode("support"));

/* =====================================================
   ENTRADA CLIENTE
===================================================== */
usernameForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = sanitizeUsername(usernameInput.value);

  if (!username || username.length < 2) {
    alert("Digite um nome de usuário válido.");
    return;
  }

  state.currentUser = {
    id: generateUserId(),
    username,
    role: "user",
    status: "online",
    isSupportAuth: false
  };

  try {
    await registerCurrentUserPresence();
    showChat();
    ensurePublicTabHandler();
    initRealtimeListeners();
    switchConversation({ ...PUBLIC_CONVERSATION });
  } catch (error) {
    console.error("Erro ao entrar no chat:", error);
    alert("Não foi possível entrar no chat.");
  }
});

/* =====================================================
   ENTRADA SUPORTE
===================================================== */
supportLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = supportEmailInput.value.trim();
  const password = supportPasswordInput.value;

  if (!email || !password) {
    alert("Preencha email e senha.");
    return;
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const authEmail = result.user.email || "";

    if (authEmail.toLowerCase() !== SUPPORT_EMAIL.toLowerCase()) {
      await signOut(auth);
      alert("Este email não está autorizado para a conta de suporte.");
      return;
    }

    state.currentUser = {
      id: SUPPORT_USER.id,
      username: SUPPORT_USER.username,
      role: "support",
      status: "online",
      isSupportAuth: true,
      authUid: result.user.uid,
      email: authEmail
    };

    await registerCurrentUserPresence();
    showChat();
    ensurePublicTabHandler();
    initRealtimeListeners();
    switchConversation({ ...PUBLIC_CONVERSATION });
  } catch (error) {
    console.error("Erro no login do suporte:", error);
    alert("Email ou senha inválidos para o suporte.");
  }
});

/* =====================================================
   PRESENÇA
===================================================== */
async function registerCurrentUserPresence() {
  if (!state.currentUser) return;

  await setDoc(
    doc(db, "users", state.currentUser.id),
    {
      username: state.currentUser.username,
      role: state.currentUser.role,
      status: "online",
      updatedAt: serverTimestamp(),
      ...(state.currentUser.role === "support"
        ? {
            supportEmail: state.currentUser.email || SUPPORT_EMAIL
          }
        : {
            createdAt: serverTimestamp()
          })
    },
    { merge: true }
  );
}

window.addEventListener("beforeunload", async () => {
  if (!state.currentUser) return;

  try {
    await updateDoc(doc(db, "users", state.currentUser.id), {
      status: "offline",
      updatedAt: serverTimestamp()
    });
  } catch (_) {}
});

/* =====================================================
   LISTENERS
===================================================== */
function initRealtimeListeners() {
  listenUsers();
  listenFriends();
}

function listenUsers() {
  if (state.unsubscribeUsers) state.unsubscribeUsers();

  const usersQuery = query(collection(db, "users"));

  state.unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
    const users = [];
    snapshot.forEach((docItem) => {
      users.push({
        id: docItem.id,
        ...docItem.data()
      });
    });

    renderUsers(users);
  });
}

function listenFriends() {
  if (state.unsubscribeFriends) state.unsubscribeFriends();
  if (!state.currentUser) return;

  const friendsQuery = query(
    collection(db, "friendships"),
    where("ownerId", "==", state.currentUser.id)
  );

  state.unsubscribeFriends = onSnapshot(friendsQuery, async (snapshot) => {
    if (snapshot.empty) {
      friendsList.className = "friends-list empty-list";
      friendsList.textContent = "Nenhum amigo adicionado ainda.";
      return;
    }

    const friendDocs = snapshot.docs.map((d) => d.data());
    friendsList.className = "friends-list";
    friendsList.innerHTML = "";

    for (const friend of friendDocs) {
      const userSnap = await getDoc(doc(db, "users", friend.friendId));
      if (!userSnap.exists()) continue;

      const data = userSnap.data();

      const row = document.createElement("div");
      row.className = "friend-row";
      row.innerHTML = `
        <div class="friend-avatar">${getInitials(data.username)}</div>
        <div class="friend-info">
          <strong>${escapeHtml(data.username)}</strong>
          <span>${data.status === "online" ? "Online" : "Offline"}</span>
        </div>
        <div class="user-status" style="opacity:${data.status === "online" ? "1" : "0.35"}"></div>
      `;

      row.addEventListener("click", (event) => {
        openFriendMenu(event.clientX, event.clientY, {
          id: friend.friendId,
          username: data.username,
          role: data.role || "user"
        });
      });

      friendsList.appendChild(row);
    }
  });
}

/* =====================================================
   USUÁRIOS
===================================================== */
function renderUsers(users) {
  usersList.innerHTML = "";
  onlineCount.textContent = users.filter((u) => u.status === "online").length;

  const filtered = users.filter((u) => u.id !== state.currentUser?.id);

  if (!filtered.length) {
    usersList.innerHTML = `<div class="empty-list">Nenhum outro usuário visível no momento.</div>`;
    return;
  }

  filtered.forEach((user) => {
    const row = document.createElement("div");
    row.className = "user-row";
    row.innerHTML = `
      <div class="user-avatar">${getInitials(user.username)}</div>
      <div class="user-info">
        <strong>${escapeHtml(user.username)}</strong>
        <span>${user.status === "online" ? "Online agora" : "Offline"}</span>
      </div>
      <div class="user-status" style="opacity:${user.status === "online" ? "1" : "0.35"}"></div>
    `;

    row.addEventListener("click", (event) => {
      openUserMenu(event.clientX, event.clientY, {
        id: user.id,
        username: user.username,
        role: user.role || "user"
      });
    });

    usersList.appendChild(row);
  });
}

/* =====================================================
   CONVERSAS
===================================================== */
function switchConversation(conversation) {
  state.currentConversation = { ...conversation };
  setRoomHeader();
  activateConversationTab(conversation.threadId);
  subscribeToMessages();
}

function startPrivateChat(user) {
  if (!state.currentUser || !user?.id) return;

  const threadId = buildPrivateThreadId(state.currentUser.id, user.id);
  const title = user.username;

  createConversationTab({
    type: "privado",
    threadId,
    title
  });

  switchConversation({
    type: "privado",
    threadId,
    title
  });

  closeAllMenus();
}

/* =====================================================
   MENSAGENS
===================================================== */
function getMessagesCollectionRef() {
  if (state.currentConversation.type === "publico") {
    return collection(db, "publicMessages", "public-room", "messages");
  }

  return collection(db, "privateThreads", state.currentConversation.threadId, "messages");
}

function subscribeToMessages() {
  if (state.unsubscribeMessages) {
    state.unsubscribeMessages();
    state.unsubscribeMessages = null;
  }

  const emptyState = getEmptyStateByConversation();
  setEmptyMessagesState(emptyState.title, emptyState.text);

  const msgsRef = getMessagesCollectionRef();
  const q = query(msgsRef, orderBy("createdAt", "asc"), limit(300));

  state.unsubscribeMessages = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        const stateText = getEmptyStateByConversation();
        setEmptyMessagesState(stateText.title, stateText.text);
        return;
      }

      messagesContainer.innerHTML = "";

      snapshot.forEach((docItem) => {
        renderMessage(docItem.data());
      });

      scrollMessagesToBottom();
    },
    (error) => {
      console.error("Erro ao carregar mensagens:", error);
      setEmptyMessagesState(
        "Erro ao carregar mensagens",
        "Confira as rules do Firestore e a configuração do projeto."
      );
    }
  );
}

function renderMessage(msg) {
  const div = document.createElement("article");
  div.className = `message ${msg.senderId === state.currentUser.id ? "self" : "other"} ${msg.type === "privado" ? "private-tag" : ""}`;

  div.innerHTML = `
    <div class="meta">
      <span class="author">${escapeHtml(msg.senderName || "Usuário")}</span>
      <span>•</span>
      <span>${formatTime(msg.createdAt)}</span>
      ${msg.type === "privado" ? `<span>• Privado</span>` : ""}
    </div>
    <div class="text">${escapeHtml(msg.text || "")}</div>
  `;

  messagesContainer.appendChild(div);
}

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = messageInput.value.trim();
  if (!text || !state.currentUser) return;

  const payload = {
    senderId: state.currentUser.id,
    senderName: state.currentUser.username,
    text,
    type: state.currentConversation.type,
    createdAt: serverTimestamp()
  };

  try {
    if (state.currentConversation.type === "publico") {
      await addDoc(
        collection(db, "publicMessages", "public-room", "messages"),
        payload
      );
    } else {
      await addDoc(
        collection(db, "privateThreads", state.currentConversation.threadId, "messages"),
        payload
      );

      await setDoc(
        doc(db, "privateThreads", state.currentConversation.threadId),
        {
          members: state.currentConversation.threadId.split("__"),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    messageInput.value = "";
    autoResizeTextarea();
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    alert("Não foi possível enviar a mensagem.");
  }
});

/* =====================================================
   AMIGOS
===================================================== */
async function addFriend(user) {
  if (!state.currentUser || !user?.id) return;
  if (user.id === state.currentUser.id) {
    alert("Você não pode adicionar você mesma.");
    return;
  }

  try {
    await setDoc(doc(db, "friendships", `${state.currentUser.id}__${user.id}`), {
      ownerId: state.currentUser.id,
      friendId: user.id,
      createdAt: serverTimestamp()
    });

    alert(`${user.username} foi adicionado(a) aos seus amigos.`);
    closeAllMenus();
  } catch (error) {
    console.error("Erro ao adicionar amigo:", error);
    alert("Não foi possível adicionar aos amigos.");
  }
}

async function removeFriend(user) {
  if (!state.currentUser || !user?.id) return;

  try {
    await deleteDoc(doc(db, "friendships", `${state.currentUser.id}__${user.id}`));
    alert(`${user.username} foi removido(a) dos amigos.`);
    closeAllMenus();
  } catch (error) {
    console.error("Erro ao remover amigo:", error);
    alert("Não foi possível remover dos amigos.");
  }
}

/* =====================================================
   MENUS
===================================================== */
momActionBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  const rect = momCard.getBoundingClientRect();
  openUserMenu(rect.left + rect.width - 220, rect.top + 58, SUPPORT_USER);
});

momCard.addEventListener("click", (event) => {
  if (event.target.closest("#momActionBtn")) return;
  const rect = momCard.getBoundingClientRect();
  openUserMenu(rect.left + rect.width - 220, rect.top + 58, SUPPORT_USER);
});

startPrivateChatBtn.addEventListener("click", () => {
  if (!state.selectedActionUser) return;
  startPrivateChat(state.selectedActionUser);
});

addFriendBtn.addEventListener("click", async () => {
  if (!state.selectedActionUser) return;
  await addFriend(state.selectedActionUser);
});

friendPrivateChatBtn.addEventListener("click", () => {
  if (!state.selectedFriendUser) return;
  startPrivateChat(state.selectedFriendUser);
});

removeFriendBtn.addEventListener("click", async () => {
  if (!state.selectedFriendUser) return;
  await removeFriend(state.selectedFriendUser);
});

document.addEventListener("click", (event) => {
  const inside =
    event.target.closest(".context-menu") ||
    event.target.closest(".user-row") ||
    event.target.closest(".friend-row") ||
    event.target.closest("#momCard");

  if (!inside) closeAllMenus();
});

/* =====================================================
   SIDEBAR
===================================================== */
sideTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    sideTabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    const target = tab.dataset.sideTab;
    usuariosPanel.classList.toggle("active", target === "usuarios");
    amigosPanel.classList.toggle("active", target === "amigos");
  });
});

mobileSidebarToggle.addEventListener("click", () => {
  sidebar.classList.add("open");
  mobileSidebarOverlay.classList.remove("hidden");
});

mobileSidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  mobileSidebarOverlay.classList.add("hidden");
});

/* =====================================================
   INPUT
===================================================== */
messageInput.addEventListener("input", autoResizeTextarea);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    messageForm.requestSubmit();
  }
});

/* =====================================================
   LOGOUT
===================================================== */
logoutBtn.addEventListener("click", async () => {
  try {
    if (state.currentUser?.id) {
      await updateDoc(doc(db, "users", state.currentUser.id), {
        status: "offline",
        updatedAt: serverTimestamp()
      });
    }
  } catch (_) {}

  try {
    if (state.currentUser?.isSupportAuth) {
      await signOut(auth);
    }
  } catch (_) {}

  cleanupRealtimeListeners();
  state.currentUser = null;
  state.currentConversation = { ...PUBLIC_CONVERSATION };
  closeAllMenus();
  resetAppStateUi();

  usernameInput.value = "";
  supportEmailInput.value = "";
  supportPasswordInput.value = "";
  setMode("client");
  showWelcome();
});

/* =====================================================
   INÍCIO
===================================================== */
ensurePublicTabHandler();
setMode("client");
