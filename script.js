// A simple object to store both the post URL (Stack) and its comments (Queue)
class Post {
    constructor(url) {
        this.url = url;
        this.comments = []; // This acts as the Queue for comments on THIS post
    }
    addComment(comment) {
        this.comments.push(comment); // ENQUEUE
    }
}

// ---------- STACK: Posts + Undo/Redo ----------
let postStack = [];
let redoPostStack = [];

document.getElementById("postBtn").onclick = () => {
    const file = document.getElementById("photoInput").files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const newPost = new Post(url); 
        postStack.push(newPost);
        redoPostStack = []; 
        renderFeed();
    }
};

document.getElementById("undoBtn").onclick = () => {
    if (postStack.length > 0) {
        const last = postStack.pop();
        redoPostStack.push(last);
        renderFeed();
    }
};

document.getElementById("redoBtn").onclick = () => {
    if (redoPostStack.length > 0) {
        const restored = redoPostStack.pop();
        postStack.push(restored);
        renderFeed();
    }
};

function renderFeed() {
    const container = document.getElementById("feedContainer");
    container.innerHTML = "";
    
    // Iterate over the postStack (LIFO order for feed display)
    for (let i = postStack.length - 1; i >= 0; i--) {
        const post = postStack[i];
        
        // --- Tailwind Styled Post Container ---
        const postDiv = document.createElement("div");
        postDiv.classList.add("feed-post", "bg-bg-card", "rounded-xl", "shadow-deep", "overflow-hidden", "mx-auto", "max-w-xl");
        
        // Note: The Post button uses btn-primary class defined in the <style> block of index.html
        postDiv.innerHTML = `
            <img src="${post.url}" alt="User Post" class="w-full h-auto max-h-96 object-contain bg-slate-900 border-b border-border-subtle">
            <div class="comment-area p-4" data-post-index="${i}">
                <div class="comment-list mb-3 max-h-36 overflow-y-auto">
                    </div>
                <div class="flex space-x-2">
                    <input type="text" id="commentInput-${i}" placeholder="Add a comment..." class="flex-grow p-2 bg-bg-main text-text-light border border-border-subtle rounded-lg focus:ring-primary-purple focus:border-primary-purple">
                    <button id="addCommentBtn-${i}" class="btn-primary px-3 text-sm text-text-light font-semibold rounded-lg shadow-md transition duration-200">Post</button>
                </div>
            </div>
        `;
        
        container.appendChild(postDiv);
        
        document.getElementById(`addCommentBtn-${i}`).onclick = () => {
            const commentInput = document.getElementById(`commentInput-${i}`);
            const comment = commentInput.value;
            if (comment) {
                post.addComment(comment);
                commentInput.value = "";
                renderComments(i);
            }
        };

        renderComments(i);
    }
}

function renderComments(postIndex) {
    const post = postStack[postIndex];
    const list = document.querySelector(`.comment-area[data-post-index="${postIndex}"] .comment-list`);
    list.innerHTML = "";
    
    post.comments.forEach(c => {
        const p = document.createElement("p");
        p.classList.add("text-text-light", "text-sm", "py-1");
        p.textContent = `💬 ${c}`;
        list.appendChild(p);
    });
}

// ---------- TRIE: Friend Search (Advanced Prefix Search) ----------
class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        for (const char of word.toLowerCase()) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
    }

    findWordsWithPrefix(prefix) {
        let node = this.root;
        const results = [];
        const lowerPrefix = prefix.toLowerCase();

        for (const char of lowerPrefix) {
            if (!node.children[char]) return [];
            node = node.children[char];
        }

        this._collectWords(node, lowerPrefix, results);
        return results;
    }

    _collectWords(node, currentPrefix, results) {
        if (node.isEndOfWord) {
            results.push(currentPrefix.charAt(0).toUpperCase() + currentPrefix.slice(1)); 
        }

        for (const char in node.children) {
            this._collectWords(node.children[char], currentPrefix + char, results);
        }
    }
}

const trie = new Trie();
const friendNames = ["Ali", "Sara", "Taher", "Zoya", "Milan", "Riya", "Krish", "Alex", "Tara","Shubham","Parv","Megh"];
friendNames.forEach(f => trie.insert(f));

