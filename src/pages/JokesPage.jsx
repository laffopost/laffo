import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  collection, query, orderBy, limit, getDocs, doc, getDoc,
  setDoc, addDoc, updateDoc, serverTimestamp, where, increment,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { ShareIcon, ChatIcon, SendIcon, AddIcon, CloseIcon } from "../utils/icons";
import { useAuth } from "../context/AuthContext";
import { usePosts } from "../context/PostContext";
import useRequireAuth from "../hooks/useRequireAuth";
import AddPostModal from "../components/post/AddPostModal";
import "./JokesPage.css";

// ── Categories ────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "Any",         label: "🎲 Any" },
  { id: "Best",        label: "🏆 Best", local: true },
  { id: "Community",   label: "✍️ Community", local: true },
  { id: "Programming", label: "💻 Programming" },
  { id: "Pun",         label: "🥁 Puns" },
  { id: "Misc",        label: "🎭 Misc" },
  { id: "Dark",        label: "🖤 Dark", noSafe: true },
  { id: "Spooky",      label: "👻 Spooky" },
  { id: "Christmas",   label: "🎄 Christmas" },
];

const REACTIONS = ["😂", "😐", "🤮", "🔥", "❤️"];
const REACTIONS_KEY = "laffo_joke_reactions";

// ── Category-specific fallback pools ──────────────────────────────
const FALLBACKS = {
  Any: [
    { setup: "Why don't scientists trust atoms?", delivery: "Because they make up everything!" },
    { setup: "What do you call a fake noodle?", delivery: "An impasta." },
    { setup: "What did the ocean say to the beach?", delivery: "Nothing, it just waved." },
    { setup: "Why can't Elsa have a balloon?", delivery: "Because she'll let it go." },
    { setup: "What's brown and sticky?", delivery: "A stick." },
    { setup: "Why did the gym close down?", delivery: "It just didn't work out." },
    { setup: "What do you call a blind dinosaur?", delivery: "A do-you-think-he-saurus." },
    { setup: "Why was the math book sad?", delivery: "It had too many problems." },
    { setup: "What do you call a sleeping dinosaur?", delivery: "A dino-snore." },
    { setup: "Why did the scarecrow win an award?", delivery: "He was outstanding in his field." },
    { setup: "What do you call cheese that isn't yours?", delivery: "Nacho cheese." },
    { setup: "I told my doctor I broke my arm in two places.", delivery: "He told me to stop going to those places." },
  ],
  Programming: [
    { setup: "Why did the programmer quit his job?", delivery: "Because he didn't get arrays." },
    { setup: "Why do Java developers wear glasses?", delivery: "Because they don't C#." },
    { setup: "Why do programmers prefer dark mode?", delivery: "Because light attracts bugs." },
    { setup: "How many programmers does it take to change a light bulb?", delivery: "None, that's a hardware problem." },
    { setup: "What's a pirate's favorite programming language?", delivery: "R!" },
    { setup: "Why did the React developer go to therapy?", delivery: "Because of too many unresolved state issues." },
    { setup: "Why did the developer go broke?", delivery: "Because he used up all his cache." },
    { setup: "What's the object-oriented way to become wealthy?", delivery: "Inheritance." },
    { setup: "Why was the JavaScript developer sad?", delivery: "Because he didn't Node how to Express himself." },
    { setup: "What's a programmer's favorite hangout place?", delivery: "Foo Bar." },
    { setup: "Why did the SQL query go to therapy?", delivery: "It had too many inner joins." },
    { setup: "What did the array say after it was sorted?", delivery: "I'm finally in order!" },
  ],
  Pun: [
    { setup: "I used to hate facial hair...", delivery: "But then it grew on me." },
    { setup: "I'm reading a book about anti-gravity.", delivery: "It's impossible to put down." },
    { setup: "Why don't eggs tell jokes?", delivery: "They'd crack each other up." },
    { setup: "I used to play piano by ear...", delivery: "Now I use my hands." },
    { setup: "What do you call a parade of rabbits hopping backwards?", delivery: "A receding hare-line." },
    { setup: "I told my wife she was drawing her eyebrows too high.", delivery: "She looked surprised." },
    { setup: "Did you hear about the claustrophobic astronaut?", delivery: "He just needed a little space." },
    { setup: "I got a job at a bakery...", delivery: "Because I kneaded dough." },
    { setup: "What do you call a fish without eyes?", delivery: "A fsh." },
    { setup: "I'm on a seafood diet.", delivery: "I see food and I eat it." },
    { setup: "Why couldn't the bicycle stand up by itself?", delivery: "It was two-tired." },
    { setup: "I used to be a banker...", delivery: "But I lost interest." },
  ],
  Misc: [
    { setup: "What's a meme's favorite exercise?", delivery: "A viral workout." },
    { setup: "Why did the crypto investor go broke?", delivery: "He put all his eggs in one blockchain." },
    { setup: "Why did the Bitcoin go to therapy?", delivery: "It had too many emotional swings." },
    { setup: "Why did Ethereum go to school?", delivery: "To improve its smart contracts." },
    { setup: "What's a blockchain developer's favorite music?", delivery: "Heavy metal — it's immutable." },
    { setup: "Why did the NFT break up with the wallet?", delivery: "It needed more space in the metaverse." },
    { setup: "What do you call an alligator in a vest?", delivery: "An investigator." },
    { setup: "Why did the picture go to jail?", delivery: "Because it was framed." },
    { setup: "What do you call a bear with no teeth?", delivery: "A gummy bear." },
    { setup: "What do you call a dog that does magic tricks?", delivery: "A Labracadabrador." },
    { setup: "Why did the smartphone need glasses?", delivery: "It lost all its contacts." },
    { setup: "What do you call a factory that makes okay products?", delivery: "A satisfactory." },
  ],
  Dark: [
    { setup: "Why don't graveyards ever get crowded?", delivery: "Because people are dying to get in." },
    { setup: "What's the difference between a good joke and a bad joke timing?", delivery: "Timing." },
    { setup: "Why do we tell actors to break a leg?", delivery: "Because every play has a cast." },
    { setup: "I have a stepladder.", delivery: "I never knew my real ladder." },
    { setup: "They say laughter is the best medicine.", delivery: "Unless you have diarrhea." },
    { setup: "Why don't orphans play baseball?", delivery: "They don't know where home is." },
    { setup: "What's the last thing to go through a fly's head as it hits a windshield?", delivery: "Its butt." },
    { setup: "My grandfather said I rely too much on technology.", delivery: "I called him a hypocrite and unplugged his life support." },
    { setup: "I asked the librarian if they had books about paranoia.", delivery: "She whispered, 'They're right behind you!'" },
    { setup: "Why did the ghost go to the bar?", delivery: "For the boos." },
    { setup: "What do you call a cheap circumcision?", delivery: "A rip-off." },
    { setup: "My wife told me to stop acting like a flamingo.", delivery: "So I had to put my foot down." },
  ],
  Spooky: [
    { setup: "What do ghosts serve for dessert?", delivery: "I scream!" },
    { setup: "Why don't skeletons fight each other?", delivery: "They don't have the guts." },
    { setup: "What's a vampire's favorite fruit?", delivery: "A neck-tarine." },
    { setup: "Why did the skeleton go to the party alone?", delivery: "He had no body to go with." },
    { setup: "What do you call a witch at the beach?", delivery: "A sand-witch." },
    { setup: "Why don't mummies take time off?", delivery: "They're afraid to unwind." },
    { setup: "What kind of music do mummies love?", delivery: "Wrap music." },
    { setup: "What's a ghost's favorite room?", delivery: "The living room." },
    { setup: "What do you get when you cross a vampire with a snowman?", delivery: "Frostbite." },
    { setup: "Why was the zombie such a good employee?", delivery: "He was a dead-icated worker." },
    { setup: "What do Italian ghosts eat?", delivery: "Spookghetti." },
    { setup: "How do monsters tell their future?", delivery: "They read their horror-scope." },
  ],
  Christmas: [
    { setup: "What do you call an obnoxious reindeer?", delivery: "Rude-olph." },
    { setup: "Why is Christmas just like a day at the office?", delivery: "You do all the work and the fat guy in the suit gets all the credit." },
    { setup: "What do snowmen eat for breakfast?", delivery: "Frosted Flakes." },
    { setup: "Why was the snowman looking through the carrots?", delivery: "He was picking his nose." },
    { setup: "What do you call a broke Santa?", delivery: "Saint Nickel-less." },
    { setup: "What did the gingerbread man put on his bed?", delivery: "A cookie sheet." },
    { setup: "Why does Santa go through chimneys?", delivery: "Because it soots him." },
    { setup: "What's every parent's favorite Christmas carol?", delivery: "Silent Night." },
    { setup: "What do elves learn in school?", delivery: "The elf-abet." },
    { setup: "Why did the Christmas tree go to the barber?", delivery: "It needed to be trimmed." },
    { setup: "What do you call Santa's helpers?", delivery: "Subordinate clauses." },
    { setup: "What falls but never gets hurt?", delivery: "Snow." },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getFallbackBatch(cat, count = 8) {
  const pool = FALLBACKS[cat] || FALLBACKS.Any;
  return shuffle(pool).slice(0, count).map((j, i) => ({
    ...j, id: `fb-${cat}-${Date.now()}-${i}`,
  }));
}

function getReactionsStore() {
  try { return JSON.parse(localStorage.getItem(REACTIONS_KEY) || "{}"); } catch { return {}; }
}
function saveReactionsStore(store) {
  localStorage.setItem(REACTIONS_KEY, JSON.stringify(store));
}

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

// ── Random joke hero ──────────────────────────────────────────────
function RandomJokeHero({ onShareAsPost, onVote }) {
  const [joke, setJoke] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Reactions
  const store = getReactionsStore();
  const jkey = joke ? joke.setup.slice(0, 40) : "";
  const myReaction = jkey ? (store[jkey]?.my || null) : null;
  const counts = jkey ? (store[jkey]?.counts || {}) : {};

  const handleReaction = (emoji) => {
    if (!joke) return;
    const s = getReactionsStore();
    const entry = s[jkey] || { counts: {}, my: null };
    if (entry.my && entry.my !== emoji) {
      entry.counts[entry.my] = Math.max(0, (entry.counts[entry.my] || 0) - 1);
    }
    if (entry.my === emoji) {
      entry.counts[emoji] = Math.max(0, (entry.counts[emoji] || 0) - 1);
      entry.my = null;
    } else {
      entry.counts[emoji] = (entry.counts[emoji] || 0) + 1;
      entry.my = emoji;
    }
    s[jkey] = entry;
    saveReactionsStore(s);
    if (entry.my) onVote?.(joke, emoji);
    setRevealed((v) => v); // force re-render
  };

  const getRandomJoke = useCallback(async () => {
    setSpinning(true);
    setRevealed(false);

    let fetched = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        "https://v3.jokeapi.dev/joke/Any?safe-mode&type=twopart",
        { signal: controller.signal },
      );
      clearTimeout(timer);
      const data = await res.json();
      if (data.setup && data.delivery) {
        fetched = { setup: data.setup, delivery: data.delivery };
      }
    } catch { /* fallback */ }

    if (!fetched) {
      const pool = Object.values(FALLBACKS).flat();
      fetched = pool[Math.floor(Math.random() * pool.length)];
    }

    setTimeout(() => {
      setJoke({ ...fetched, id: `rand-${Date.now()}` });
      setSpinning(false);
    }, 600);
  }, []);

  return (
    <div className="random-hero">
      <button
        className={`random-hero-btn${spinning ? " spinning" : ""}`}
        onClick={getRandomJoke}
        disabled={spinning}
      >
        <span className="random-hero-dice">{spinning ? "🎰" : "🎲"}</span>
        <span>{spinning ? "Rolling..." : "Give me a random joke!"}</span>
      </button>

      {/* Reserve fixed height so content below doesn't shift */}
      <div className={`random-hero-slot${joke ? " has-joke" : ""}`}>
        {joke && (
          <div className="random-hero-result" key={joke.id}>
            <p className="random-hero-setup">{joke.setup}</p>
            {revealed ? (
              <>
                <p className="random-hero-delivery">{joke.delivery}</p>
                <div className="random-hero-actions">
                  <div className="jokes-card-reactions">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        className={`jokes-reaction-btn${myReaction === emoji ? " active" : ""}`}
                        onClick={() => handleReaction(emoji)}
                      >
                        {emoji}
                        {(counts[emoji] || 0) > 0 && (
                          <span className="jokes-reaction-count">{counts[emoji]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div style={{ position: "relative" }}>
                    <button
                      className="jokes-card-share"
                      onClick={() => setShowShare((v) => !v)}
                      title="Share"
                    >
                      <ShareIcon size={15} />
                    </button>
                    {showShare && (
                      <JokeShareMenu
                        joke={joke}
                        onPostShare={onShareAsPost}
                        onClose={() => setShowShare(false)}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <button className="random-hero-reveal" onClick={() => setRevealed(true)}>
                👀 Reveal punchline
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Submit joke modal ─────────────────────────────────────────────
function SubmitJokeModal({ onClose, onSubmitted }) {
  const { firebaseUser, userProfile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [setup, setSetup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!setup.trim() || !delivery.trim()) {
      toast.error("Both fields are required");
      return;
    }
    if (!requireAuth("submit a joke")) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "jokes"), {
        setup: setup.trim(),
        delivery: delivery.trim(),
        authorUid: firebaseUser.uid,
        authorName: userProfile?.username || firebaseUser.displayName || "Anonymous",
        authorAvatar: userProfile?.avatar || null,
        upvotes: 0,
        downvotes: 0,
        score: 0,
        createdAt: serverTimestamp(),
      });
      toast.success("Joke submitted! 🎉");
      onSubmitted?.();
      onClose();
    } catch {
      toast.error("Failed to submit joke");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="submit-joke-overlay" onClick={onClose}>
      <div className="submit-joke-modal" onClick={(e) => e.stopPropagation()}>
        <div className="submit-joke-header">
          <h3>✍️ Submit a Joke</h3>
          <button className="submit-joke-close" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="submit-joke-label">Setup (the question)</label>
          <input
            className="submit-joke-input"
            placeholder="Why did the chicken cross the road?"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            maxLength={200}
            autoFocus
          />
          <label className="submit-joke-label">Punchline (the answer)</label>
          <input
            className="submit-joke-input"
            placeholder="To get to the other side!"
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            maxLength={300}
          />
          <button className="submit-joke-btn" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Joke 🚀"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ── Share popover ─────────────────────────────────────────────────
function JokeShareMenu({ joke, onPostShare, onClose }) {
  const { firebaseUser, userProfile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [dmMode, setDmMode] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [dmResults, setDmResults] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!dmMode || !firebaseUser?.uid) return;
    (async () => {
      try {
        const q = query(
          collection(db, "conversations"),
          where("participants", "array-contains", firebaseUser.uid),
          orderBy("lastMessageAt", "desc"),
          limit(6),
        );
        const snap = await getDocs(q);
        const contacts = snap.docs.map((d) => {
          const data = d.data();
          const otherId = data.participants?.find((p) => p !== firebaseUser.uid);
          if (!otherId) return null;
          return {
            uid: otherId,
            username: data.participantNames?.[otherId] || "User",
            avatar: data.participantAvatars?.[otherId] || null,
          };
        }).filter(Boolean);
        setRecentContacts(contacts);
      } catch { /* ignore */ }
    })();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [dmMode, firebaseUser?.uid]);

  useEffect(() => {
    if (!dmSearch.trim()) { setDmResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("username", ">=", dmSearch.trim()),
          where("username", "<=", dmSearch.trim() + "\uf8ff"),
          orderBy("username"),
          limit(6),
        );
        const snap = await getDocs(q);
        setDmResults(
          snap.docs
            .map((d) => ({ uid: d.id, ...d.data() }))
            .filter((u) => u.uid !== firebaseUser?.uid),
        );
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [dmSearch, firebaseUser?.uid]);

  const sendViaDM = async (recipient) => {
    if (!firebaseUser || sending) return;
    setSending(true);
    try {
      const myName = userProfile?.username || firebaseUser.displayName || "User";
      const convoId = getConversationId(firebaseUser.uid, recipient.uid);
      const convoRef = doc(db, "conversations", convoId);
      const text = `😂 ${joke.setup}\n${joke.delivery}`;
      const existing = await getDoc(convoRef);
      if (!existing.exists()) {
        await setDoc(convoRef, {
          participants: [firebaseUser.uid, recipient.uid],
          participantNames: { [firebaseUser.uid]: myName, [recipient.uid]: recipient.username || "User" },
          participantAvatars: { [firebaseUser.uid]: userProfile?.avatar || null, [recipient.uid]: recipient.avatar || null },
          lastMessage: text.slice(0, 50),
          lastMessageAt: serverTimestamp(),
          lastSenderId: firebaseUser.uid,
          [`read_${firebaseUser.uid}`]: true,
          [`read_${recipient.uid}`]: false,
          createdAt: serverTimestamp(),
        });
      }
      await addDoc(collection(db, "conversations", convoId, "messages"), {
        text, senderId: firebaseUser.uid, senderName: myName, timestamp: serverTimestamp(),
      });
      await updateDoc(convoRef, {
        lastMessage: text.slice(0, 50),
        lastMessageAt: serverTimestamp(),
        lastSenderId: firebaseUser.uid,
        [`read_${firebaseUser.uid}`]: true,
        [`read_${recipient.uid}`]: false,
      });
      toast.success(`Sent to @${recipient.username}`);
      onClose();
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const contactList = dmSearch.trim() ? dmResults : recentContacts;

  return (
    <div className="joke-share-menu" ref={menuRef}>
      {dmMode ? (
        <>
          <button className="joke-share-back" onClick={() => { setDmMode(false); setDmSearch(""); }}>
            ← Back
          </button>
          <input
            ref={inputRef}
            className="joke-share-dm-input"
            placeholder="Search username..."
            value={dmSearch}
            onChange={(e) => setDmSearch(e.target.value)}
          />
          {!dmSearch.trim() && recentContacts.length > 0 && (
            <span className="joke-share-dm-label">Recent</span>
          )}
          {contactList.length === 0 && dmSearch.trim() && (
            <span className="joke-share-dm-label">No users found</span>
          )}
          {contactList.map((u) => (
            <button
              key={u.uid}
              className="joke-share-dm-row"
              onClick={() => sendViaDM(u)}
              disabled={sending}
            >
              {u.avatar
                ? <img src={u.avatar} alt="" className="joke-share-dm-avatar" />
                : <span className="joke-share-dm-avatar joke-share-dm-avatar--placeholder">{u.username?.[0]?.toUpperCase()}</span>
              }
              <span>@{u.username}</span>
              <SendIcon size={13} style={{ marginLeft: "auto", opacity: 0.5 }} />
            </button>
          ))}
        </>
      ) : (
        <>
          <button className="joke-share-option" onClick={() => { onPostShare(joke); onClose(); }}>
            <ShareIcon size={14} />
            <span>Share as Post</span>
          </button>
          {firebaseUser && !firebaseUser.isAnonymous && (
            <button
              className="joke-share-option"
              onClick={() => {
                if (!requireAuth("send DMs")) return;
                setDmMode(true);
              }}
            >
              <ChatIcon size={14} />
              <span>Send via DM</span>
            </button>
          )}
          <button
            className="joke-share-option"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${joke.setup}\n${joke.delivery}`);
                toast.success("Copied!");
              } catch { toast.error("Failed to copy"); }
              onClose();
            }}
          >
            <span style={{ fontSize: "14px" }}>📋</span>
            <span>Copy text</span>
          </button>
        </>
      )}
    </div>
  );
}

// ── JokeCard ──────────────────────────────────────────────────────
function JokeCard({ joke, index, onShareAsPost, onVote, communityMode }) {
  const [revealed, setRevealed] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [localScore, setLocalScore] = useState(joke.score || 0);

  // Reactions from localStorage
  const store = getReactionsStore();
  const jkey = joke.setup.slice(0, 40);
  const myReaction = store[jkey]?.my || null;
  const counts = store[jkey]?.counts || {};

  const handleReaction = (emoji) => {
    const s = getReactionsStore();
    const entry = s[jkey] || { counts: {}, my: null };
    if (entry.my && entry.my !== emoji) {
      entry.counts[entry.my] = Math.max(0, (entry.counts[entry.my] || 0) - 1);
    }
    if (entry.my === emoji) {
      entry.counts[emoji] = Math.max(0, (entry.counts[emoji] || 0) - 1);
      entry.my = null;
    } else {
      entry.counts[emoji] = (entry.counts[emoji] || 0) + 1;
      entry.my = emoji;
    }
    s[jkey] = entry;
    saveReactionsStore(s);
    if (entry.my) onVote?.(joke, emoji);
    setRevealed((v) => v); // force re-render
  };

  // Community vote (up/down stored in Firestore)
  const voted = store[`vote_${joke.id}`] || null;
  const handleCommunityVote = async (dir) => {
    if (!joke.id) return;
    const s = getReactionsStore();
    const prev = s[`vote_${joke.id}`] || null;
    if (prev === dir) return; // already voted this direction

    const delta = dir === "up" ? 1 : -1;
    const undo = prev ? (prev === "up" ? -1 : 1) : 0;

    s[`vote_${joke.id}`] = dir;
    saveReactionsStore(s);
    setLocalScore((v) => v + delta + undo);

    try {
      await updateDoc(doc(db, "jokes", joke.id), {
        score: increment(delta + undo),
        ...(dir === "up" ? { upvotes: increment(1) } : { downvotes: increment(1) }),
      });
    } catch { /* non-critical */ }
  };

  return (
    <div className={`jokes-card${communityMode ? " jokes-card--community" : ""}`}>
      {communityMode ? (
        <div className="jokes-vote-col">
          <button
            className={`jokes-vote-btn up${voted === "up" ? " active" : ""}`}
            onClick={() => handleCommunityVote("up")}
            title="Upvote"
          >▲</button>
          <span className="jokes-vote-score">{localScore}</span>
          <button
            className={`jokes-vote-btn down${voted === "down" ? " active" : ""}`}
            onClick={() => handleCommunityVote("down")}
            title="Downvote"
          >▼</button>
        </div>
      ) : (
        <div className="jokes-card-num">#{index + 1}</div>
      )}
      <div className="jokes-card-body">
        {communityMode && joke.authorName && (
          <span className="jokes-card-author">@{joke.authorName}</span>
        )}
        <p className="jokes-card-setup">{joke.setup}</p>
        {revealed ? (
          <>
            <p className="jokes-card-delivery">{joke.delivery}</p>
            <div className="jokes-card-reactions">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className={`jokes-reaction-btn${myReaction === emoji ? " active" : ""}`}
                  onClick={() => handleReaction(emoji)}
                  title={`React ${emoji}`}
                >
                  {emoji}
                  {(counts[emoji] || 0) > 0 && (
                    <span className="jokes-reaction-count">{counts[emoji]}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <button className="jokes-card-reveal" onClick={() => setRevealed(true)}>
            Reveal punchline 👀
          </button>
        )}
      </div>
      <div className="jokes-card-actions">
        <div style={{ position: "relative" }}>
          <button
            className="jokes-card-share"
            onClick={() => setShowShare((v) => !v)}
            title="Share"
          >
            <ShareIcon size={15} />
          </button>
          {showShare && (
            <JokeShareMenu
              joke={joke}
              onPostShare={onShareAsPost}
              onClose={() => setShowShare(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function JokesPage() {
  const { addPost } = usePosts();
  const { firebaseUser } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [category, setCategory] = useState("Any");
  const [jokes, setJokes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareJoke, setShareJoke] = useState(null);
  const [showSubmit, setShowSubmit] = useState(false);

  // Load jokes from API / Firestore / fallback
  const loadJokes = useCallback(async (cat, append = false) => {
    setLoading(true);
    const catDef = CATEGORIES.find((c) => c.id === cat);

    // "Best" — top voted from jokeVotes
    if (cat === "Best") {
      try {
        const q = query(collection(db, "jokeVotes"), orderBy("score", "desc"), limit(16));
        const snap = await getDocs(q);
        const best = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (best.length > 0) { setJokes(best); setLoading(false); return; }
      } catch { /* fallback */ }
      setJokes([{ id: "best-empty", setup: "No votes yet!", delivery: "React to jokes in other categories to vote them into the Best list." }]);
      setLoading(false);
      return;
    }

    // "Community" — user-submitted jokes
    if (cat === "Community") {
      try {
        const q = query(collection(db, "jokes"), orderBy("score", "desc"), limit(append ? 30 : 16));
        const snap = await getDocs(q);
        const community = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setJokes((prev) => append ? [...prev, ...community] : community);
        setLoading(false);
        return;
      } catch { /* fallback */ }
      setJokes([]);
      setLoading(false);
      return;
    }

    // API categories
    const safeFlag = catDef?.noSafe ? "" : "&safe-mode";
    let fetched = [];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://v3.jokeapi.dev/joke/${cat}?type=twopart${safeFlag}&amount=8`,
        { signal: controller.signal },
      );
      clearTimeout(timer);
      const data = await res.json();
      const raw = data.jokes || (data.setup ? [data] : []);
      fetched = raw
        .filter((j) => j.setup && j.delivery)
        .map((j, i) => ({ id: `${cat}-${Date.now()}-${i}`, setup: j.setup, delivery: j.delivery }));
    } catch { /* fallbacks below */ }

    const list = fetched.length > 0 ? fetched : getFallbackBatch(cat, 8);
    setJokes((prev) => append ? [...prev, ...list] : list);
    setLoading(false);
  }, []);

  useEffect(() => { loadJokes("Any", false); }, [loadJokes]);

  const handleCategoryChange = (cat) => {
    if (cat === category) return;
    setCategory(cat);
    setJokes([]);
    loadJokes(cat, false);
  };

  // Vote a joke into "Best"
  const handleVote = useCallback(async (joke, emoji) => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    const jokeId = btoa(joke.setup.slice(0, 60)).replace(/[^a-zA-Z0-9]/g, "");
    try {
      const ref = doc(db, "jokeVotes", jokeId);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        const data = existing.data();
        await updateDoc(ref, {
          score: (data.score || 0) + 1,
          [`reactions.${emoji}`]: ((data.reactions?.[emoji]) || 0) + 1,
        });
      } else {
        await setDoc(ref, {
          setup: joke.setup,
          delivery: joke.delivery,
          score: 1,
          reactions: { [emoji]: 1 },
          createdAt: serverTimestamp(),
        });
      }
    } catch { /* non-critical */ }
  }, [firebaseUser]);

  // Share as post
  const handlePostSubmit = async (postData) => {
    setShareJoke(null);
    const toastId = toast.loading("Posting joke...");
    try {
      await addPost(postData);
      toast.success("Joke shared as post! 🎉", { id: toastId });
    } catch {
      toast.error("Failed to create post", { id: toastId });
    }
  };

  const isCommunity = category === "Community";

  return (
    <div className="jokes-page">
      <div className="jokes-header">
        <h1 className="jokes-title">😂 Joke Book</h1>
        <p className="jokes-subtitle">Because every meme needs a punchline.</p>
      </div>

      {/* Random joke + Submit row */}
      <div className="jokes-top-row">
        <RandomJokeHero
          onShareAsPost={(j) => setShareJoke(j)}
          onVote={handleVote}
        />
        <button
          className="jokes-submit-btn"
          onClick={() => {
            if (!requireAuth("submit a joke")) return;
            setShowSubmit(true);
          }}
        >
          <AddIcon size={16} /> Submit your joke
        </button>
      </div>

      <div className="jokes-categories">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`jokes-cat-btn${category === c.id ? " active" : ""}${c.id === "Best" ? " best" : ""}${c.id === "Community" ? " community" : ""}`}
            onClick={() => handleCategoryChange(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="jokes-grid">
        {jokes.map((joke, i) => (
          <JokeCard
            key={joke.id}
            joke={joke}
            index={i}
            onShareAsPost={(j) => setShareJoke(j)}
            onVote={handleVote}
            communityMode={isCommunity}
          />
        ))}

        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={`skel-${i}`} className="jokes-card jokes-card--skeleton">
            <div className="jokes-skel" />
            <div className="jokes-skel jokes-skel--short" />
          </div>
        ))}
      </div>

      {!loading && jokes.length === 0 && isCommunity && (
        <div className="jokes-empty">
          <p>No jokes submitted yet. Be the first! 🎤</p>
        </div>
      )}

      {!loading && jokes.length > 0 && (
        <button className="jokes-load-more" onClick={() => loadJokes(category, true)}>
          Load more jokes 🎲
        </button>
      )}

      {showSubmit && (
        <SubmitJokeModal
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => loadJokes("Community", false)}
        />
      )}

      {shareJoke && createPortal(
        <AddPostModal
          onClose={() => setShareJoke(null)}
          onSubmit={handlePostSubmit}
          shareType="status"
          shareInitialData={{
            status: `${shareJoke.setup}\n\n${shareJoke.delivery}`,
            bgColor: "#1a1a2e",
            textColor: "#a78bfa",
          }}
        />,
        document.body,
      )}
    </div>
  );
}
