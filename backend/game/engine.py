import asyncio
import random

async def spawn_bot(manager, room_id: str, target_wpm: int, paragraph: str):
    """
    Simulates a player typing by broadcasting progress at intervals.
    """
    # Wait 4 seconds (3s countdown + 1s buffer for frontend sync)
    await asyncio.sleep(4)
    
    total_chars = len(paragraph)
    # WPM to Delay: (60 seconds / (WPM * 5 characters per word))
    # At 60 WPM, this is 0.2s per character.
    delay_per_char = 60.0 / (target_wpm * 5)
    bot_id = "bot_user"

    current_idx = 0
    while current_idx < total_chars:
        # Stop if the room was deleted (player left)
        if room_id not in manager.active_rooms:
            break
            
        current_idx += 1

        # 1. Update the SERVER state so it knows who is actually ahead
        await manager.update_progress(
            room_id, 
            bot_id, 
            current_idx, 
            target_wpm, 
            100
        )
        
        # Broadcast the bot's progress as if it's a real user
        await manager.broadcast_to_room(room_id, {
            "type": "opponent_progress",
            "user_id": bot_id,
            "charIndex": current_idx,
            "wpm": target_wpm,
            "accuracy": 100
        })

        # Add 20% randomness to the speed so it looks human
        actual_delay = delay_per_char * random.uniform(0.8, 1.2)
        await asyncio.sleep(actual_delay)