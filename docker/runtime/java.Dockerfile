FROM eclipse-temurin:21-jdk

RUN apt-get update && apt-get install -y --no-install-recommends maven gradle && rm -rf /var/lib/apt/lists/* && useradd -m -u 1000 runner
USER runner
WORKDIR /workspace
ENV HOME=/home/runner
