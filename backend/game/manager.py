import json
import asyncio
from fastapi import WebSocket
from backend.game.paragraphs import get_random_paragraph
from backend.core.db import users_col
from backend.game.engine import spawn_bot
from backend.core.redis_client import redis_client
from typing import Dict, Set
from bson import ObjectId
import random

class ConnectionManager:
    def __init__(self):
        self.active_rooms: dict[str, dict[str, WebSocket]] = {}
        self.ready_players: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = {}
            self.ready_players[room_id] = set()
        self.active_rooms[room_id][user_id] = websocket

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_rooms:
            self.active_rooms[room_id].pop(user_id, None)
            if user_id in self.ready_players.get(room_id, set()):
                self.ready_players[room_id].remove(user_id)
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]
                if room_id in self.ready_players:
                    del self.ready_players[room_id]

    async def set_ready(self, room_id: str, user_id: str):
        if room_id in self.ready_players:
            self.ready_players[room_id].add(user_id)
            num_ready = len(self.ready_players[room_id])
            is_bot_game = "bot" in room_id

            if num_ready >= 2 or (num_ready >= 1 and is_bot_game):
                self.ready_players[room_id] = set()
                paragraph = get_random_paragraph()
                
                

                await redis_client.delete(f"state:{room_id}")

                
                # --- BUILD USER MAP WITH OBJECTID ---
                user_map = {}
                player_ids = list(self.active_rooms.get(room_id, {}).keys())

                # --- BOT SPEED CALCULATION ---
                bot_wpm = 40  # Default base speed
                
                for p_id in player_ids:
                    try:
                        user_doc = await users_col.find_one({"_id": ObjectId(p_id)})
                        if user_doc:
                            user_name = user_doc.get("username") or user_doc.get("name") or "Guest"
                            user_map[p_id] = user_name
                            
                            # If it's a bot game, use this user's high score to set the bot's speed
                            if is_bot_game:
                                user_high_speed = user_doc.get("highest_speed", 0)
                                if user_high_speed >= 40:
                                    # Randomly choose between +5 and +10 of their best
                                    bot_wpm = user_high_speed + random.randint(5, 10)
                                else:
                                    bot_wpm = 40
                        else:
                            user_map[p_id] = "Guest"
                    except Exception as e:
                        print(f"Error fetching user data: {e}")
                        user_map[p_id] = "Guest"
                
                if is_bot_game:
                    user_map["bot_user"] = "Monkey 🐒"
                # ------------------------------
                
                # for p_id in player_ids:
                #     try:
                #         # Convert the string ID from WebSocket/Redis back to a MongoDB ObjectId
                #         user_doc = await users_col.find_one({"_id": ObjectId(p_id)})
                        
                #         if user_doc:
                #             # Use "username" or fallback to "name" or "Guest"
                #             user_map[p_id] = user_doc.get("username") or user_doc.get("name") or "Guest"
                #         else:
                #             user_map[p_id] = "Guest"
                #     except Exception as e:
                #         print(f"Error fetching username for {p_id}: {e}")
                #         user_map[p_id] = "Guest"
                
                # if is_bot_game:
                #     user_map["bot_user"] = "Monkey 🐒"
                # # --------------------------------------------

                game_state = {
                    "active": True,
                    "winner": None,
                    "timer": 60,
                    "paragraph_len": len(paragraph),
                    "players": {}
                }
                await redis_client.setex(f"state:{room_id}", 3600, json.dumps(game_state))

                await self.broadcast_to_room(room_id, {
                    "type": "START_GAME",
                    "paragraph": paragraph,
                    "user_map": user_map,
                    "bot_speed": bot_wpm if is_bot_game else None
                })

                # START SERVER TIMER
                asyncio.create_task(self.run_game_timer(room_id))

                if is_bot_game:
                    asyncio.create_task(spawn_bot(self, room_id, bot_wpm, paragraph))
            else:
                await self.broadcast_to_room(room_id, {
                    "type": "PLAYER_READY",
                    "user_id": user_id
                })

    async def run_game_timer(self, room_id: str):
        while True:
            await asyncio.sleep(1)
            raw_state = await redis_client.get(f"state:{room_id}")
            if not raw_state: 
                break
            
            state = json.loads(raw_state)
            # If the game was won by someone else, state["active"] will be False
            if not state["active"]: 
                break
            
            

            if state["timer"] <= 0:
                # Logic: Who typed more characters?
                players = state.get("players", {})
                winner_id = None
                max_progress = -1

                for p_id, p_stats in players.items():
                    
                    current_progress = p_stats.get("charIndex", 0)
                    if current_progress > max_progress:
                        max_progress = current_progress
                        winner_id = p_id
                    elif current_progress == max_progress:
                        winner_id = None # It's a tie

                await self.end_game(room_id, "TIME_UP", winner_id, players)
                break

            state["timer"] -= 1
            # Save updated time back to Redis
            await redis_client.setex(f"state:{room_id}", 3600, json.dumps(state))

            await self.broadcast_to_room(room_id, {
                "type": "TIMER_UPDATE",
                "time": state["timer"]
            })

        

