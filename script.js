import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
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
   COLE AQUI O SEU FIREBASE CONFIG
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

/* =====================================================
   CONFIG
===================================================== */
const SUPPORT_USER = {
  id: "mom-support",
  username: "Mãe / Suporte",
  role: "support",
  status: "online"
};

const state = {
  currentUser: null,
  currentConversation: {
    type: "publico",
    threadId: "public-room",
    title: "Sala pública"
  },
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
const usernameForm = document.getElementById("usernameForm");
const usernameInput = document.getElementById("usernameInput");
const currentUserLabel = document.getElementById("currentUserLabel");
const roomStatus = document.getElementById("roomStatus");

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
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .slice(0, 24);
}

function generateUserId() {
  const saved = localStorage.getItem("support_chat_uid");
  if (saved) return saved;

  const uid = `u_${crypto.randomUUID()}`;
  localStorage.setItem("support_chat_uid", uid);
  return uid;
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

function scrollMessagesToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
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

function setEmptyMessagesState(
  title = "Nenhuma mensagem ainda",
  text = "Quando alguém enviar algo, as mensagens aparecerão aqui em tempo real."
) {
  messagesContainer.innerHTML = `
    <div class="empty-state">
      <h3>${title}</h3>
      <p>${text}</p>
    </div>
  `;
}

function buildPrivateThreadId(userA, userB) {
  return [userA, userB].sort().join("__");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* =====================================================
   ENTRADA
===================================================== */
usernameForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = sanitizeUsername(usernameInput.value);

  if (!username || username.length < 2) {
    alert("Digite um nome de usuário válido.");
    return;
  }

  const uid = generateUserId();

  state.currentUser = {
    id: uid,
    username,
    role: "user",
    status: "online"
  };

  localStorage.setItem("support_chat_username", username);

  try {
    await registerUserPresence();
    showChat();
    initRealtimeListeners();
    switchConversation({
      type: "publico",
      threadId: "public-room",
      title: "Sala pública"
    });
  } catch (error) {
    console.error("Erro ao entrar no chat:", error);
    alert("Não foi possível entrar no chat. Verifique o Firebase config, as Rules e o Console.");
  }
});

function showChat() {
  currentUserLabel.textContent = state.currentUser?.username || "-";
  welcomeScreen.classList.add("hidden");
  chatApp.classList.remove("hidden");
}

function restoreSessionIfExists() {
  const username = localStorage.getItem("support_chat_username");
  if (!username) return;

  const uid = generateUserId();

  state.currentUser = {
    id: uid,
    username,
    role: "user",
    status: "online"
  };

  registerUserPresence()
    .then(() => {
      showChat();
      initRealtimeListeners();
      switchConversation({
        type: "publico",
        threadId: "public-room",
        title: "Sala pública"
      });
    })
    .catch((error) => {
      console.error("Erro ao restaurar sessão:", error);
    });
}

/* =====================================================
   PRESENÇA
===================================================== */
async function registerUserPresence() {
  if (!state.currentUser) return;

  const userRef = doc(db, "users", state.currentUser.id);

  await setDoc(
    userRef,
    {
      username: state.currentUser.username,
      role: state.currentUser.role,
      status: "online",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  const momRef = doc(db, "users", SUPPORT_USER.id);
  await setDoc(
    momRef,
    {
      username: SUPPORT_USER.username,
      role: SUPPORT_USER.role,
      status: "online",
      updatedAt: serverTimestamp()
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
   RENDER USUÁRIOS
===================================================== */
function renderUsers(users) {
  usersList.innerHTML = "";

  const onlineUsersCount = users.filter((u) => u.status === "online").length;
  onlineCount.textContent = onlineUsersCount;

  const filtered = users
    .filter((u) => u.id !== state.currentUser?.id)
    .filter((u) => u.id !== SUPPORT_USER.id);

  if (!filtered.length) {
    usersList.innerHTML = `
      <div class="empty-list">Nenhum outro usuário visível no momento.</div>
    `;
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
      openUserMenu(event.clientX, event.clientY, user);
    });

    usersList.appendChild(row);
  });
}

/* =====================================================
   CONVERSAS
===================================================== */
function createConversationTab({ type, threadId, title }) {
  const exists = [...conversationTabs.querySelectorAll(".tab")].find(
    (tab) => tab.dataset.threadId === threadId
  );

  if (exists) return;

  const btn = document.createElement("button");
  btn.className = "tab";
  btn.dataset.conversationType = type;
  btn.dataset.threadId = threadId;
  btn.textContent = title;

  btn.addEventListener("click", () => {
    switchConversation({ type, threadId, title });
  });

  conversationTabs.appendChild(btn);
}

function activateConversationTab(threadId) {
  [...conversationTabs.querySelectorAll(".tab")].forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.threadId === threadId);
  });
}

function switchConversation({ type, threadId, title }) {
  state.currentConversation = { type, threadId, title };
  conversationTitle.textContent = title;
  roomStatus.textContent =
    type === "publico" ? "Sala pública ativa" : `Chat privado com ${title}`;

  activateConversationTab(threadId);
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
function subscribeToMessages() {
  if (state.unsubscribeMessages) state.unsubscribeMessages();

  setEmptyMessagesState();

  const msgsRef = collection(
    db,
    state.currentConversation.type === "publico" ? "publicMessages" : "privateThreads",
    state.currentConversation.type === "publico" ? "public-room" : state.currentConversation.threadId,
    "messages"
  );

  const q = query(msgsRef, orderBy("createdAt", "asc"), limit(300));

  state.unsubscribeMessages = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      setEmptyMessagesState();
      return;
    }

    messagesContainer.innerHTML = "";

    snapshot.forEach((docItem) => {
      renderMessage(docItem.data());
    });

    scrollMessagesToBottom();
  });
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

  const docId = `${state.currentUser.id}__${user.id}`;

  try {
    await setDoc(doc(db, "friendships", docId), {
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

  const docId = `${state.currentUser.id}__${user.id}`;

  try {
    await deleteDoc(doc(db, "friendships", docId));
    alert(`${user.username} foi removido(a) dos amigos.`);
    closeAllMenus();
  } catch (error) {
    console.error("Erro ao remover amigo:", error);
    alert("Não foi possível remover dos amigos.");
  }
}

/* =====================================================
   MENUS DE AÇÃO
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
  const clickedInsideMenu =
    event.target.closest(".context-menu") ||
    event.target.closest(".user-row") ||
    event.target.closest(".friend-row") ||
    event.target.closest("#momCard");

  if (!clickedInsideMenu) {
    closeAllMenus();
  }
});

/* =====================================================
   TABS LATERAIS
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

/* =====================================================
   MOBILE
===================================================== */
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
   INÍCIO
===================================================== */
restoreSessionIfExists();
