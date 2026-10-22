# Image tool for the blog: libvips command-line programs from Debian's signed apt archive. No npm involved.
# The base image is pinned by digest; rebuild with: scripts/photo.sh --build
FROM debian@sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8
RUN apt-get update \
 && apt-get install -y --no-install-recommends libvips-tools \
 && rm -rf /var/lib/apt/lists/*
