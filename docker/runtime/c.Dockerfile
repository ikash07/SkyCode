FROM gcc:14-bookworm

RUN useradd -m -u 1000 runner
USER runner
WORKDIR /workspace