const searchFriendInput = document.getElementById("searchFriend");
const searchResult = document.getElementById("searchResult");


searchFriendInput.oninput = () => {
    const prefix = searchFriendInput.value.trim();
    const suggestions = trie.findWordsWithPrefix(prefix);
    
    if (prefix.length === 0) {
        searchResult.textContent = "";
        return;
    }

    if (suggestions.length > 0) {
        searchResult.innerHTML = `<span class="text-green-400">✅ Found ${suggestions.length} suggestion(s):</span> <span class="text-text-light">${suggestions.join(', ')}</span>`;
    } else {
        searchResult.textContent = `❌ No friends found starting with "${prefix}"`;
    }
};


// ---------- GRAPH: BFS Recommendations ONLY ----------
let graph = {
    "Taher": { "Parv": 1, "Ali": 1 },
    "Shubham": { "Taher": 1, "megh": 1, "parv": 1 },
    "Alice": { "Taher": 1, "Kalp": 1 },
    "Neel": { "Jay": 1 },
    "Milan": { "Ali": 1, "Riya": 1 },
    "Riya": { "Milan": 1, "Krish": 1 },
    "Krish": { "Sara": 1, "Riya": 1, "Alex": 1},
    "Alex": { "Krish": 1, "Tara": 1 },
    "Tara": { "Alex": 1 }
};

// BFS for Recommendations (People You May Know)
function bfsForRecommendations(startNode) {
    const queue = [startNode];
    const visited = { [startNode]: 0 };
    const recommendations = new Set();
    
    while (queue.length > 0) {
        const currentUser = queue.shift();
        const distance = visited[currentUser];

        if (distance >= 2) continue; 

        if (graph[currentUser]) {
            for (const neighbor in graph[currentUser]) {
                if (!(neighbor in visited)) {
                    visited[neighbor] = distance + 1;
                    queue.push(neighbor);
                    
                    if (distance + 1 === 2) {
                        recommendations.add(neighbor);
                    }
                }
            }
        }
    }
    
    const directFriends = Object.keys(graph[startNode] || {});
    const filteredRecommendations = Array.from(recommendations).filter(
        user => user !== startNode && !directFriends.includes(user)
    );

    return filteredRecommendations;
}

document.getElementById("recommendBtn").onclick = () => {
    const currentUser = document.getElementById("currentUserInput").value.trim();
    const recommendDisplay = document.getElementById("recommendDisplay");

    if (currentUser.length === 0) {
        recommendDisplay.textContent = "Error: Please enter a user name to start recommendations from.";
        return;
    }
    
    if (!graph[currentUser]) {
        recommendDisplay.textContent = `Error: User '${currentUser}' not found in the network. Try: Taher, Sara, Krish.`;
        return;
    }

    const suggestedFriends = bfsForRecommendations(currentUser);

    if (suggestedFriends.length > 0) {
        recommendDisplay.innerHTML = `<span class="text-primary-purple font-semibold">Recommended Friends for ${currentUser} (2 Degrees of Separation):</span>\n${suggestedFriends.join(' 🤝 ')}`;
    } else {
        recommendDisplay.textContent = `No new friends recommended for ${currentUser} at 2 degrees of separation.`;
    }
};

// ---------- CHAT SIMULATION ----------
let chatBox = document.getElementById("chatBox");

document.getElementById("sendMsgBtn").onclick = () => {
    const msg = document.getElementById("chatInput").value.trim();
    if (msg) {
        displayMessage(msg, "user");
        document.getElementById("chatInput").value = "";
        simulateReply(msg);
    }
};

function displayMessage(text, type) {
    const div = document.createElement("div");
    // Classes applied via custom <style> block
    div.classList.add("message", type);
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function simulateReply(userMsg) {
    const replies = [
        "That’s interesting!",
        "Tell me more 😄",
        "Haha good one!",
        "I totally agree with you!",
        "Sounds cool!"
    ];
    setTimeout(() => {
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        displayMessage(randomReply, "bot");
    }, 1000);

}
