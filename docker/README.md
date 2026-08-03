# Docker Assets

This folder contains the runtime images and deployment notes for the online IDE.

## Runtime images

- `runtime/python.Dockerfile`: Python execution image with non-root user and pip cache support
- `runtime/c.Dockerfile`: GCC execution image with common Linux development libraries
- `runtime/java.Dockerfile`: OpenJDK execution image with Maven and Gradle

## App images

- `backend.Dockerfile`: Production backend container
- `frontend.Dockerfile`: Production frontend container

## Runtime requirement

- The backend container needs access to the host Docker socket at `/var/run/docker.sock` so it can spawn isolated execution containers.
