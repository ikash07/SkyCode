FROM python:3.12-slim

RUN useradd -m -u 1000 runner && mkdir -p /home/runner/.local /home/runner/.cache/pip && chown -R runner:runner /home/runner
USER runner
WORKDIR /workspace
ENV HOME=/home/runner
ENV PYTHONUSERBASE=/home/runner/.local
ENV PIP_CACHE_DIR=/home/runner/.cache/pip
