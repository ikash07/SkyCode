FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Install system runtime dependencies: Python3, pip, audio/portaudio, gcc, g++, openjdk
RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    portaudio19-dev \
    libasound2-dev \
    ffmpeg \
    gcc \
    g++ \
    default-jdk-headless \
    tar \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Pre-install standard Python libraries so they exist in the image out-of-the-box
RUN pip3 install --break-system-packages --no-cache-dir \
    SpeechRecognition \
    python-dotenv \
    edge-tts \
    requests \
    google-genai \
    google-generativeai \
    openai \
    playsound \
    soundfile \
    gTTS \
    numpy \
    pandas \
    scipy \
    matplotlib \
    seaborn \
    scikit-learn \
    beautifulsoup4 \
    lxml \
    flask \
    fastapi \
    uvicorn \
    pillow \
    pydub \
    colorama \
    tqdm \
    rich \
    aiohttp \
    httpx \
    PyYAML \
    sympy \
    || true

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 4000
CMD ["node", "src/index.js"]
