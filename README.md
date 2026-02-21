# 🐒 OldMonkey: Real-Time Multiplayer Typing Arena

OldMonkey is a high-performance, competitive typing platform built for speed and precision. Utilizing **FastAPI**, **WebSockets**, and **Redis**, it delivers a seamless race experience where every millisecond counts. Challenge friends or test your mettle against an adaptive AI.

---

## ✨ Features

- **Real-Time Multiplayer:** Instant synchronization between players via WebSockets.
- **OldMonkey Bot:** An adaptive AI bot that adjusts its typing speed based on your personal high score to keep you challenged.
- **Synchronized Starts:** A "GO!" countdown system that ensures all players start exactly at the same time.
- **Live Ghost Cursor:** See your opponent’s progress character-by-character as they type.
- **Dynamic Stats:** Real-time calculation of **WPM** (Words Per Minute) and **Accuracy**.
- **Persistence:** Comprehensive game history and rating system stored in MongoDB.
- **State Management:** Redis-backed game state to ensure reliability even during high-concurrency races.

---

## 🛠️ Tech Stack

### Backend

- **FastAPI:** Modern, high-performance web framework for the Python API.
- **WebSockets:** For full-duplex communication between server and clients.
- **Redis:** Fast in-memory data store for live game state and timer synchronization.
- **MongoDB:** NoSQL database for user profiles, ratings, and game history.

### Frontend

- **Vanilla JavaScript (ES6+):** Lightweight and fast client-side logic.
- **CSS3:** Responsive and modern UI design with custom animations.

---

## 🚀 Installation & Setup

### 1️⃣ Prerequisites

- Python 3.9+
- MongoDB Instance
- Redis Server

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/oldmonkey.git
cd oldmonkey
```

### 3️⃣ Setup Backend

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 4️⃣ Environment Configuration

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key
GOOGLE_CLIENT_ID=your_google_id.apps.googleusercontent.com
```

### 5️⃣ Run the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 10000 --reload
```

---

## 📡 System Architecture

### 🏠 Lobby

Players join a room. The `ConnectionManager` tracks active WebSockets.

### ✅ Ready Sync

When both players click **"Ready,"** the server fetches a random paragraph and initializes the state in Redis.

### 🏁 The Race

- The server broadcasts `TIMER_UPDATE` every second.
- Clients send progress messages which are broadcast to opponents to update the **Ghost Cursor**.

### 🏆 Finalization

When a player finishes or time expires:

- The server calculates final stats.
- Updates user ratings.
- Saves a `GameRecord` to MongoDB.

---

## 🎮 How to Play

1. **Sign In:** Use Google OAuth or create a manual account.
2. **Room Creation:** Generate a private room link from the Dashboard.
3. **The Countdown:** Once you and your opponent are ready, look for the **GO!** signal.
4. **Race:** Type as fast as you can! Your progress is tracked by the bar at the top.
5. **Rematch:** Want a second chance? Hit the **Rematch** button to instantly reset the arena.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