# Add a storage for final stats in the class or Redis
    async def update_progress(self, room_id: str, user_id: str, char_index: int, wpm: int, accuracy: int):
        raw_state = await redis_client.get(f"state:{room_id}")
        if not raw_state: return
        
        state = json.loads(raw_state)
        if not state["active"]: return

        
        
        if "players" not in state: state["players"] = {}
        state["players"][user_id] = {
            "wpm": int(wpm), 
            "accuracy": accuracy, 
            "charIndex": char_index 
        }
        await redis_client.setex(f"state:{room_id}", 3600, json.dumps(state))

        if char_index >= state["paragraph_len"] and state["winner"] is None:
            state["winner"] = user_id
            state["active"] = False
            await redis_client.setex(f"state:{room_id}", 3600, json.dumps(state))
            await self.end_game(room_id, "FINISHED", user_id, state["players"])

    # async def end_game(self, room_id: str, reason: str, winner_id: str = None, final_stats: dict = None):
    #     raw_state = await redis_client.get(f"state:{room_id}")
    #     if raw_state:
    #         state = json.loads(raw_state)
    #         state["active"] = False
    #         await redis_client.setex(f"state:{room_id}", 3600, json.dumps(state))
        
    #     await self.broadcast_to_room(room_id, {
    #         "type": "GAME_OVER",
    #         "winner_id": winner_id,
    #         "reason": reason,
    #         "final_stats": final_stats
    #     })

    async def end_game(self, room_id: str, reason: str, winner_id: str = None, final_stats: dict = None):
        raw_state = await redis_client.get(f"state:{room_id}")
        if not raw_state: return
        
        state = json.loads(raw_state)
        state["active"] = False
        await redis_client.setex(f"state:{room_id}", 3600, json.dumps(state))

        # ---  UPDATE DATABASE ---
        if final_stats:
            is_bot_game = "bot" in room_id
            
            for p_id, stats in final_stats.items():
                if p_id == "bot_user":
                    continue
                
                try:
                    # 1. Update Highest Speed (Always happens, even vs Bot)
                    current_wpm = int(stats.get("wpm", 0))
                    # await users_col.update_one(
                    #     {"_id": ObjectId(p_id), "highest_speed": {"$lt": current_wpm}},
                    #     {"$set": {"highest_speed": current_wpm}}
                    # )
                    await users_col.update_one(
                        {"_id": ObjectId(p_id)},
                        {"$max": {"highest_speed": current_wpm}}
                    )

                    # 2. Update Rating (Only if NOT a bot game)
                    if not is_bot_game and winner_id:
                        # If there is a winner and it's not a tie (None)
                        change = 5 if p_id == winner_id else -5
                        await users_col.update_one(
                            {"_id": ObjectId(p_id)},
                            {"$inc": {"rating": change}}
                        )
                except Exception as e:
                    print(f"Failed to update stats for {p_id}: {e}")
        # ----------------------------------

        await self.broadcast_to_room(room_id, {
            "type": "GAME_OVER",
            "winner_id": winner_id,
            "reason": reason,
            "final_stats": final_stats
        })
        
    

    async def handle_rematch(self, room_id: str, user_id: str):
        # Add to ready set
        if room_id not in self.ready_players:
            self.ready_players[room_id] = set()
        
        self.ready_players[room_id].add(user_id)
        
        # Notify the OTHER player that someone wants a rematch
        await self.broadcast_to_room(room_id, {
            "type": "REMATCH_REQUESTED",
            "user_id": user_id
        })
        
        
        await self.set_ready(room_id, user_id)

    async def broadcast_to_room(self, room_id: str, message: dict):
        if room_id in self.active_rooms:
            for connection in self.active_rooms[room_id].values():
                await connection.send_text(json.dumps(message))

manager = ConnectionManager()