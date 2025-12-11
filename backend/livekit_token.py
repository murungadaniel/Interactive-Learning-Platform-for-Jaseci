from livekit import api
import os

def create_livekit_token(identity: str, room_name: str = "classroom"):
    api_key = os.environ.get("LIVEKIT_API_KEY")
    api_secret = os.environ.get("LIVEKIT_API_SECRET")

    if not api_key or not api_secret:
        raise Exception("LiveKit API keys not configured")

    at = api.AccessToken(api_key, api_secret)
    grant = api.VideoGrant(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
    )
    at.add_grant(grant)

    return at.to_jwt()
