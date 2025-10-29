/* =========================
   script.js for LinkSpace
   Adds: profile, remove-comment, hashing, trie, bfs, chat
   ========================= */

/* -----------------------
   HASH FUNCTION (simple)
   ----------------------- */
function generateHash(data) {
    // simple deterministic string hash -> non-cryptographic (for IDs)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = (hash << 5) - hash + data.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/* -----------------------
   Comment Queue (FIFO)
   ----------------------- */
class CommentQueue {
    constructor(maxSize = 100) { this._q = []; this.maxSize = maxSize; }
    enqueue(item) {
        // maintain FIFO and auto-drop oldest when full
        if (this._q.length >= this.maxSize) this.dequeue();
        this._q.push(item);
    }
    dequeue() { return this._q.length ? this._q.shift() : undefined; }
    removeAt(idx) { if (idx >= 0 && idx < this._q.length) this._q.splice(idx, 1); }
    toArray() { return this._q.slice(); }
    size() { return this._q.length; }
}

/* -----------------------
   POST CLASS
   ----------------------- */
class Post {
    constructor(url, author) {
        this.url = url;
        this.author = author;
        this.id = generateHash(url + Date.now());
        this.comments = new CommentQueue(3); // FIFO queue for comments
    }
    addComment(comment) { this.comments.enqueue(comment); }
    removeCommentAt(idx) { this.comments.removeAt(idx); }
}

/* -----------------------
   Stacks: posts + undo/redo
   ----------------------- */
let postStack = [];
let redoPostStack = [];

/* -----------------------
   Active profile
   ----------------------- */
let activeUser = "Parv";
const profileSelect = document.getElementById("profileSelect");
const activeProfileSpan = document.getElementById("activeProfile");

if (profileSelect) {
    profileSelect.value = activeUser;
    profileSelect.onchange = (e) => {
        activeUser = e.target.value;
        activeProfileSpan.textContent = `Active: ${activeUser}`;
    };
}

/* -----------------------
   DOM references
   ----------------------- */
const photoInput = document.getElementById("photoInput");
const postBtn = document.getElementById("postBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const feedContainer = document.getElementById("feedContainer");

/* -----------------------
   Post / Undo / Redo handlers
   ----------------------- */
postBtn.onclick = () => {
    const file = photoInput.files[0];
    if (!file) return alert("Choose an image to post.");
    const url = URL.createObjectURL(file);
    const newPost = new Post(url, activeUser);
    postStack.push(newPost);
    redoPostStack = [];
    renderFeed();
};

undoBtn.onclick = () => {
    if (postStack.length === 0) return;
    const last = postStack.pop();
    redoPostStack.push(last);
    renderFeed();
};

redoBtn.onclick = () => {
    if (redoPostStack.length === 0) return;
    const restored = redoPostStack.pop();
    postStack.push(restored);
    renderFeed();
};

/* -----------------------
   Render feed & comments
   ----------------------- */
function renderFeed() {
    feedContainer.innerHTML = "";
    // newest first: traverse stack from end downwards
    for (let i = postStack.length - 1; i >= 0; i--) {
        const post = postStack[i];

        const postCard = document.createElement("div");
        postCard.className = "bg-bg-card rounded-xl shadow-deep border border-border-subtle p-4 max-w-3xl mx-auto";

        // header (author + post id small)
        const header = document.createElement("div");
        header.className = "flex justify-between items-center mb-3";
        header.innerHTML = `<div class="font-semibold text-primary-purple">${post.author}</div>
                            <div class="text-xs text-text-muted">#${post.id}</div>`;

        // image
        const img = document.createElement("img");
        img.src = post.url;
        img.alt = "User Post";
        img.className = "w-full h-auto max-h-96 object-contain bg-slate-900 rounded-md border border-border-subtle";

        // comment area
        const commentArea = document.createElement("div");
        commentArea.className = "comment-area mt-3";
        commentArea.setAttribute("data-post-index", i);

        commentArea.innerHTML = `
            <div class="comment-list mb-2 max-h-36 overflow-y-auto border border-border-subtle rounded-md p-2 bg-bg-main"></div>
            <div class="flex space-x-2">
                <input type="text" id="commentInput-${i}" placeholder="Add a comment..." class="flex-grow p-2 bg-bg-main text-text-light border border-border-subtle rounded-lg">
                <button id="addCommentBtn-${i}" class="btn-primary px-3 text-sm font-semibold rounded-lg">Post</button>
            </div>
        `;

        postCard.appendChild(header);
        postCard.appendChild(img);
        postCard.appendChild(commentArea);
        feedContainer.appendChild(postCard);

        // event: add comment
        document.getElementById(`addCommentBtn-${i}`).onclick = () => {
            const commentInput = document.getElementById(`commentInput-${i}`);
            const comment = commentInput.value.trim();
            if (!comment) return;
            post.addComment(`${activeUser}: ${comment}`);
            commentInput.value = "";
            renderComments(i);
        };

        renderComments(i);
    }
}

function renderComments(postIndex) {
    const post = postStack[postIndex];
    const list = document.querySelector(`.comment-area[data-post-index="${postIndex}"] .comment-list`);
    list.innerHTML = "";

    const commentsArray = post.comments.toArray(); // FIFO order (oldest first)
    commentsArray.forEach((c, commentIndex) => {
        const commentDiv = document.createElement("div");
        commentDiv.className = "flex justify-between items-center bg-bg-main p-2 rounded-md mb-1";

        const text = document.createElement("p");
        text.className = "text-text-light text-sm";
        text.textContent = `💬 ${c}`;

        // Remove button (removes that comment from the queue)
        const removeBtn = document.createElement("button");
        removeBtn.className = "text-red-400 hover:text-red-600 text-xs ml-3";
        removeBtn.textContent = "Remove";
        removeBtn.onclick = () => {
            post.removeCommentAt(commentIndex);
            renderComments(postIndex);
        };

        commentDiv.appendChild(text);
        commentDiv.appendChild(removeBtn);
        list.appendChild(commentDiv);
    });
}

/* -----------------------
   TRIE: friend suggestions
   ----------------------- */
class TrieNode {
    constructor() { this.children = {}; this.isEndOfWord = false; }
}
class Trie {
    constructor() { this.root = new TrieNode(); }
    insert(word) {
        let node = this.root;
        for (const ch of word.toLowerCase()) {
            if (!node.children[ch]) node.children[ch] = new TrieNode();
            node = node.children[ch];
        }
        node.isEndOfWord = true;
    }
    findWordsWithPrefix(prefix) {
        let node = this.root;
        const results = [];
        const lower = prefix.toLowerCase();
        for (const ch of lower) {
            if (!node.children[ch]) return [];
            node = node.children[ch];
        }
        this._collect(node, lower, results);
        return results;
    }
    _collect(node, cur, results) {
        if (node.isEndOfWord) results.push(cur.charAt(0).toUpperCase() + cur.slice(1));
        for (const ch in node.children) this._collect(node.children[ch], cur + ch, results);
    }
}

const trie = new Trie();
const friendNames = ["Ali", "Sara", "Taher", "Zoya", "Milan", "Riya", "Krish", "Alex", "Tara", "Shubham", "Parv", "Megh"];
friendNames.forEach(n => trie.insert(n));

// Hash map for O(1) existence checks
const friendHash = {};
friendNames.forEach(n => friendHash[n.toLowerCase()] = true);

// friend search UI
const searchFriendInput = document.getElementById("searchFriend");
const searchBtn = document.getElementById("searchBtn");
const searchResult = document.getElementById("searchResult");

if (searchFriendInput) {
    searchFriendInput.oninput = () => {
        const prefix = searchFriendInput.value.trim();
        if (prefix.length === 0) { searchResult.textContent = ""; return; }
        const suggestions = trie.findWordsWithPrefix(prefix);
        if (suggestions.length) {
            searchResult.innerHTML = `<span class="text-green-400">✅ Found ${suggestions.length} suggestion(s):</span> <span class="text-text-light">${suggestions.join(', ')}</span>`;
        } else {
            searchResult.textContent = `❌ No friends found starting with "${prefix}"`;
        }
    };
}

if (searchBtn) {
    searchBtn.onclick = () => {
        const q = searchFriendInput.value.trim().toLowerCase();
        if (!q) return alert("Type a name to search.");
        if (friendHash[q]) alert(`${q.charAt(0).toUpperCase() + q.slice(1)} exists in friend list.`);
        else alert(`${q.charAt(0).toUpperCase() + q.slice(1)} not found.`);
    };
}

/* -----------------------
   GRAPH + BFS recommendations
   ----------------------- */
let graph = {
    "Taher": { "Parv": 1, "Ali": 1 },
    "Parv": { "Megh": 1, "Shubham": 1 },
    "Shubham": { "Taher": 1, "Megh": 1, "Parv": 1 },
    "Milan": { "Ali": 1, "Riya": 1 },
    "Riya": { "Milan": 1, "Krish": 1 },
    "Krish": { "Sara": 1, "Riya": 1, "Alex": 1 },
    "Alex": { "Krish": 1, "Tara": 1 },
    "Tara": { "Alex": 1 }
};

function bfsForRecommendations(startNode) {
    const queue = [startNode];
    const visited = { [startNode]: 0 };
    const recommendations = new Set();

    while (queue.length) {
        const cur = queue.shift();
        const dist = visited[cur];
        if (dist >= 2) continue;

        if (!graph[cur]) continue;
        for (const nb in graph[cur]) {
            if (!(nb in visited)) {
                visited[nb] = dist + 1;
                queue.push(nb);
                if (dist + 1 === 2) recommendations.add(nb);
            }
        }
    }

    const direct = Object.keys(graph[startNode] || {});
    return Array.from(recommendations).filter(u => u !== startNode && !direct.includes(u));
}

const recommendBtn = document.getElementById("recommendBtn");
const currentUserInput = document.getElementById("currentUserInput");
const recommendDisplay = document.getElementById("recommendDisplay");

if (recommendBtn) {
    recommendBtn.onclick = () => {
        const currentUser = currentUserInput.value.trim();
        if (!currentUser) { recommendDisplay.textContent = "Error: Please enter a user name."; return; }
        if (!graph[currentUser]) { recommendDisplay.textContent = `Error: User '${currentUser}' not found. Try: Parv, Taher, Krish.`; return; }

        const suggested = bfsForRecommendations(currentUser);
        if (suggested.length) {
            recommendDisplay.innerHTML = `Recommended Friends for <strong class="text-primary-purple">${currentUser}</strong>:\n${suggested.join(' 🤝 ')}`;
        } else {
            recommendDisplay.textContent = `No new recommendations for ${currentUser}.`;
        }
    };
}

/* -----------------------
   Chat simulation
   ----------------------- */
const chatBox = document.getElementById("chatBox");
const sendMsgBtn = document.getElementById("sendMsgBtn");
const chatInput = document.getElementById("chatInput");

function displayMessage(text, type) {
    const div = document.createElement("div");
    div.className = `message ${type}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function simulateReply(userMsg) {
    const replies = [
        "That’s interesting!",
        "Tell me more 😄",
        "Haha good one!",
        "I totally agree!",
        "Sounds cool!"
    ];
    setTimeout(() => {
        const r = replies[Math.floor(Math.random() * replies.length)];
        displayMessage(r, "bot");
    }, 800);
}

if (sendMsgBtn) {
    sendMsgBtn.onclick = () => {
        const msg = chatInput.value.trim();
        if (!msg) return;
        displayMessage(msg, "user");
        chatInput.value = "";
        simulateReply(msg);
    };
}

/* -----------------------
   Initialization: render empty feed
   ----------------------- */
renderFeed();
