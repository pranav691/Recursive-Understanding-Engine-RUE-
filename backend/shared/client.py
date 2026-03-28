import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_API_KEY"),
)

MAIN_MODEL = "meta/llama-3.3-70b-instruct"
FAST_MODEL = "meta/llama-3.1-8b-instruct"
